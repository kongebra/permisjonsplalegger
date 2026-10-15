/**
 * Genererer CHANGELOG.md fra git-historikken.
 *
 * Bruk:
 *   bun run changelog             - skriv CHANGELOG.md
 *   bun run changelog -- --check  - avslutt med kode 1 hvis CHANGELOG.md er utdatert
 *   bun run changelog -- --stdout - skriv resultatet til stdout uten å røre filen
 *
 * Filen bygges alltid helt på nytt av to kilder:
 *   1. Git-historikken etter CUTOFF_COMMIT (ett `## ÅÅÅÅ-MM-DD`-avsnitt per dag).
 *   2. scripts/changelog-historikk.md, den håndskrevne historikken som lå i
 *      CHANGELOG.md før verktøyet ble tatt i bruk. Den limes inn uendret nederst.
 *
 * Resultatet er deterministisk: samme historikk gir samme fil.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGELOG_PATH = join(ROOT, "CHANGELOG.md");
const HISTORY_PATH = join(ROOT, "scripts", "changelog-historikk.md");

// Siste commit som er dekket av den håndskrevne historikken (merge av PR #3).
// Kun commits som ikke er forfedre til denne tas med i den genererte delen.
// Dette hindrer at det som allerede er beskrevet for hånd blir listet to ganger.
const CUTOFF_COMMIT = "d900a873448b81ce424dde77cb5b647a794d1fee";

// Rekkefølgen her er rekkefølgen på ###-seksjonene under hver dato.
// Typer som ikke står her (docs, test, chore, ci, build, style) hoppes over.
const SECTIONS = ["Nytt", "Rettet", "Opprydding"] as const;
type Section = (typeof SECTIONS)[number];

const TYPE_TO_SECTION: Record<string, Section> = {
  feat: "Nytt",
  fix: "Rettet",
  refactor: "Opprydding",
  perf: "Opprydding",
};

const HEADER = [
  "# Changelog",
  "",
  "<!-- Generert av `bun run changelog` (scripts/changelog.ts). Ikke rediger for hånd. -->",
].join("\n");

const HISTORY_NOTE =
  "<!-- Håndskrevet historikk fra før verktøyet. Kilde: scripts/changelog-historikk.md -->";

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
}

function assertCutoffExists(): void {
  try {
    git("cat-file", "-e", `${CUTOFF_COMMIT}^{commit}`);
  } catch {
    throw new Error(
      `Fant ikke commit ${CUTOFF_COMMIT}. Er klonen grunn (shallow)? Kjør \`git fetch --unshallow\`.`,
    );
  }
}

type Entry = { date: string; section: Section; text: string };

// Gjør om en commit-tittel til en linje i endringsloggen.
// Returnerer null for typer som ikke skal med.
function parseSubject(
  subject: string,
): { section: Section; text: string } | null {
  const match = /^([a-z]+)(?:\([^)]*\))?!?:\s+(.+)$/.exec(subject.trim());
  if (!match) return null;
  const section = TYPE_TO_SECTION[match[1]];
  if (!section) return null;
  // Vanlig bindestrek i stedet for tankestrek.
  const text = match[2].replace(/\s[–—]\s/g, " - ").trim();
  return { section, text: text.charAt(0).toUpperCase() + text.slice(1) };
}

function readEntries(): Entry[] {
  // %as = forfatterdato (ÅÅÅÅ-MM-DD) i forfatterens tidssone, uavhengig av maskinens.
  const out = git(
    "log",
    "--no-merges",
    "--reverse",
    "--format=%as%x1f%s%x1e",
    `${CUTOFF_COMMIT}..HEAD`,
  );
  const entries: Entry[] = [];
  for (const record of out.split("\x1e")) {
    const [date, subject] = record.trim().split("\x1f");
    if (!date || !subject) continue;
    const parsed = parseSubject(subject);
    if (parsed) entries.push({ date, ...parsed });
  }
  return entries;
}

function renderGenerated(entries: Entry[]): string {
  const byDate = new Map<string, Map<Section, string[]>>();
  for (const { date, section, text } of entries) {
    const sections = byDate.get(date) ?? new Map<Section, string[]>();
    const lines = sections.get(section) ?? [];
    if (!lines.includes(text)) lines.push(text);
    sections.set(section, lines);
    byDate.set(date, sections);
  }

  const blocks: string[] = [];
  // Nyeste dato først.
  for (const date of [...byDate.keys()].sort().reverse()) {
    const sections = byDate.get(date)!;
    const parts = [`## ${date}`];
    for (const section of SECTIONS) {
      const lines = sections.get(section);
      if (!lines) continue;
      parts.push(`### ${section}`, lines.map((line) => `- ${line}`).join("\n"));
    }
    blocks.push(parts.join("\n\n"));
  }
  return blocks.join("\n\n");
}

function buildChangelog(): string {
  assertCutoffExists();
  const generated = renderGenerated(readEntries());
  const history = readFileSync(HISTORY_PATH, "utf8").trim();
  return (
    [HEADER, generated, HISTORY_NOTE, history]
      .filter((part) => part.length > 0)
      .join("\n\n") + "\n"
  );
}

function main(): void {
  const args = process.argv.slice(2);
  const next = buildChangelog();

  if (args.includes("--stdout")) {
    process.stdout.write(next);
    return;
  }

  if (args.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(CHANGELOG_PATH, "utf8");
    } catch {
      // Manglende fil regnes som utdatert.
    }
    if (current !== next) {
      console.error("CHANGELOG.md er utdatert. Kjør `bun run changelog`.");
      process.exit(1);
    }
    console.log("CHANGELOG.md er oppdatert.");
    return;
  }

  writeFileSync(CHANGELOG_PATH, next);
  console.log("Skrev CHANGELOG.md.");
}

main();

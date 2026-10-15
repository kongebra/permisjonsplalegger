# Permisjonsplanlegger

En permisjonsplanlegger med interaktiv kalender, ikke bare en kalkulator.
Brukeren legger opp løpet med permisjon, ferie og jobb.
Appen viser "gapet" mellom permisjonsslutt og barnehagestart, og beregner behovet for ferie eller ulønnet permisjon.
Appen finner den økonomisk beste dekningsgraden (80 % eller 100 %) for brukerens plan.

Stack: Next.js 16 (App Router), React 19, Zustand, `date-fns` v4, Tailwind 4, bun.

## Kommandoer

- `bun run dev` - utviklingsserver.
- `bun run lint` - ESLint, inkludert `jsx-a11y` på recommended-nivå.
- `bun run test` - enhetstester med `bun test` (beregningene i `src/lib/calculator/`).
- `bun run build` - produksjonsbygg.
- `bun run test:e2e` - Playwright-tester i `e2e/`.
- `bun run test:a11y` - kun UU-testene i `e2e/` (axe-core).

## Struktur

- `src/app/` - ruter, `src/components/` - UI gruppert etter område.
- `src/store/` - Zustand-store, delt i slices under `src/store/slices/`.
- `src/lib/calculator/` - kjernelogikk for datoer og økonomi, med tester.
- `src/lib/constants.ts` - faste verdier som G og permisjonskvoter.
- `docs/nav/` - NAVs regelverk som appen bygger på; les relevant fil før du endrer NAV-logikk.
- `docs/UU-SJEKKLISTE.md` - UU-status og sjekkliste.
- `docs/KRAVSPEC.md` - krav, beregningsregler og akseptansekrav.
- `docs/BACKLOG.md` - arbeid som ikke er gjort ennå.

## Regler

- Datoer: internt er sluttdatoer eksklusive (dagen etter siste dag).
  I UI er sluttdatoer inklusive (den faktiske siste dagen).
- Bruk alltid `date-fns` v4 for datologikk.
- All beregning av økonomi og datoer skal skje i `src/lib/calculator/`.
- All plan-logikk og plan-data skal ligge i Zustand-storen i `src/store/`.
- Faste verdier (G, maks beregningsgrunnlag, kvoter) skal ligge i `src/lib/constants.ts` og importeres derfra.
- Vi følger NAVs regelverk (5-dagers uker) så langt det lar seg gjøre, men vi er et uavhengig verktøy.
- Barnehagestart følger `docs/nav/barnehagerett.md`: barn født i september-november kan starte tidligere, barn født i desember venter til neste august-opptak.
- UI skal tydelig opplyse om at vi ikke samarbeider med NAV, og at beregningene er veiledende.
- UU: hold høy standard og oppfyll alle relevante WCAG-krav.
- Språk: kommentarer skrives på norsk, variabler og annen kode på engelsk.

## Arbeidsflyt

- Hoved-branchen er `main`.
- All ny funksjonalitet og feilretting skal gjøres via pull request, slik at GitHub Copilot får gjort review.
- PR-beskrivelsen skal avsluttes med en folkelig, ikke-teknisk oppsummering av endringen.
- `CHANGELOG.md` genereres med `bun run changelog` og skal aldri redigeres for hånd.
  Bruk konvensjonelle commit-titler (`feat:`, `fix:`, `refactor:`) med en kort tittel som en forelder forstår, for det er teksten som havner i changelogen.
  `bun run changelog -- --check` feiler når filen er utdatert.

## Før du er ferdig

1. `bun run lint` passerer.
2. Beregninger bruker funksjonene i `src/lib/calculator/`.
3. Logikken stemmer med `docs/nav/*.md`.
4. Justeringer i kalenderen fungerer sømløst, og "gapet" oppdateres riktig når brukeren legger til ferie eller flytter perioder.
5. Disclaimer om NAV og veiledende beregninger er fortsatt synlig i UI.
6. `bun run changelog` er kjørt, og PR-beskrivelsen har en ikke-teknisk oppsummering nederst.

## Agent skills

### Issue tracker

Issues og spesifikasjoner ligger som GitHub-issues i `kongebra/permisjonsplalegger` (bruk `gh`).
Se `docs/agents/issue-tracker.md`.

### Triage labels

Standard triage-vokabular: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
Se `docs/agents/triage-labels.md`.

### Domain docs

Single-context: én `GLOSSARY.md` og `docs/adr/` i rot.
Se `docs/agents/domain.md`.

# Site-navigasjon implementasjonsplan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Legg til en `SiteHeader`-komponent på info-sidene (`/`, `/om`, `/personvern`) så brukere alltid kan navigere hjem — uten å røre planleggeren.

**Architecture:** Én ny komponent (`SiteHeader`) med valgfri CTA-knapp via `showCta`-prop, importert direkte i de tre info-sidene. Ingen endringer i root layout, ingen route groups. Planleggeren (`/planlegger`, `/planlegger/kalender`) er uberørt. `SiteFooter` får oppdatert copyright-tekst.

**Tech Stack:** Next.js 15, Tailwind CSS, `lucide-react` (valgfritt), `next/link`. Kommando for å kjøre: `bun run dev`. Bygg: `bun run build`.

**Viktige funn fra kodelesing:**
- `src/components/SiteFooter.tsx` har copyright "Permisjonsøkonomi-kalkulator" — må oppdateres
- `/om` og `/personvern` har `<Link href="/planlegger">← Tilbake til kalkulatoren</Link>` — skal endres til `href="/"`
- `src/app/page.tsx` trenger header uten CTA (har allerede stor CTA-knapp i hero)
- `/om` og `/personvern` trenger header med CTA ("Til planleggeren →")

---

## Task 1: Opprett SiteHeader-komponent

**Files:**
- Create: `src/components/SiteHeader.tsx`

**Step 1: Opprett filen**

```tsx
import Link from 'next/link';

interface SiteHeaderProps {
  showCta?: boolean;
}

export function SiteHeader({ showCta = false }: SiteHeaderProps) {
  return (
    <header className="border-b py-3 px-4">
      <div className="container mx-auto max-w-2xl flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold hover:text-primary transition-colors"
        >
          Permisjonsplanleggeren
        </Link>
        {showCta && (
          <Link
            href="/planlegger"
            className="text-sm text-primary hover:underline"
          >
            Til planleggeren →
          </Link>
        )}
      </div>
    </header>
  );
}
```

**Step 2: Kjør build for å verifisere**

```bash
bun run build
```

Forventet: Bygger uten feil.

**Step 3: Commit**

```bash
git add src/components/SiteHeader.tsx
git commit -m "feat: legg til SiteHeader-komponent for info-sider"
```

---

## Task 2: Legg til SiteHeader på landingssiden

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Les filen**

Les `src/app/page.tsx` for å se gjeldende struktur.

**Step 2: Importer og legg til SiteHeader**

Legg til import øverst:
```tsx
import { SiteHeader } from '@/components/SiteHeader';
```

Endre `return`-blokken til:
```tsx
return (
  <>
    <SiteHeader />
    <main id="main" className="container mx-auto px-4 py-12 max-w-2xl">
      {/* resten uendret */}
    </main>
  </>
);
```

**Step 3: Kjør build**

```bash
bun run build
```

Forventet: Bygger uten feil.

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: legg til SiteHeader på landingssiden"
```

---

## Task 3: Oppdater /om med SiteHeader og ny back-lenke

**Files:**
- Modify: `src/app/om/page.tsx`

**Step 1: Les filen**

Les `src/app/om/page.tsx`. Back-lenken nederst peker på `/planlegger` — skal endres til `/`.

**Step 2: Importer SiteHeader**

Legg til import øverst i filen:
```tsx
import { SiteHeader } from '@/components/SiteHeader';
```

**Step 3: Legg til header og oppdater back-lenke**

Endre `return`-blokken:

```tsx
return (
  <>
    <SiteHeader showCta />
    <div className="bg-background">
      <main id="main" className="container mx-auto max-w-2xl px-4 py-8">
        {/* alt eksisterende innhold beholdes */}

        <div className="mt-8">
          <Link href="/" className="text-primary underline text-sm">
            &larr; Forsiden
          </Link>
        </div>
      </main>
    </div>
  </>
);
```

**Step 4: Kjør build**

```bash
bun run build
```

Forventet: Bygger uten feil.

**Step 5: Commit**

```bash
git add src/app/om/page.tsx
git commit -m "feat: legg til SiteHeader og fiks back-lenke på /om"
```

---

## Task 4: Oppdater /personvern med SiteHeader og ny back-lenke

**Files:**
- Modify: `src/app/personvern/page.tsx`

**Step 1: Les filen**

Les `src/app/personvern/page.tsx`. Back-lenken peker på `/planlegger` — skal endres til `/`.

**Step 2: Importer SiteHeader**

```tsx
import { SiteHeader } from '@/components/SiteHeader';
```

**Step 3: Legg til header og oppdater back-lenke**

Samme mønster som `/om`:

```tsx
return (
  <>
    <SiteHeader showCta />
    <div className="bg-background">
      <main id="main" className="container mx-auto max-w-2xl px-4 py-8">
        {/* alt eksisterende innhold beholdes */}

        <div className="mt-8">
          <Link href="/" className="text-primary underline text-sm">
            &larr; Forsiden
          </Link>
        </div>
      </main>
    </div>
  </>
);
```

**Step 4: Kjør build**

```bash
bun run build
```

Forventet: Bygger uten feil.

**Step 5: Commit**

```bash
git add src/app/personvern/page.tsx
git commit -m "feat: legg til SiteHeader og fiks back-lenke på /personvern"
```

---

## Task 5: Oppdater SiteFooter og CHANGELOG

**Files:**
- Modify: `src/components/SiteFooter.tsx`
- Modify: `CHANGELOG.md`

**Step 1: Les SiteFooter**

Les `src/components/SiteFooter.tsx`. Copyright-teksten sier "Permisjonsøkonomi-kalkulator".

**Step 2: Oppdater copyright-tekst**

Endre:
```tsx
<p>&copy; {new Date().getFullYear()} Permisjonsøkonomi-kalkulator</p>
```
Til:
```tsx
<p>&copy; {new Date().getFullYear()} Permisjonsplanleggeren</p>
```

**Step 3: Oppdater CHANGELOG**

Legg til under `## 2026-02-26` (opprett heading hvis den ikke finnes):

```markdown
## 2026-02-26

### Navigasjon på info-sider
Landingssiden, "Om oss" og personvernsiden har nå en tydelig header som tar deg tilbake til forsiden. Tilbake-lenkene på disse sidene peker nå riktig til forsiden i stedet for inn i planleggeren.
```

**Step 4: Kjør build og tester**

```bash
bun test && bun run build
```

Forventet: 97+ tester passerer, bygget fullføres uten feil.

**Step 5: Commit**

```bash
git add src/components/SiteFooter.tsx CHANGELOG.md
git commit -m "feat: oppdater footer-navn og CHANGELOG for navigasjon"
```

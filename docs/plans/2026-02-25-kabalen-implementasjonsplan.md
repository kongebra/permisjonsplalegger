# Kabalen-redesign implementasjonsplan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reframe appen fra "80/100-kalkulator" til "Permisjonsplanleggeren" — med riktig identitet, persistent kalenderoversikt og månedlig økonomisammenligning.

**Architecture:** Tre faser som hver er leverbar alene. Fase 1 er rene tekst- og metadataendringer. Fase 2 er ny UI-komponent i kalenderen. Fase 3 forbedrer eksisterende MonthlyIncomeOverview med differanse og fargeindikator.

**Tech Stack:** Next.js 15, Zustand, PostHog (allerede integrert), Tailwind CSS, date-fns v4. Kommando for å kjøre: `bun run dev`. Bygg: `bun run build`. Tester: `bun test`.

**Viktige funn fra kodelesing:**
- `src/app/page.tsx` har `robots: { index: false }` og redirecter til `/planlegger` — må erstattes med ekte landingsside
- `WelcomeIntro.tsx` finnes, sier allerede "permisjonsplanleggeren" men tredje kort sier fortsatt "Sammenlign 80% og 100%"
- `MonthlyIncomeOverview.tsx` eksisterer og beregner månedlig inntekt — mangler fargeindikator og vs-normal per rad
- `MiniMonth.tsx` eksisterer med fulle fargedots — klar til gjenbruk
- `StatsBar.tsx` viser kun gap-status, ikke nøkkeltall-strip

---

## FASE 1 — Identitet & SEO

### Task 1: Oppdater SEO-metadata i layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Les filen**

Les `src/app/layout.tsx` for å se gjeldende metadata. Identifiser `title.default`, `description`, `keywords`, og `dateModified` i JSON-LD.

**Step 2: Oppdater metadataen**

Endre følgende felter i `export const metadata`:

```typescript
title: {
  default: "Permisjonsplanleggeren",
  template: "%s | Permisjonsplanleggeren",
},
description:
  "Gratis verktøy for å planlegge foreldrepermisjon. Se om permisjonen rekker til barnehagestart, finn ut familiens månedlige økonomi under permisjon, og velg mellom 80% og 100% basert på hva som faktisk passer dere.",
keywords: [
  "foreldrepermisjon",
  "permisjonsplanlegging",
  "barnehagestart og foreldrepermisjon",
  "80% vs 100% foreldrepermisjon",
  "burde jeg velge 80 eller 100 prosent",
  "økonomi foreldrepermisjon",
  "NAV foreldrepenger",
  "permisjon kalkulator",
  "permisjon barnehage gap",
  "familieøkonomi permisjon",
],
```

Oppdater også OpenGraph og Twitter title/description til å matche. I JSON-LD, endre:
- `name`: `"Permisjonsplanleggeren"`
- `description`: samme som over
- `dateModified`: `"2026-02-25"`

**Step 3: Kjør build for å verifisere**

```bash
bun run build
```
Forventet: Bygger uten feil.

**Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: ny identitet og SEO-metadata — Permisjonsplanleggeren"
```

---

### Task 2: Erstatt redirect med ekte landingsside på `/`

**Files:**
- Modify: `src/app/page.tsx` (erstatter innholdet helt)

**Step 1: Forstå hva som finnes**

Les `src/app/page.tsx`. I dag er det bare `permanentRedirect('/planlegger')` med `robots: { index: false }`.

**Step 2: Skriv ny landingsside**

Erstatt hele filen med følgende (behold Next.js `Metadata`-eksport):

```typescript
import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle, Clock, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Permisjonsplanleggeren — få kabalen til å gå opp',
  description:
    'Gratis verktøy som hjelper deg planlegge foreldrepermisjonen. Se om permisjonen rekker til barnehagestart, forstå familiens økonomi måned for måned, og finn ut om 80% eller 100% passer best.',
};

const benefits = [
  {
    icon: CheckCircle,
    heading: 'Rekker permisjonen til barnehagestart?',
    body: 'Se gapet mellom permisjonsslutt og barnehagestart — og planlegg ferie eller ulønnet for å tette det.',
  },
  {
    icon: CheckCircle,
    heading: 'Hva har familien i inntekt under permisjon?',
    body: 'Se månedlig inntekt for mor og far under hele permisjonsperioden — ikke bare et totaltall.',
  },
  {
    icon: CheckCircle,
    heading: 'Burde vi velge 80% eller 100%?',
    body: '80% gir 10 uker lengre permisjon, 100% gir høyere månedlig utbetaling. Vi viser hva som faktisk lønner seg for dere.',
  },
];

export default function Home() {
  return (
    <main id="main" className="container mx-auto px-4 py-12 max-w-2xl">
      {/* Hero */}
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">
          Få kabalen til å gå opp
        </h1>
        <p className="text-xl text-muted-foreground">
          Planlegg foreldrepermisjonen — permisjon, barnehage og økonomi samlet på ett sted.
        </p>
        <Link
          href="/planlegger"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-8 py-3 text-base font-semibold hover:bg-primary/90 transition-colors mt-2"
        >
          Start planleggingen — gratis
        </Link>
        <p className="text-sm text-muted-foreground">
          Ingen innlogging. Ingen konto. Tar ca 5 minutter.
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-6 mb-12">
        {benefits.map((b) => (
          <div key={b.heading} className="flex gap-4">
            <b.icon className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-lg mb-1">{b.heading}</h2>
              <p className="text-muted-foreground">{b.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Trust signals */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm text-muted-foreground border-t pt-8">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 shrink-0" />
          <span>Ingen data sendes til server — alt lagres lokalt</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          <span>Ikke tilknyttet NAV — beregningene er veiledende</span>
        </div>
      </div>
    </main>
  );
}
```

**Step 3: Kjør dev og åpne `localhost:3000` i nettleser**

```bash
bun run dev
```

Verifiser at:
- `/` viser landingssiden (ikke redirect til `/planlegger`)
- "Start planleggingen" lenker til `/planlegger`
- Ingen `robots: noindex` (sjekk kildekoden)

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: legg til ekte landingsside på / for SEO og deling"
```

---

### Task 3: Oppdater WelcomeIntro med kabal-framing

**Files:**
- Modify: `src/components/wizard/WelcomeIntro.tsx`

**Step 1: Les filen**

Les `src/components/wizard/WelcomeIntro.tsx`. Tredje kort sier "Se hva familien faktisk får" / "Sammenlign 80% og 100% dekning" — dette er feil fokus.

**Step 2: Oppdater kortet**

Endre tredje `Card` sin overskrift og tekst:

Fra:
```tsx
<h3 className="font-semibold">Se hva familien faktisk får</h3>
<p className="text-sm text-muted-foreground">
  Sammenlign 80% og 100% dekning og finn ut hva som lønner seg.
</p>
```

Til:
```tsx
<h3 className="font-semibold">Finn ut hva som passer dere</h3>
<p className="text-sm text-muted-foreground">
  Se om kabalen går opp — permisjon, barnehagestart og økonomi — og få en anbefaling på 80% eller 100%.
</p>
```

Endre også ikonet fra `Calculator` til `CalendarDays` (importer fra lucide-react).

**Step 3: Kjør dev og verifiser visuelt**

```bash
bun run dev
```

Åpne `/planlegger` og bekreft at introkortet vises riktig på mobil (375px).

**Step 4: Commit**

```bash
git add src/components/wizard/WelcomeIntro.tsx
git commit -m "feat: oppdater wizard-intro til kabal-framing"
```

---

## FASE 2 — Kalender & oversikt

### Task 4: Ny LeaveHorizonBanner-komponent

**Files:**
- Create: `src/components/planner/LeaveHorizonBanner.tsx`
- Modify: `src/components/planner/PlannerCalendar.tsx`

**Step 1: Forstå hvilke data som trengs**

Fra `useCalculatedLeave()` og `useWizard()` får vi:
- `leaveResult.mother.start` — permisjonsstart
- `leaveResult.father.end` — permisjonsslutt (siste forelders slutt)
- `leaveResult.gap.days` — gap i dager
- `leaveResult.gap.end` — gap slutt = barnehagestart
- `daycareStartDate`, `daycareEnabled`
- `activeMonth` — hvilken måned brukeren ser på nå

**Step 2: Opprett komponenten**

Opprett `src/components/planner/LeaveHorizonBanner.tsx`:

```typescript
'use client';

import { useMemo } from 'react';
import { differenceInDays, format, addDays, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { LeaveResult } from '@/lib/types';

interface LeaveHorizonBannerProps {
  leaveResult: LeaveResult;
  activeMonth: Date;
  daycareEnabled: boolean;
  daycareDate: Date | null;
}

export function LeaveHorizonBanner({
  leaveResult,
  activeMonth,
  daycareEnabled,
  daycareDate,
}: LeaveHorizonBannerProps) {
  const leaveStart = leaveResult.mother.start;
  const leaveEnd = leaveResult.father.end;
  const gapEnd = daycareEnabled && daycareDate ? daycareDate : leaveEnd;

  const { leavePercent, gapPercent, currentPercent } = useMemo(() => {
    const totalDays = Math.max(1, differenceInDays(gapEnd, leaveStart));
    const leaveDays = differenceInDays(leaveEnd, leaveStart);
    const gapDays = differenceInDays(gapEnd, leaveEnd);

    // Current month marker position: start of active month
    const activeStart = startOfMonth(activeMonth);
    const currentDays = Math.max(0, Math.min(totalDays, differenceInDays(activeStart, leaveStart)));

    return {
      leavePercent: Math.max(0, Math.min(100, (leaveDays / totalDays) * 100)),
      gapPercent: Math.max(0, Math.min(100, (gapDays / totalDays) * 100)),
      currentPercent: Math.max(0, Math.min(100, (currentDays / totalDays) * 100)),
    };
  }, [leaveStart, leaveEnd, gapEnd, activeMonth]);

  const gapWeeksLeft = useMemo(() => {
    const today = new Date();
    if (!daycareEnabled || !daycareDate) return null;
    const remainingGapDays = Math.max(0, differenceInDays(daycareDate, leaveEnd));
    return Math.ceil(remainingGapDays / 7);
  }, [daycareEnabled, daycareDate, leaveEnd]);

  const weeksLeft = useMemo(() => {
    const today = new Date();
    const remaining = Math.max(0, differenceInDays(leaveEnd, today));
    return Math.ceil(remaining / 7);
  }, [leaveEnd]);

  return (
    <div className="space-y-2 pb-2 border-b">
      {/* Tidslinje */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted flex">
        {/* Permisjonsblokk */}
        <div
          className="h-full bg-mother-base"
          style={{ width: `${leavePercent}%` }}
        />
        {/* Gapblokk */}
        {gapPercent > 0 && (
          <div
            className="h-full bg-gap border border-dashed border-gap-border"
            style={{ width: `${gapPercent}%` }}
          />
        )}
        {/* "Du er her"-markør */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/60"
          style={{ left: `${currentPercent}%` }}
          title={format(activeMonth, 'MMMM yyyy', { locale: nb })}
        />
      </div>

      {/* Nøkkeltall */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {format(leaveStart, 'd. MMM yyyy', { locale: nb })}
        </span>
        <div className="flex gap-4">
          {weeksLeft > 0 && (
            <span>
              <span className="font-medium text-foreground">{weeksLeft} uker</span> igjen av perm
            </span>
          )}
          {daycareEnabled && daycareDate && gapWeeksLeft !== null && gapWeeksLeft > 0 && (
            <span className={cn('font-medium', gapWeeksLeft > 0 ? 'text-warning-fg' : 'text-success-fg')}>
              {gapWeeksLeft} uker gap
            </span>
          )}
          {daycareEnabled && daycareDate && (
            <span>
              Bhg: <span className="font-medium text-foreground">{format(daycareDate, 'd. MMM', { locale: nb })}</span>
            </span>
          )}
        </div>
        <span>
          {format(gapEnd, 'd. MMM yyyy', { locale: nb })}
        </span>
      </div>
    </div>
  );
}
```

**Step 3: Legg til banneret i PlannerCalendar**

Åpne `src/components/planner/PlannerCalendar.tsx`. Importer `LeaveHorizonBanner` og legg den til øverst i return-JSX, over navigasjonsheaderen:

```typescript
import { LeaveHorizonBanner } from './LeaveHorizonBanner';
```

I `return`-blokken, legg til som første element inni `<div className="space-y-4">`:

```tsx
<LeaveHorizonBanner
  leaveResult={leaveResult}
  activeMonth={activeMonth}
  daycareEnabled={daycareEnabled}
  daycareDate={daycareEnabled ? daycareStartDate ?? null : null}
/>
```

**Step 4: Kjør dev og verifiser på mobil-bredde (375px)**

```bash
bun run dev
```

Sjekk at:
- Tidslinjen vises øverst i kalenderen
- Markøren ("du er her") beveger seg når du navigerer måneder
- Gap vises med stiplet kant og riktig farge
- Nøkkeltallene er lesbare på 375px

**Step 5: Kjør build**

```bash
bun run build
```

**Step 6: Commit**

```bash
git add src/components/planner/LeaveHorizonBanner.tsx src/components/planner/PlannerCalendar.tsx
git commit -m "feat: legg til persistent permisjonshorisont-banner i kalender"
```

---

### Task 5: A/B-test for mini-måneder via PostHog feature flag

**Files:**
- Create: `src/components/planner/MiniMonthStrip.tsx`
- Modify: `src/components/planner/PlannerCalendar.tsx`

**Step 1: Forstå PostHog feature flags**

PostHog er allerede installert (`posthog-js`). For å sjekke en feature flag bruk:
```typescript
import posthog from 'posthog-js';
const isEnabled = posthog.isFeatureEnabled('calendar-mini-months');
```

Dette returnerer `true`/`false`/`undefined`. Wrap i en `useState` + `useEffect` for SSR-sikker bruk.

**Step 2: Opprett MiniMonthStrip**

Opprett `src/components/planner/MiniMonthStrip.tsx`. Den viser tre `MiniMonth`-komponenter (forrige | nåværende | neste) i en horisontal strip, der nåværende er litt større:

```typescript
'use client';

import { addMonths, subMonths } from 'date-fns';
import { MiniMonth } from './MiniMonth';
import type { LeaveSegment, CustomPeriod } from '@/lib/types';

interface MiniMonthStripProps {
  activeMonth: Date;
  segments: LeaveSegment[];
  customPeriods: CustomPeriod[];
  dueDate: Date;
  daycareStart?: Date;
  onMonthSelect: (month: Date) => void;
}

export function MiniMonthStrip({
  activeMonth,
  segments,
  customPeriods,
  dueDate,
  daycareStart,
  onMonthSelect,
}: MiniMonthStripProps) {
  const prevMonth = subMonths(activeMonth, 1);
  const nextMonth = addMonths(activeMonth, 1);

  return (
    <div className="grid grid-cols-3 gap-1">
      <div className="opacity-60 scale-95 origin-left">
        <MiniMonth
          month={prevMonth}
          dueDate={dueDate}
          daycareStart={daycareStart}
          segments={segments}
          customPeriods={customPeriods}
          isActive={false}
          onClick={() => onMonthSelect(prevMonth)}
        />
      </div>
      <MiniMonth
        month={activeMonth}
        dueDate={dueDate}
        daycareStart={daycareStart}
        segments={segments}
        customPeriods={customPeriods}
        isActive={true}
        onClick={() => {}}
      />
      <div className="opacity-60 scale-95 origin-right">
        <MiniMonth
          month={nextMonth}
          dueDate={dueDate}
          daycareStart={daycareStart}
          segments={segments}
          customPeriods={customPeriods}
          isActive={false}
          onClick={() => onMonthSelect(nextMonth)}
        />
      </div>
    </div>
  );
}
```

**Step 3: Integrer i PlannerCalendar med feature flag**

Legg til i `PlannerCalendar.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { MiniMonthStrip } from './MiniMonthStrip';
import posthog from 'posthog-js';

// Inni komponenten, etter andre state-deklarasjoner:
const [showMiniMonths, setShowMiniMonths] = useState(false);

useEffect(() => {
  // PostHog feature flags er tilgjengelige etter at PostHog er initialisert
  const check = () => {
    setShowMiniMonths(posthog.isFeatureEnabled('calendar-mini-months') === true);
  };
  check();
  // Lytt på feature flag endringer (PostHog kan laste dem async)
  posthog.onFeatureFlags(check);
}, []);
```

I return-JSX, legg til `MiniMonthStrip` under `LeaveHorizonBanner` og over navigasjonsheaderen:

```tsx
{showMiniMonths && (
  <MiniMonthStrip
    activeMonth={activeMonth}
    segments={leaveResult.segments}
    customPeriods={periods}
    dueDate={dueDate}
    daycareStart={daycareEnabled ? daycareStartDate ?? undefined : undefined}
    onMonthSelect={setActiveMonthWithDirection}
  />
)}
```

**Step 4: Test på mobil (375px)**

Aktiver feature flaggen lokalt ved å åpne PostHog toolbar eller sett `localStorage.setItem('calendar-mini-months', 'true')` manuelt for test.

Sjekk at:
- Strip vises ved enabled flag
- Trykk på forrige/neste mini-måned navigerer kalenderen
- Synker med swipe-navigasjon

**Step 5: Commit**

```bash
git add src/components/planner/MiniMonthStrip.tsx src/components/planner/PlannerCalendar.tsx
git commit -m "feat: legg til A/B-test for mini-måneder via PostHog feature flag calendar-mini-months"
```

---

## FASE 3 — Månedlig økonomi

### Task 6: Forbedre MonthlyIncomeOverview med differanse og budsjettindikator

**Files:**
- Modify: `src/components/planner/MonthlyIncomeOverview.tsx`
- Modify: `src/components/planner/SettingsSheet.tsx` (legg til budsjettgrense-felt)
- Modify: `src/store/slices/wizardSlice.ts` (legg til `monthlyBudgetLimit` i state)

**Step 1: Legg til `monthlyBudgetLimit` i store**

Åpne `src/store/slices/wizardSlice.ts`. Finn `interface WizardState` og legg til:
```typescript
monthlyBudgetLimit: number; // 0 = ikke satt
setMonthlyBudgetLimit: (limit: number) => void;
```

I `initialState`, legg til: `monthlyBudgetLimit: 0`

I store-implementasjonen:
```typescript
setMonthlyBudgetLimit: (limit) => set({ monthlyBudgetLimit: limit }),
```

Eksporter fra `useWizard`-hook i `src/store/hooks.ts` ved å legge til `monthlyBudgetLimit` og `setMonthlyBudgetLimit` i `useShallow`-listen.

**Step 2: Legg til budsjettgrense-felt i SettingsSheet**

Åpne `src/components/planner/SettingsSheet.tsx`. Les filen for å forstå eksisterende oppsett. Legg til et tallinnputfelt for månedlig minstegrense i kronor, med etikett "Månedlig minstegrense (kr)".

Bruk eksisterende UI-komponenter (`Input`, `Label`) og `useWizard()`-hook for å lese/skrive verdien.

**Step 3: Forbedre MonthlyIncomeOverview**

Åpne `src/components/planner/MonthlyIncomeOverview.tsx`. Legg til:

1. **Per-rad fargeindikator** basert på `monthlyBudgetLimit`:
   - Rød: `m.total < monthlyBudgetLimit`
   - Gul: `m.total < monthlyBudgetLimit * 1.1` (innen 10% over)
   - Grønn: over grensen

2. **Vs-normal kolonne** til høyre for beløpet:

```tsx
const diff = m.total - normalIncome;
const diffLabel = diff >= 0 ? `+${formatKr(diff)}` : formatKr(diff);
const diffColor = diff >= 0 ? 'text-success-fg' : 'text-warning-fg';
```

3. **Feriemåned-markering**: sjekk om måneden inneholder `ferie`-perioder fra `customPeriods`, og vis et ferie-ikon (🏖️ eller et lucide-ikon som `Palmtree` eller `Sun`).

Oppdatert rad-layout (eksempel):
```tsx
<div key={m.month.toISOString()} className="flex items-center gap-2">
  {/* Månedsnavn */}
  <span className="w-14 text-xs text-muted-foreground shrink-0 tabular-nums">
    {m.month.toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' })}
  </span>

  {/* Ferie-ikon hvis relevant */}
  {hasFerieThisMonth && <span className="text-xs">☀️</span>}

  {/* Stolpediagram */}
  <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden flex">
    ...eksisterende...
  </div>

  {/* Beløp + diff */}
  <div className="text-right shrink-0">
    <div className={cn('text-xs font-medium tabular-nums', indicatorColor)}>
      {formatKr(m.total)} kr
    </div>
    <div className={cn('text-[10px] tabular-nums', diffColor)}>
      {diffLabel}
    </div>
  </div>
</div>
```

4. **Budsjettlinjehjelp**: Under listen, vis: `"Minstegrense: {limit} kr/mnd"` hvis satt, med lenke til innstillinger.

**Step 4: Kjør dev og verifiser**

```bash
bun run dev
```

Sjekk:
- "Økonomi"-fanen i kalenderen viser oppdatert månedsoversikt
- Rød/gul/grønn indikator fungerer med ulike budsjettgrenser
- Diff-kolonnen viser korrekt fortegn
- Ferie-markering vises på riktig måned

**Step 5: Kjør alle tester**

```bash
bun test
```

Forventet: Alle tester passerer (ingen nye tester nødvendig for rent UI-arbeid, men eksisterende tester skal fortsatt passere).

**Step 6: Kjør build**

```bash
bun run build
```

**Step 7: Commit**

```bash
git add src/components/planner/MonthlyIncomeOverview.tsx src/components/planner/SettingsSheet.tsx src/store/slices/wizardSlice.ts src/store/hooks.ts
git commit -m "feat: månedlig økonomi med vs-normal, fargeindikator og budsjettgrense"
```

---

## Avslutning

### Task 7: Oppdater CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

Legg til dagens dato med tre seksjoner:

```markdown
## 2026-02-25

### Ny identitet og landingsside
Appen heter nå Permisjonsplanleggeren. En ekte forside på perm-planlegger.vercel.app gir deg en rask oversikt og tar deg direkte til planleggingen — uten omveier.

### Permisjonshorisont i kalenderen
Øverst i kalenderen vises nå en tidslinje som alltid forteller deg hvor langt permisjonen rekker, hvor stort gapet til barnehage er, og hvilken måned du ser på.

### Månedlig økonomi — se hva dere faktisk har
Månedsoversikten viser nå hva familien tjener per måned under permisjon sammenlignet med normalt, med fargeindikator og mulighet til å sette en månedlig minstegrense.
```

**Commit:**

```bash
git add CHANGELOG.md
git commit -m "chore: oppdater CHANGELOG med kabalen-redesign"
```

---

## Testoppsummering

Etter alle faser, kjør:

```bash
bun test && bun run build
```

Forventet: Alle 97+ tester passerer, bygget fullføres uten feil.

Manuell verifisering på mobil (375px):
- [ ] `/` viser landingssiden
- [ ] Wizard-intro kommuniserer "kabalen", ikke "80 vs 100"
- [ ] Kalenderen viser permisjonshorisont-banner øverst
- [ ] Nøkkeltall (uker igjen, gap, barnehagestart) alltid synlig
- [ ] Økonomi-fanen viser differanse og fargeindikator per måned
- [ ] PostHog feature flag `calendar-mini-months` kan aktiveres og viser mini-strip

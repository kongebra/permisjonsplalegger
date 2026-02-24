# Helligdager i feriedager + DialogTitle a11y Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Trekk norske helligdager fra virkedager-telleren ved ferievalg, og fiks manglende DialogTitle i SmartPeriodPicker.

**Architecture:** `countVacationDays()` finnes allerede i `dates.ts` og er korrekt. Buggen er at displaykomponentene bruker `differenceInBusinessDays` fra date-fns i stedet. `PeriodModal` henter jobType fra Zustand-store per forelder. `PickerFooter` er generisk og bruker 'office' som default. `SmartPeriodPicker` får en `sr-only` DialogTitle.

**Tech Stack:** Bun (test runner), date-fns v4, Zustand, Radix UI Dialog

---

### Task 1: Skriv test for countVacationDays med påsken 2027

**Files:**
- Modify: `src/lib/calculator/dates.test.ts`

Funksjonen `countVacationDays` finnes allerede og er korrekt — men mangler tester for helligdagskasus. Skriv testen for å dokumentere kontrakten og forhindre regresjon.

**Bakgrunn:** Påsken 2027 — Skjærtorsdag 1. april og Langfredag 2. april er helligdager. Perioden 22. mars–3. april (inklusiv) = 13 kalenderdager, 10 man-fre, men **8 feriedager** fordi 2 weekday-helligdager.

**Step 1: Legg til import og describe-blokk**

Legg til `countVacationDays` i import-linjen øverst i filen:

```ts
import {
  // ... eksisterende imports ...
  countVacationDays,
} from './dates';
```

Legg så til denne describe-blokken på slutten av filen:

```ts
describe('countVacationDays', () => {
  test('teller man-fre uten helligdager (vanlig uke)', () => {
    // Mandag 2. juni 2025 → fredag 6. juni 2025 (eksklusiv slutt: 9. juni)
    const start = new Date(2025, 5, 2); // 2. juni (mandag)
    const end = new Date(2025, 5, 7);   // 7. juni (eksklusiv) = 5 virkedager
    expect(countVacationDays(start, end, 'office')).toBe(5);
  });

  test('trekker fra skjærtorsdag og langfredag i påsken 2027', () => {
    // 22. mars 2027 (man) → 3. apr (lør) inklusiv = eksklusiv slutt 4. apr
    // 10 man-fre, men skjærtorsdag 1. apr og langfredag 2. apr er helligdager → 8
    const start = new Date(2027, 2, 22); // 22. mars 2027
    const end = new Date(2027, 3, 4);    // 4. april 2027 (eksklusiv)
    expect(countVacationDays(start, end, 'office')).toBe(8);
  });

  test('skiftarbeid teller man-lør og ignorerer helligdager', () => {
    const start = new Date(2027, 2, 22);
    const end = new Date(2027, 3, 4);
    // man-lør = 12 dager (inkl. lør 22.mars, 29.mars, 5.apr...) men eksklusiv slutt er 4. apr
    // man-lør i perioden: 22(ma),23(ti),24(on),25(to),26(fr),27(lø), 29(ma),30(ti),31(on),1(to),2(fr),3(lø) = 12
    expect(countVacationDays(start, end, 'shift')).toBe(12);
  });
});
```

**Step 2: Kjør testene for å se at de passerer (funksjonen er allerede korrekt)**

```bash
bun test src/lib/calculator/dates.test.ts
```

Forventet: PASS på alle tre nye tester.

**Step 3: Commit**

```bash
git add src/lib/calculator/dates.test.ts
git commit -m "test: legg til tester for countVacationDays med påsken 2027"
```

---

### Task 2: Fiks PickerFooter — bruk countVacationDays

**Files:**
- Modify: `src/components/picker/PickerFooter.tsx`

**Step 1: Erstatt import og bruk av differenceInBusinessDays**

Gjeldende linje 3 ser slik ut:
```ts
import { format, differenceInDays, differenceInBusinessDays, subDays } from 'date-fns';
```

Endre den til (fjern `differenceInBusinessDays`, legg til ny import):
```ts
import { format, differenceInDays, subDays } from 'date-fns';
import { countVacationDays } from '@/lib/calculator/dates';
```

**Step 2: Erstatt beregning og tekst**

Gjeldende linje 16:
```ts
const workDays = hasRange ? differenceInBusinessDays(endDate, startDate) : 0;
```

Endre til:
```ts
const workDays = hasRange ? countVacationDays(startDate, endDate, 'office') : 0;
```

Gjeldende linje 25 i JSX:
```tsx
{days} kalenderdager ({workDays} virkedager)
```

Endre til:
```tsx
{days} kalenderdager ({workDays} feriedager)
```

**Step 3: Bygg for å bekrefte ingen TypeScript-feil**

```bash
bun run build
```

Forventet: Build passes uten feil.

**Step 4: Manuell verifisering**

Start dev-server (`bun run dev`) og åpne planlegger. Velg ferie for perioden 22. mars – 3. april 2027. Footer skal vise **13 kalenderdager (8 feriedager)**.

**Step 5: Commit**

```bash
git add src/components/picker/PickerFooter.tsx
git commit -m "fix: bruk countVacationDays i PickerFooter, vis feriedager uten helligdager"
```

---

### Task 3: Fiks PeriodModal — bruk countVacationDays med riktig jobType

**Files:**
- Modify: `src/components/planner/PeriodModal.tsx`

**Kontekst:**
- `usePlannerStore` importeres fra `@/store` slik: `import { usePlannerStore } from '@/store'`
- `countVacationDays` importeres fra `@/lib/calculator/dates`
- `jobType` hentes fra store basert på `parent`-state
- `vacationDaysUsed` lagres på perioden ved type='ferie'

**Step 1: Legg til imports**

Øverst i filen, etter eksisterende imports, legg til:
```ts
import { usePlannerStore } from '@/store';
import { countVacationDays } from '@/lib/calculator/dates';
```

**Step 2: Hent jobType fra store**

I `PeriodModalContent`-komponenten, etter de eksisterende `useState`-kallene (rundt linje 94), legg til:

```ts
const motherJobSettings = usePlannerStore((s) => s.motherJobSettings);
const fatherJobSettings = usePlannerStore((s) => s.fatherJobSettings);
const jobSettings = parent === 'mother' ? motherJobSettings : fatherJobSettings;
const jobType = jobSettings?.jobType ?? 'office';
```

**Step 3: Erstatt workDays-beregning**

Gjeldende linje ~147:
```ts
const workDays = calendarDays > 0 ? differenceInBusinessDays(endDate, startDate) : 0;
```

Endre til:
```ts
const workDays = calendarDays > 0 ? countVacationDays(startDate, endDate, jobType) : 0;
```

**Step 4: Fjern ubrukt import**

Finn linje 4 som importerer `differenceInBusinessDays`:
```ts
import { format, differenceInDays, differenceInBusinessDays, addDays, subDays } from 'date-fns';
```

Fjern `differenceInBusinessDays` fra listen:
```ts
import { format, differenceInDays, addDays, subDays } from 'date-fns';
```

**Step 5: Lagre vacationDaysUsed på perioden**

I `handleSave` (rundt linje 149), finn `periodData`-objektet:

```ts
const periodData = {
  type,
  parent,
  startDate,
  endDate,
  label: type === 'annet' ? label : undefined,
  color: type === 'annet' ? color : undefined,
};
```

Legg til `vacationDaysUsed`:
```ts
const periodData = {
  type,
  parent,
  startDate,
  endDate,
  label: type === 'annet' ? label : undefined,
  color: type === 'annet' ? color : undefined,
  vacationDaysUsed: type === 'ferie' ? workDays : undefined,
};
```

**Step 6: Bygg for å bekrefte ingen TypeScript-feil**

```bash
bun run build
```

Forventet: Build passes uten feil.

**Step 7: Manuell verifisering**

I planleggeren, velg ferie for far i perioden 22. mars – 3. april 2027. Modalens dagteller skal vise **8 feriedager** (eller det riktige antallet basert på jobbtype satt i wizard).

**Step 8: Commit**

```bash
git add src/components/planner/PeriodModal.tsx
git commit -m "fix: PeriodModal bruker countVacationDays med jobType fra store, lagrer vacationDaysUsed"
```

---

### Task 4: Fiks SmartPeriodPicker — legg til DialogTitle for skjermlesere

**Files:**
- Modify: `src/components/picker/SmartPeriodPicker.tsx`

**Bakgrunn:** Radix `DialogContent` krever en `DialogTitle` for UU. Desktop-varianten av `SmartPeriodPicker` har en `<DialogContent>` uten `DialogTitle`, noe som gir konsollfeil og bryter WCAG-kravet om tilgjengelig dialognavn.

**Step 1: Legg til DialogTitle i import**

Gjeldende linje 4:
```ts
import { Dialog, DialogContent } from '@/components/ui/dialog';
```

Endre til:
```ts
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
```

**Step 2: Legg til sr-only DialogTitle i desktop-dialog**

Finn desktop-return-blokken (rundt linje 91–113):
```tsx
return (
  <Dialog open onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-2xl">
      <PickerHeader ... />
      ...
    </DialogContent>
  </Dialog>
);
```

Legg til `DialogTitle` som første barn av `DialogContent`:
```tsx
return (
  <Dialog open onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-2xl">
      <DialogTitle className="sr-only">Velg periode</DialogTitle>
      <PickerHeader ... />
      ...
    </DialogContent>
  </Dialog>
);
```

**Step 3: Bygg for å bekrefte ingen TypeScript-feil og ingen konsollfeil**

```bash
bun run build
```

Forventet: Build passes uten feil.

**Step 4: Manuell verifisering**

Start dev-server, åpne planlegger på desktop-bredde (≥768px). Åpne ferievalg. Konsollen skal **ikke** vise `DialogContent requires a DialogTitle`-advarsel.

**Step 5: Commit**

```bash
git add src/components/picker/SmartPeriodPicker.tsx
git commit -m "fix: legg til sr-only DialogTitle i SmartPeriodPicker for UU-krav"
```

---

### Task 5: Kjør lint og bygg for ferdigstillelse

**Step 1: Kjør lint**

```bash
bun run lint
```

Forventet: Ingen feil eller advarsler.

**Step 2: Kjør alle tester**

```bash
bun test
```

Forventet: Alle tester passerer.

**Step 3: Kjør bygg**

```bash
bun run build
```

Forventet: Build passerer uten feil.

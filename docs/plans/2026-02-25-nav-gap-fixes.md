# NAV Gap Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three gaps between docs/nav/ and the app: barnehagerett for sept/okt/nov-barn (wrong gap calculation), prematur fødsel (no support), and aktivitetskrav info for fellesperiode (missing from UI).

**Architecture:** Three independent features. Task 1 is a pure logic fix + test update + one UI de-dup. Task 2 adds new wizard state, extends the calculator API with a new optional param, and adds a UI toggle. Task 3 is a purely additive SummaryStep UI change.

**Tech Stack:** TypeScript, React 19, Zustand, date-fns v4, bun:test, shadcn/ui components.

---

## Task 1: Barnehagerett sept/okt/nov — fix wrong default daycare date

**Files:**
- Modify: `src/lib/calculator/index.ts:18-35`
- Modify: `src/lib/calculator/index.test.ts` (update 2 tests, add 3)
- Modify: `src/components/wizard/steps/DaycareStep.tsx:27-34`

**Context:** `getDefaultDaycareStart` currently treats all sept–dec as "aug year+2". But barnehageloven § 16 ledd 2 says september, oktober, november-born children have a right to a spot in their birth month of year+1. December stays aug year+2. The DaycareStep component also has a copy-pasted version of this logic that must be fixed too.

---

### Step 1: Write the failing tests

In `src/lib/calculator/index.test.ts`, find the `describe('getDefaultDaycareStart', ...)` block and add/change these tests:

```typescript
// UPDATE: "born after august" test — it uses September, which should now be Sept year+1
test('born in september: daycare next year sep 1', () => {
  const dueDate = new Date(2026, 8, 15); // Sept 15, 2026
  const result = getDefaultDaycareStart(dueDate);
  expect(result.getFullYear()).toBe(2027);
  expect(result.getMonth()).toBe(8); // September
  expect(result.getDate()).toBe(1);
});

// UPDATE: existing "born in september" test to match above

// ADD: October
test('born in october: daycare next year oct 1', () => {
  const dueDate = new Date(2026, 9, 10); // Oct 10, 2026
  const result = getDefaultDaycareStart(dueDate);
  expect(result.getFullYear()).toBe(2027);
  expect(result.getMonth()).toBe(9); // October
  expect(result.getDate()).toBe(1);
});

// ADD: November
test('born in november: daycare next year nov 1', () => {
  const dueDate = new Date(2026, 10, 5); // Nov 5, 2026
  const result = getDefaultDaycareStart(dueDate);
  expect(result.getFullYear()).toBe(2027);
  expect(result.getMonth()).toBe(10); // November
  expect(result.getDate()).toBe(1);
});

// ADD: December stays year+2 aug
test('born in december: daycare 2 years later aug 1', () => {
  const dueDate = new Date(2026, 11, 15); // Dec 15, 2026
  const result = getDefaultDaycareStart(dueDate);
  expect(result.getFullYear()).toBe(2028);
  expect(result.getMonth()).toBe(7); // August
  expect(result.getDate()).toBe(1);
});
```

Also update the existing test at line ~23 ("born after august: daycare 2 years later aug 1") to use an October date so it still tests year+2 for December:
```typescript
// RENAME to: "born after november: daycare 2 years later aug 1"
test('born after november (december): daycare 2 years later aug 1', () => {
  const dueDate = new Date(2026, 11, 1); // Dec 1, 2026
  const result = getDefaultDaycareStart(dueDate);
  expect(result.getFullYear()).toBe(2028);
  expect(result.getMonth()).toBe(7); // August
  expect(result.getDate()).toBe(1);
});
```

### Step 2: Run tests to confirm they fail

```bash
bun test src/lib/calculator/index.test.ts --test-name-pattern "getDefaultDaycareStart"
```

Expected: FAIL on the sept/okt/nov cases.

### Step 3: Fix getDefaultDaycareStart in src/lib/calculator/index.ts

Replace the entire `getDefaultDaycareStart` function body (lines 18–35):

```typescript
export function getDefaultDaycareStart(dueDate: Date): Date {
  const year = dueDate.getFullYear();
  const month = dueDate.getMonth(); // 0-indexed: jan=0, aug=7, sep=8, nov=10, dec=11

  // Barnehageloven § 16 ledd 1: Født jan–aug → rett til plass fra 1. august (år+1)
  if (month <= 7) {
    return new Date(year + 1, 7, 1);
  }

  // Barnehageloven § 16 ledd 2: Født sep–nov → rett til plass innen utgangen av
  // fødselsmåneden (år+1). Vi bruker 1. i måneden som tidligst mulig start.
  if (month <= 10) {
    return new Date(year + 1, month, 1);
  }

  // Desember: neste august-opptak (år+2)
  return new Date(year + 2, 7, 1);
}
```

### Step 4: Run tests to confirm they pass

```bash
bun test src/lib/calculator/index.test.ts --test-name-pattern "getDefaultDaycareStart"
```

Expected: All PASS.

### Step 5: Fix duplicate logic in DaycareStep.tsx

In `src/components/wizard/steps/DaycareStep.tsx`:

Add import at top:
```tsx
import { getDefaultDaycareStart } from '@/lib/calculator';
```

Replace lines 27–34 (the inline `expectedDaycareStart` IIFE):
```tsx
// Beregner forventet barnehagestart basert på barnehageloven § 16
const expectedDaycareStart = getDefaultDaycareStart(dueDate);
```

### Step 6: Run all tests to verify nothing broke

```bash
bun test
```

Expected: All tests pass.

### Step 7: Run lint

```bash
bun run lint
```

Expected: No errors.

### Step 8: Commit

```bash
git add src/lib/calculator/index.ts src/lib/calculator/index.test.ts src/components/wizard/steps/DaycareStep.tsx
git commit -m "fix: barnehagerett for sept/okt/nov-barn — rett dato etter § 16 ledd 2"
```

---

## Task 2: Prematur fødsel — wizard-støtte for tidlig fødsel

**Files:**
- Modify: `src/store/slices/wizardSlice.ts`
- Modify: `src/lib/types.ts` (CalculatorInput + SavedPlan)
- Modify: `src/lib/calculator/dates.ts` (calculateLeave + buildLeaveSegments + calculateMotherPeriod)
- Modify: `src/lib/calculator/index.ts` (calculate + getDefaultDaycareStart)
- Modify: `src/lib/calculator/index.test.ts` (new tests)
- Modify: `src/lib/calculator/dates.test.ts` (new tests)
- Modify: `src/components/wizard/steps/DueDateStep.tsx`
- Modify: `src/components/wizard/WizardContainer.tsx`
- Modify: `src/store/index.ts` (savePlan/loadPlan)

**Context:** When a baby is born before week 33 (more than 7 weeks before termin), NAV extends the leave period by the number of days/weeks the birth was early. The extension is added to the total foreldrepenger period. The daycare start should also be calculated from actual birth date (child turns 1 on actual birthday).

**Design decisions:**
- Store `actualBirthDate: Date | null` in wizardSlice (null = no premature birth)
- `prematureWeeks = weeksBetween(actualBirthDate, subtractWeeks(dueDate, config.preBirth))` when `actualBirthDate < subtractWeeks(dueDate, config.preBirth)`
- Extra weeks are added to mother's leave (as an extension of the preBirth segment)
- Daycare default uses actualBirthDate if set
- Validation: actualBirthDate must be ≤ dueDate and at least 7 days before (to avoid noise)

---

### Step 1: Write failing tests for the calculator

In `src/lib/calculator/dates.test.ts`, add a new describe block at the end:

```typescript
describe('calculateLeave with premature birth', () => {
  test('prematureWeeks=0: no change to leave', () => {
    const dueDate = new Date(2027, 4, 1); // 1. mai 2027
    const daycare = new Date(2028, 7, 1);
    const normal = calculateLeave(dueDate, 100, 'both', 8, 0, daycare, [], undefined, 0);
    const withZero = calculateLeave(dueDate, 100, 'both', 8, 0, daycare, [], undefined, 0);
    expect(normal.mother.weeks).toBe(withZero.mother.weeks);
  });

  test('prematureWeeks=4: mother gets 4 extra weeks', () => {
    const dueDate = new Date(2027, 4, 1);
    const daycare = new Date(2028, 7, 1);
    const normal = calculateLeave(dueDate, 100, 'both', 8, 0, daycare);
    const premature = calculateLeave(dueDate, 100, 'both', 8, 0, daycare, [], undefined, 4);
    expect(premature.mother.weeks).toBe(normal.mother.weeks + 4);
  });

  test('prematureWeeks=4: leave starts 4 weeks earlier', () => {
    const dueDate = new Date(2027, 4, 1);
    const daycare = new Date(2028, 7, 1);
    const normal = calculateLeave(dueDate, 100, 'both', 8, 0, daycare);
    const premature = calculateLeave(dueDate, 100, 'both', 8, 0, daycare, [], undefined, 4);
    const expectedStart = subtractWeeks(normal.mother.start, 4);
    expect(premature.mother.start.getTime()).toBe(expectedStart.getTime());
  });
});
```

Also in `src/lib/calculator/index.test.ts`, add:

```typescript
describe('getDefaultDaycareStart with actualBirthDate', () => {
  test('uses actualBirthDate when provided instead of dueDate', () => {
    // actualBirthDate in July → daycare Aug year+1
    const actualBirth = new Date(2026, 6, 1); // July 1 = month 6
    const result = getDefaultDaycareStart(actualBirth);
    expect(result.getMonth()).toBe(7); // August
    expect(result.getFullYear()).toBe(2027);
  });
});
```

### Step 2: Run tests to confirm they fail

```bash
bun test src/lib/calculator/dates.test.ts --test-name-pattern "premature"
```

Expected: FAIL — `calculateLeave` doesn't accept `prematureWeeks` param yet.

### Step 3: Update calculateLeave signature and logic in dates.ts

In `src/lib/calculator/dates.ts`, update the `calculateLeave` function:

Change signature (add `prematureWeeks = 0` at the end):
```typescript
export function calculateLeave(
  dueDate: Date,
  coverage: Coverage,
  rights: ParentRights,
  sharedWeeksToMother: number,
  overlapWeeks: number,
  daycareStartDate: Date,
  vacationWeeks: VacationWeek[] = [],
  vacation?: VacationInput,
  prematureWeeks: number = 0,  // Uker barnet ble født før 3-ukers grense
): LeaveResult {
```

Inside `calculateLeave`, replace the leaveStart line:
```typescript
// Prematur fødsel: leaveStart flyttes X uker bakover
const leaveStart = prematureWeeks > 0
  ? subtractWeeks(calculateLeaveStart(dueDate, coverage), prematureWeeks)
  : calculateLeaveStart(dueDate, coverage);
```

Update the `calculateMotherPeriod` call to add `prematureWeeks`:
```typescript
const motherPeriod = calculateMotherPeriod(
  leaveStart,
  dueDate,
  coverage,
  sharedWeeksToMother,
  rights,
  prematureWeeks,  // NEW
);
```

Update `calculateMotherPeriod` signature:
```typescript
export function calculateMotherPeriod(
  leaveStart: Date,
  dueDate: Date,
  coverage: Coverage,
  sharedWeeksToMother: number,
  rights: ParentRights,
  prematureWeeks: number = 0,  // NEW
): { start: Date; end: Date; weeks: number } {
  const config = LEAVE_CONFIG[coverage];

  let totalMotherWeeks: number;

  if (rights === 'mother-only') {
    totalMotherWeeks = config.total + prematureWeeks;
  } else if (rights === 'father-only') {
    return { start: dueDate, end: dueDate, weeks: 0 };
  } else {
    totalMotherWeeks = config.preBirth + config.mother + sharedWeeksToMother + prematureWeeks;
  }

  const end = addWeeks(leaveStart, totalMotherWeeks);
  return { start: leaveStart, end, weeks: totalMotherWeeks };
}
```

Also pass `prematureWeeks` through to `buildLeaveSegments`:
```typescript
const segments = buildLeaveSegments(
  dueDate,
  coverage,
  rights,
  sharedWeeksToMother,
  overlapWeeks,
  daycareStartDate,
  vacationWeeks,
  vacation,
  prematureWeeks,  // NEW
);
```

Update `buildLeaveSegments` signature to accept `prematureWeeks = 0` and extend the preBirth segment:
```typescript
export function buildLeaveSegments(
  dueDate: Date,
  coverage: Coverage,
  rights: ParentRights,
  sharedWeeksToMother: number,
  overlapWeeks: number,
  _daycareStartDate: Date,
  _vacationWeeks: VacationWeek[],
  vacation?: VacationInput,
  prematureWeeks: number = 0,  // NEW
): LeaveSegment[] {
```

Inside `buildLeaveSegments`, after the father-only check, update `leaveStart`:
```typescript
// leaveStart med prematur-justering
const normalLeaveStart = calculateLeaveStart(dueDate, coverage);
const leaveStart = prematureWeeks > 0
  ? subtractWeeks(normalLeaveStart, prematureWeeks)
  : normalLeaveStart;
```

And update the first preBirth segment to use `config.preBirth + prematureWeeks`:
```typescript
if (config.preBirth + prematureWeeks > 0) {
  const preBirthEnd = addWeeks(leaveStart, config.preBirth + prematureWeeks);
  segments.push({
    parent: 'mother',
    type: 'preBirth',
    start: leaveStart,
    end: preBirthEnd,
    weeks: config.preBirth + prematureWeeks,
  });
  currentDate = preBirthEnd;
}
```

### Step 4: Run tests

```bash
bun test src/lib/calculator/dates.test.ts
```

Expected: All PASS including the new premature tests.

### Step 5: Add prematureWeeks to CalculatorInput and update calculate()

In `src/lib/types.ts`, add to `CalculatorInput`:
```typescript
export interface CalculatorInput {
  dueDate: Date;
  coverage: Coverage;
  rights: ParentRights;
  sharedWeeksToMother: number;
  overlapWeeks: number;
  daycareStartDate: Date;
  motherEconomy?: ParentEconomy;
  fatherEconomy?: ParentEconomy;
  vacationWeeks: VacationWeek[];
  vacation?: VacationInput;
  prematureWeeks?: number;  // NEW — uker barnet ble født for tidlig (0 = ikke prematur)
}
```

In `src/lib/calculator/index.ts`, destructure `prematureWeeks` in `calculate()` and pass through:
```typescript
const {
  dueDate,
  coverage,
  rights,
  sharedWeeksToMother,
  overlapWeeks,
  daycareStartDate,
  motherEconomy,
  fatherEconomy,
  vacationWeeks,
  vacation,
  prematureWeeks = 0,  // NEW
} = input;
```

Pass `prematureWeeks` to each `calculateLeave` call in `calculate()`:
```typescript
const leave = calculateLeave(dueDate, coverage, rights, sharedWeeksToMother, overlapWeeks, daycareStartDate, vacationWeeks, vacation, prematureWeeks);

const leave80 = calculateLeave(dueDate, 80, rights, ..., prematureWeeks);
const leave100 = calculateLeave(dueDate, 100, rights, ..., prematureWeeks);
```

### Step 6: Add prematureBirthDate to wizardSlice

In `src/store/slices/wizardSlice.ts`, add to interface:
```typescript
export interface WizardSlice {
  // ... existing fields ...
  prematureBirthDate: Date | null;  // NEW
  setPrematureBirthDate: (date: Date | null) => void;  // NEW
}
```

Add to initial state in `createWizardSlice`:
```typescript
prematureBirthDate: null,
```

Add action:
```typescript
setPrematureBirthDate: (date) => set({ prematureBirthDate: date }),
```

Also update `resetWizard` to reset this field:
```typescript
prematureBirthDate: null,
```

### Step 7: Update SavedPlan type and persistence

In `src/lib/types.ts`, add `prematureBirthDate` to `SavedPlan.wizard`:
```typescript
wizard: {
  // ... existing fields ...
  prematureBirthDate?: string | null;  // NEW — ISO string or null
};
```

In `src/store/index.ts`, add to `savePlan`:
```typescript
wizard: {
  // ... existing fields ...
  prematureBirthDate: state.prematureBirthDate?.toISOString() ?? null,
},
```

Add to `loadPlan`:
```typescript
state.setPrematureBirthDate(
  plan.wizard.prematureBirthDate ? new Date(plan.wizard.prematureBirthDate) : null
);
```

### Step 8: Wire prematureWeeks into useCalculatedLeave hook

Find where `calculateLeave` or `calculate` is called with the wizard state (check `src/store/hooks.ts`). Add `prematureWeeks` derived from `prematureBirthDate`:

```typescript
// Premature weeks = weeks between actual birth and normal leave start
const prematureWeeks = prematureBirthDate
  ? Math.max(0, Math.round(weeksBetween(prematureBirthDate, subtractWeeks(dueDate, LEAVE_CONFIG[coverage].preBirth))))
  : 0;
```

Pass `prematureWeeks` to the calculator input. Also update `getDefaultDaycareStart` call in wizardSlice `setDueDate` (or wherever daycare date is initialized) to use `prematureBirthDate ?? dueDate` when computing default daycare.

### Step 9: Add UI to DueDateStep

In `src/components/wizard/steps/DueDateStep.tsx`, update props and add premature UI:

```typescript
interface DueDateStepProps {
  value: Date;
  onChange: (date: Date) => void;
  prematureBirthDate: Date | null;     // NEW
  onPrematureChange: (date: Date | null) => void;  // NEW
}
```

Add below the existing calendar output:
```tsx
{/* Prematur fødsel */}
<div className="flex items-center justify-between rounded-lg border p-3">
  <div>
    <Label htmlFor="premature-toggle" className="text-sm font-medium">
      Barnet ble født prematurt
    </Label>
    <p className="text-xs text-muted-foreground">
      Født mer enn 7 uker før termin? NAV utvider permisjonen tilsvarende.
    </p>
  </div>
  <Switch
    id="premature-toggle"
    checked={prematureBirthDate !== null}
    onCheckedChange={(checked) => onPrematureChange(checked ? subtractWeeks(value, 8) : null)}
  />
</div>

{prematureBirthDate !== null && (
  <div className="space-y-2">
    <Label className="text-sm">Faktisk fødselsdato</Label>
    <Calendar
      mode="single"
      selected={prematureBirthDate}
      onSelect={(date) => date && onPrematureChange(date)}
      locale={nb}
      captionLayout="dropdown"
      disabled={(date) => date >= value}
      className="rounded-md border w-full"
    />
  </div>
)}
```

Note: `subtractWeeks` must be imported from `@/lib/calculator`.

### Step 10: Wire new props in WizardContainer

In `src/components/wizard/WizardContainer.tsx`, destructure `prematureBirthDate` and `setPrematureBirthDate` from `useWizard()`, and pass to `DueDateStep`:

```tsx
case 1:
  return (
    <DueDateStep
      value={dueDate}
      onChange={setDueDate}
      prematureBirthDate={prematureBirthDate}
      onPrematureChange={setPrematureBirthDate}
    />
  );
```

### Step 11: Run all tests

```bash
bun test
```

Expected: All PASS.

### Step 12: Run lint and build

```bash
bun run lint && bun run build
```

Expected: No errors.

### Step 13: Commit

```bash
git add src/store/slices/wizardSlice.ts src/lib/types.ts src/lib/calculator/dates.ts src/lib/calculator/index.ts src/components/wizard/steps/DueDateStep.tsx src/components/wizard/WizardContainer.tsx src/store/index.ts
git commit -m "feat: legg til støtte for prematur fødsel i wizard — perioden forlenges automatisk"
```

---

## Task 3: Aktivitetskrav info i SummaryStep

**Files:**
- Modify: `src/components/wizard/steps/SummaryStep.tsx`

**Context:** When `rights === 'both'` and father has some shared period weeks (`sharedWeeksToMother < LEAVE_CONFIG[coverage].shared`), NAV requires mother to be in approved activity (work, education, etc.) while father is taking the shared period. This is already shown for `father-only` as a visual segment, but never communicated in the summary for the common `both` case.

---

### Step 1: Find the right place in SummaryStep

In `src/components/wizard/steps/SummaryStep.tsx`, find the closing of the summary rows section (the area just before or after the economy panel). Look for the final `return` statement and find a logical place to insert the info block — after the existing summary rows and before the "Gå til kalender" button.

### Step 2: Add the aktivitetskrav info block

Add this conditional block inside the `SummaryStep` return, after the last summary row and before the navigation buttons. Only show when `rights === 'both'` and father has shared weeks:

```tsx
{rights === 'both' && sharedWeeksToMother < LEAVE_CONFIG[coverage].shared && (
  <div className="flex gap-2 rounded-lg bg-[var(--color-info-bg,hsl(var(--muted)))] border border-[var(--color-info-fg,hsl(var(--border)))/20] p-3 text-sm">
    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-[var(--color-info-fg,hsl(var(--muted-foreground)))]" />
    <p className="text-[var(--color-info-fg,hsl(var(--muted-foreground)))]">
      Når far tar fellesperioden, krever NAV at mor er i godkjent aktivitet — arbeid,
      heltidsutdanning, registrert arbeidssøker, eller annen godkjent grunn.
    </p>
  </div>
)}
```

`AlertCircle` is already imported in SummaryStep (check existing imports). `LEAVE_CONFIG` is also already imported.

### Step 3: Run tests

```bash
bun test
```

Expected: All PASS (this is a UI-only change, no logic tests needed).

### Step 4: Run lint

```bash
bun run lint
```

Expected: No errors.

### Step 5: Commit

```bash
git add src/components/wizard/steps/SummaryStep.tsx
git commit -m "feat: vis aktivitetskrav-info i oppsummeringen når far tar fellesperiode"
```

---

## Final: Update CHANGELOG.md

Add an entry at the top of `CHANGELOG.md`:

```markdown
## [Upublisert]

### Forbedringer
- Barnehagerett rettet for barn født i september, oktober og november: disse barna kan starte barnehage i fødselsmåneden (ikke august), og kalkulatoren viser nå riktig gap.
- Støtte for prematur fødsel i wizard: legg inn faktisk fødselsdato og permisjonen forlenges automatisk i tråd med NAV-regelverket.
- Informasjon om aktivitetskravet vises nå i oppsummeringen når far planlegger å ta fellesperioden.
```

```bash
git add CHANGELOG.md
git commit -m "chore: oppdater CHANGELOG med barnehagerett, prematur fødsel og aktivitetskrav-info"
```

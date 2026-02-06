# Planlegger: Default-perioder og skjema-panel

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fyll planleggeren med wizard-resultatet som redigerbar grunnmal, erstatt drag-toolbar med et skjema-panel for å legge til ferie/ulønnet/annet, og gjør eksisterende perioder klikkbare for redigering.

**Architecture:** Wizard-segmenter konverteres til `CustomPeriod[]` ved inngang til planlegger via en ren funksjon `initializePeriodsFromLeave()`. PeriodToolbar erstattes av en FAB + AddPeriodPanel (bottom sheet). Eksisterende PeriodModal gjenbrukes for redigering av perioder. Drag-to-select fjernes.

**Tech Stack:** React 19, Zustand, date-fns, shadcn/ui (Dialog, Calendar, Select, Popover, Button)

---

## Bakgrunn

### Problem
1. Planleggeren åpner **tom** — brukeren ser en blank kalender uten context
2. Klikk/dra oppretter en 1-dags "permisjon"-periode basert på toolbar-valg — uintuitiv
3. Custom periods **påvirker ikke** beregningsresultatet (leaveResult ignorerer dem)
4. Drag-to-select er vanskelig på mobil og krever at man vet nøyaktige datoer

### Løsning (Steg 1)
1. Konverter wizard-segmenter til redigerbare CustomPeriods ved inngang til planlegger
2. Erstatt drag-toolbar med FAB + skjema-panel for å legge til nye perioder
3. Klikk på eksisterende periode → PeriodModal for redigering
4. Dag-granularitet i alle dato-valg

### Ikke i scope (Steg 2)
- Automatisk konflikthåndtering ("Vil du skyve far?")
- Økonomiberegning basert på perioder
- Drag-to-select som alternativ input

---

## Task 1: `initializePeriodsFromLeave()` — Ren konverteringsfunksjon

**Files:**
- Create: `src/lib/planner/initialize-periods.ts`

**Step 1: Create the conversion function**

```typescript
// src/lib/planner/initialize-periods.ts
import type { LeaveResult, LeaveSegment, CustomPeriod, PlannerPeriodType } from '@/lib/types';

// Map segment types to planner period types
const SEGMENT_TO_PERIOD_TYPE: Record<string, PlannerPeriodType> = {
  preBirth: 'permisjon',
  mandatory: 'permisjon',
  quota: 'permisjon',
  shared: 'permisjon',
  overlap: 'permisjon',
  vacation: 'ferie',
  unpaid: 'ulonnet',
};

// Segments that should be locked (not editable by user)
const LOCKED_SEGMENT_TYPES = new Set(['preBirth', 'mandatory']);

export interface InitializedPeriod extends CustomPeriod {
  isFromWizard: boolean;    // true = auto-generated from wizard
  isLocked: boolean;        // true = preBirth/mandatory, cannot be edited
  segmentType: string;      // Original segment type for display
}

let idCounter = 0;
function generateWizardPeriodId(segment: LeaveSegment): string {
  return `wizard-${segment.parent}-${segment.type}-${++idCounter}`;
}

/**
 * Convert wizard LeaveResult segments into editable CustomPeriods.
 *
 * Rules:
 * - preBirth and mandatory → locked (not editable)
 * - quota, shared, overlap → editable permisjon
 * - vacation → editable ferie
 * - unpaid → editable ulønnet
 * - gap → NOT converted (shown as warning in StatsBar)
 */
export function initializePeriodsFromLeave(result: LeaveResult): InitializedPeriod[] {
  idCounter = 0;
  const periods: InitializedPeriod[] = [];

  for (const segment of result.segments) {
    // Skip gap segments — these are shown as warnings, not periods
    if (segment.type === 'gap') continue;

    const periodType = SEGMENT_TO_PERIOD_TYPE[segment.type];
    if (!periodType) continue;

    periods.push({
      id: generateWizardPeriodId(segment),
      type: periodType,
      parent: segment.parent,
      startDate: segment.start,
      endDate: segment.end,  // Already exclusive (day after last day)
      isFromWizard: true,
      isLocked: LOCKED_SEGMENT_TYPES.has(segment.type),
      segmentType: segment.type,
    });
  }

  return periods;
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: Clean (no errors)

**Step 3: Commit**

```
feat: add initializePeriodsFromLeave conversion function
```

---

## Task 2: Extend `CustomPeriod` type with wizard metadata

**Files:**
- Modify: `src/lib/types.ts` (lines 179-187, CustomPeriod interface)

**Step 1: Add optional fields to CustomPeriod**

Add these fields to the existing `CustomPeriod` interface:

```typescript
export interface CustomPeriod {
  id: string;
  type: PlannerPeriodType;
  parent: Parent;
  startDate: Date;
  endDate: Date;
  label?: string;
  color?: string;
  // NEW: Wizard-generated metadata
  isFromWizard?: boolean;   // true = auto-generated from wizard result
  isLocked?: boolean;       // true = mandatory period, cannot be edited/deleted
  segmentType?: string;     // Original LeaveSegmentType for display purposes
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: Clean (existing code unaffected since fields are optional)

**Step 3: Commit**

```
feat: extend CustomPeriod with wizard metadata fields
```

---

## Task 3: Auto-initialize periods when entering planner

**Files:**
- Modify: `src/store/slices/periodsSlice.ts` (add `initializeFromLeave` action)
- Modify: `src/store/hooks.ts` (expose new action)
- Modify: `src/components/planner/PlannerCalendar.tsx` (call on mount)

**Step 1: Add `initializeFromLeave` to periodsSlice**

In `src/store/slices/periodsSlice.ts`, add to the interface:

```typescript
initializeFromLeave: (result: LeaveResult) => void;
```

And the implementation:

```typescript
initializeFromLeave: (result) => {
  const { periods } = get();
  // Only initialize if no periods exist yet (don't overwrite user edits)
  if (periods.length > 0) return;

  const initialPeriods = initializePeriodsFromLeave(result);
  set({ periods: initialPeriods, undoStack: [] });
},
```

Import `initializePeriodsFromLeave` from `@/lib/planner/initialize-periods` and `LeaveResult` from types.

**Step 2: Expose in hooks**

In `src/store/hooks.ts`, add `initializeFromLeave` to the `usePeriods()` hook return.

**Step 3: Call initialization in PlannerCalendar**

In `src/components/planner/PlannerCalendar.tsx`, in the existing mount `useEffect` (line 205-209), add:

```typescript
useEffect(() => {
  if (leaveResult.mother.start && !isSameMonth(activeMonth, leaveResult.mother.start)) {
    setActiveMonth(startOfMonth(leaveResult.mother.start));
  }
  // Initialize periods from wizard result if empty
  initializeFromLeave(leaveResult);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

Get `initializeFromLeave` from `usePeriods()`.

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 5: Manual test**

Run: `bun dev`, complete wizard, navigate to planlegger/kalender.
Expected: Calendar shows colored period bands for all wizard segments.

**Step 6: Commit**

```
feat: auto-initialize planner with wizard periods on first entry
```

---

## Task 4: Add locked period visual indicator to DayCell

**Files:**
- Modify: `src/components/calendar/DayCell.tsx`

**Step 1: Add locked visual state**

In interactive DayCell mode, when `day.isLocked` is true and the day has periods with `isLocked`, show a subtle lock indicator (opacity reduction + different cursor already exists, just verify it works with the new wizard-generated locked periods).

No code change needed if existing `isLocked` logic already covers this. Verify visually.

**Step 2: Manual test**

Check that preBirth (3 weeks before due date) and mandatory (6 weeks after) periods appear grayed out / non-clickable in the planner calendar.

**Step 3: Commit (if changes needed)**

```
fix: ensure locked wizard periods show correct visual state
```

---

## Task 5: Replace PeriodToolbar with FAB

**Files:**
- Create: `src/components/planner/AddPeriodFab.tsx`
- Modify: `src/components/planner/PlannerCalendar.tsx` (swap toolbar for FAB)
- Modify: `src/components/planner/index.ts` (export new component)

**Step 1: Create FAB component**

```typescript
// src/components/planner/AddPeriodFab.tsx
'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddPeriodFabProps {
  onClick: () => void;
}

export function AddPeriodFab({ onClick }: AddPeriodFabProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        onClick={onClick}
        className="rounded-full w-14 h-14 shadow-lg"
        aria-label="Legg til periode"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
```

**Step 2: Swap in PlannerCalendar**

In `PlannerCalendar.tsx`:
- Remove `<PeriodToolbar>` component usage
- Remove `pb-36` padding (no longer needed)
- Add `<AddPeriodFab onClick={() => openPeriodModal()} />`
- Remove drag-related state/handlers (`handlePointerDown`, `handlePointerUp`, `handlePointerEnter`, drag useEffects, drag hint UI)
- Keep swipe navigation for month browsing

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Manual test**

Run: `bun dev`. FAB visible in bottom-right. Clicking opens period modal.
No more drag selection on dates.

**Step 5: Commit**

```
feat: replace drag toolbar with FAB for adding periods
```

---

## Task 6: Enhance PeriodModal with placement options and day granularity

**Files:**
- Modify: `src/components/planner/PeriodModal.tsx`

**Step 1: Add placement presets**

Add a "Plassering" radio group that pre-fills dates:

```typescript
type Placement = 'after-mother' | 'before-father' | 'overlap-father' | 'custom';
```

When user selects a placement:
- `after-mother`: set startDate = mother's last period end, endDate = startDate + 14 days
- `before-father`: set endDate = father's first period start, startDate = endDate - 14 days
- `overlap-father`: set endDate = father's first period start, startDate = endDate - 14 days (same dates but marks as overlapping)
- `custom`: user picks dates freely

The modal needs the leave result to compute these reference dates. Add a `leaveResult: LeaveResult` prop.

**Step 2: Show day count between dates**

Below the date pickers, show:
```
14 kalenderdager (10 virkedager)
```

Use `differenceInDays` for calendar days and `differenceInBusinessDays` for work days.

**Step 3: Improve "Annet" type**

When type is "annet", show placeholder "F.eks. Bestemor passer, Dagmamma" in the label field.

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Manual test**

- Open FAB → modal opens
- Select "Ferie" → "Mor" → "Etter mors permisjon" → dates auto-fill
- Change type to "Annet" → label field appears with placeholder
- Day count shows correctly

**Step 6: Commit**

```
feat: add placement presets and day count to period modal
```

---

## Task 7: Make period bands clickable for editing

**Files:**
- Modify: `src/components/calendar/PeriodBandRenderer.tsx` (already has onPeriodSelect)
- Modify: `src/components/planner/PlannerCalendar.tsx` (wire up period click)

**Step 1: Wire onPeriodSelect in PlannerCalendar**

In `PlannerCalendar.tsx`, add a callback that opens PeriodModal for the clicked period:

```typescript
const handlePeriodSelect = useCallback((periodId: string) => {
  const period = periods.find(p => p.id === periodId);
  if (period?.isLocked) return; // Don't open modal for locked periods
  openPeriodModal(periodId);
}, [periods, openPeriodModal]);
```

Pass this through MonthView → MonthGrid → PeriodBandRenderer via the callbacks prop.

**Step 2: Add callbacks.onPeriodSelect to MonthView props**

In `MonthView.tsx`, add `onPeriodSelect` to the interface and pass it through to MonthGrid callbacks.

**Step 3: Visual feedback on hover**

PeriodBandRenderer already has `hover:brightness-90` for bands with periodId. Verify this works. Add `cursor-pointer` for non-locked bands.

**Step 4: Manual test**

- Click on a colored period band → PeriodModal opens with that period's data
- Click on locked (preBirth/mandatory) period → nothing happens
- Edit dates → save → period updates on calendar

**Step 5: Commit**

```
feat: make period bands clickable for inline editing
```

---

## Task 8: Remove drag-to-select and clean up

**Files:**
- Modify: `src/components/planner/PlannerCalendar.tsx` (remove remaining drag code)
- Delete: `src/components/planner/PeriodToolbar.tsx` (no longer used)
- Modify: `src/components/planner/index.ts` (remove PeriodToolbar export)
- Modify: `src/store/slices/uiSlice.ts` (simplify: remove drag state if fully unused)

**Step 1: Clean up PlannerCalendar**

Remove from PlannerCalendar:
- `handlePointerDown`, `handlePointerUp`, `handlePointerEnter` callbacks
- `handleDayClick` (empty callback)
- `lastAutoNavigate` ref
- Global pointer up/cancel useEffects
- `touch-none`/`touch-pan-y` conditional class
- Drag hint and cancel button JSX
- Import of `PeriodToolbar`

Keep:
- Swipe navigation (touchStartX, handleTouchStart, handleTouchEnd)
- MonthView (but without pointer event callbacks)
- PeriodModal
- FAB

**Step 2: Remove onDayPointerDown/onDayPointerEnter from MonthView**

Remove these props from MonthView since drag is gone. Keep `onDayClick` for potential future use (tap to select date).

**Step 3: Delete PeriodToolbar.tsx**

File is no longer imported anywhere.

**Step 4: Lint and build**

Run: `bun run lint && bun run build`
Expected: Clean (no new errors)

**Step 5: Commit**

```
refactor: remove drag-to-select, delete PeriodToolbar
```

---

## Task 9: Update StatsBar to reflect wizard-generated periods

**Files:**
- Modify: `src/components/planner/StatsBar.tsx`

**Step 1: Show segment type labels**

Currently StatsBar just counts weeks for "Mors kvote", "Fars kvote", "Fellesperiode". With wizard-generated periods, these should show correctly since the periods now have `segmentType` metadata.

Update the quota calculation to use `segmentType` for more accurate counting:

```typescript
// Instead of just counting 'permisjon' periods by parent,
// use segmentType to distinguish quota vs shared
const motherQuotaPeriods = customPeriods.filter(
  (p) => p.parent === 'mother' && (p.segmentType === 'quota' || p.segmentType === 'mandatory')
);
```

**Step 2: Show editable vs locked indicator**

For each quota bar, show a small lock icon next to locked weeks vs a pen icon next to editable weeks.

**Step 3: Manual test**

Complete wizard → open planner. StatsBar should show:
- Mors kvote: 15/15 uker (100%) or 19/19 uker (80%)
- Fars kvote: 15/15 uker or 19/19 uker
- Fellesperiode: X/16 uker or X/18 uker (based on sharedWeeksToMother)

**Step 4: Commit**

```
feat: update StatsBar quota counting for wizard-generated periods
```

---

## Task 10: Final integration test and lint

**Files:** None new

**Step 1: Full lint and build**

Run: `bun run lint && bun run build`
Expected: No new errors (pre-existing errors acceptable)

**Step 2: Manual test flow**

1. Start fresh → complete wizard with:
   - Termin: aug 2026
   - Rettigheter: Begge
   - Dekning: 100%
   - Fordeling: default
   - Barnehage: aug 2027

2. Navigate to planlegger/kalender
   - Calendar pre-filled with wizard periods ✓
   - Locked periods (preBirth, mandatory) non-editable ✓
   - FAB visible in bottom-right ✓
   - StatsBar shows correct quotas ✓

3. Add ferie via FAB:
   - Click FAB → modal opens ✓
   - Select "Ferie" → "Mor" → "Etter mors permisjon" ✓
   - Dates auto-fill ✓
   - Day count shows ✓
   - "Legg til" → calendar updates ✓

4. Click on a period band:
   - Modal opens with period data ✓
   - Edit dates → save → calendar updates ✓
   - Delete → period removed ✓

5. Undo works:
   - Click undo → last action reverted ✓

**Step 3: Commit**

```
feat: complete planner step 1 — default periods, FAB, and inline editing
```

---

## Nøkkelfiler (referanse)

| Fil | Rolle |
|-----|-------|
| `src/lib/planner/initialize-periods.ts` | **NY** — konverterer LeaveResult → CustomPeriod[] |
| `src/lib/types.ts:179-187` | **ENDRE** — legg til isFromWizard, isLocked, segmentType |
| `src/store/slices/periodsSlice.ts` | **ENDRE** — legg til initializeFromLeave action |
| `src/store/hooks.ts` | **ENDRE** — eksponere initializeFromLeave |
| `src/components/planner/PlannerCalendar.tsx` | **ENDRE** — fjern drag, legg til FAB, init periods |
| `src/components/planner/AddPeriodFab.tsx` | **NY** — FAB-knapp |
| `src/components/planner/PeriodModal.tsx` | **ENDRE** — plasserings-valg, dagsteller |
| `src/components/planner/MonthView.tsx` | **ENDRE** — fjern pointer-event props |
| `src/components/planner/StatsBar.tsx` | **ENDRE** — bruk segmentType for kvote-telling |
| `src/components/planner/PeriodToolbar.tsx` | **SLETT** |

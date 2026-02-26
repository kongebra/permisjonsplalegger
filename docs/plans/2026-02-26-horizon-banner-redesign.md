# Horizon Banner Redesign — Implementasjonsplan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Erstatt `LeaveHorizonBanner` + `StatsBar` med to fokuserte komponenter: `PlanStatusBar` (status + sammendrag, øverst) og `LeaveHorizonLine` (ren tappbar orienteringslinje).

**Architecture:** `PlanStatusBar` eier all gap- og sammendragskommunikasjon. `LeaveHorizonLine` er kun romlig orientering med tap-navigasjon. `PlannerCalendar` wirer dem opp og fjerner de gamle komponentene.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, date-fns v4, Zustand, `bun test`, `bun run build`

---

## Task 1: Legg til `clickRatioToMonth`-hjelpefunksjon + test

Ren funksjon som beregner hvilken måned en tap-posisjon tilsvarer. Testes isolert.

**Files:**
- Modify: `src/lib/calculator/dates.ts`
- Modify: `src/lib/calculator/dates.test.ts`

**Step 1: Skriv den feilvise testen**

Legg til i `src/lib/calculator/dates.test.ts`:

```typescript
describe('clickRatioToMonth', () => {
  it('ratio 0 → startmåned', () => {
    const start = new Date(2026, 0, 14); // 14. jan 2026
    const result = clickRatioToMonth(0, start, 365);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // januar
    expect(result.getDate()).toBe(1);  // start av måneden
  });

  it('ratio 1 → siste måned', () => {
    const start = new Date(2026, 0, 1);
    const result = clickRatioToMonth(1, start, 365);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(11); // desember
  });

  it('ratio 0.5 → midtmåned', () => {
    const start = new Date(2026, 0, 1);
    const result = clickRatioToMonth(0.5, start, 365);
    // 182 dager fra jan 1 = ca. 1. juli
    expect(result.getMonth()).toBe(6); // juli
    expect(result.getDate()).toBe(1);
  });

  it('ratio klemmes til [0, 1]', () => {
    const start = new Date(2026, 0, 1);
    const tooLow = clickRatioToMonth(-0.5, start, 100);
    const tooHigh = clickRatioToMonth(1.5, start, 100);
    expect(tooLow.getMonth()).toBe(0);
    expect(tooHigh.getMonth()).toBe(3); // april (100 dager frem)
  });
});
```

**Step 2: Kjør testen — forvent FAIL**

```bash
cd .worktrees/kabalen-redesign && bun test src/lib/calculator/dates.test.ts 2>&1 | tail -10
```

Forventet: `clickRatioToMonth is not defined`

**Step 3: Implementer funksjonen**

Legg til eksportert funksjon i `src/lib/calculator/dates.ts` (etter `weeksBetween`):

```typescript
/**
 * Beregner startOfMonth for måneden som tilsvarer en tap-posisjon på tidslinjen
 * @param ratio - klikk-posisjon som andel av total bredde [0, 1]
 * @param leaveStart - første dag i permisjonstidslinjen
 * @param totalDays - totalt antall dager i tidslinjen
 */
export function clickRatioToMonth(ratio: number, leaveStart: Date, totalDays: number): Date {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const targetDate = addDays(leaveStart, Math.round(clampedRatio * totalDays));
  return startOfMonth(targetDate);
}
```

Sjekk at `addDays` og `startOfMonth` er importert fra `date-fns` øverst i filen. Dersom de mangler, legg dem til i den eksisterende importlinjen.

**Step 4: Kjør testen — forvent PASS**

```bash
bun test src/lib/calculator/dates.test.ts 2>&1 | tail -10
```

Forventet: alle tester grønne.

**Step 5: Commit**

```bash
git add src/lib/calculator/dates.ts src/lib/calculator/dates.test.ts
git commit -m "feat: legg til clickRatioToMonth-hjelpefunksjon for tap-navigasjon"
```

---

## Task 2: Opprett `LeaveHorizonLine.tsx`

Ren orienteringslinje uten tekst. Tap-navigasjon via `clickRatioToMonth`. Månedsbadge erstatter 2px-markøren.

**Files:**
- Create: `src/components/planner/LeaveHorizonLine.tsx`

**Step 1: Opprett komponenten**

```tsx
'use client';

import { useMemo } from 'react';
import { differenceInDays, format, startOfMonth } from 'date-fns';
import { nb } from 'date-fns/locale';
import { clickRatioToMonth } from '@/lib/calculator/dates';
import type { LeaveResult } from '@/lib/types';

interface LeaveHorizonLineProps {
  leaveResult: LeaveResult;
  activeMonth: Date;
  daycareEnabled: boolean;
  daycareDate: Date | null;
  onMonthChange: (month: Date) => void;
}

export function LeaveHorizonLine({
  leaveResult,
  activeMonth,
  daycareEnabled,
  daycareDate,
  onMonthChange,
}: LeaveHorizonLineProps) {
  const leaveStart = leaveResult.mother.start;
  const leaveEnd = leaveResult.father.end;
  const gapEnd = daycareEnabled && daycareDate ? daycareDate : leaveEnd;

  const { motherPercent, fatherPercent, gapPercent, currentPercent, totalDays } = useMemo(() => {
    const total = Math.max(1, differenceInDays(gapEnd, leaveStart));
    const motherDays = Math.max(0, differenceInDays(leaveResult.mother.end, leaveStart));
    const fatherDays = Math.max(0, differenceInDays(leaveEnd, leaveResult.mother.end));
    const gapDays = Math.max(0, differenceInDays(gapEnd, leaveEnd));
    const activeStart = startOfMonth(activeMonth);
    const currentDays = Math.max(0, Math.min(total, differenceInDays(activeStart, leaveStart)));
    return {
      motherPercent: Math.max(0, Math.min(100, (motherDays / total) * 100)),
      fatherPercent: Math.max(0, Math.min(100, (fatherDays / total) * 100)),
      gapPercent: Math.max(0, Math.min(100, (gapDays / total) * 100)),
      currentPercent: Math.max(0, Math.min(100, (currentDays / total) * 100)),
      totalDays: total,
    };
  }, [leaveStart, leaveResult.mother.end, leaveEnd, gapEnd, activeMonth]);

  const monthLabel = format(activeMonth, 'MMM', { locale: nb }).toUpperCase();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onMonthChange(clickRatioToMonth(ratio, leaveStart, totalDays));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = new Date(activeMonth);
      next.setMonth(next.getMonth() + 1);
      onMonthChange(startOfMonth(next));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = new Date(activeMonth);
      prev.setMonth(prev.getMonth() - 1);
      onMonthChange(startOfMonth(prev));
    }
  };

  return (
    // py-4 gir plass til badge over og under linjen, min-h sikrer 44px touch-target (WCAG)
    <div
      role="slider"
      tabIndex={0}
      aria-label="Naviger i permisjonstidslinjen"
      aria-valuetext={format(activeMonth, 'MMMM yyyy', { locale: nb })}
      className="relative py-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded select-none"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Farget linje */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted flex">
        {motherPercent > 0 && (
          <div className="h-full bg-mother-base" style={{ width: `${motherPercent}%` }} />
        )}
        {fatherPercent > 0 && (
          <div className="h-full bg-father-base" style={{ width: `${fatherPercent}%` }} />
        )}
        {gapPercent > 0 && (
          <div
            className="h-full bg-gap border border-dashed border-gap-border"
            style={{ width: `${gapPercent}%` }}
          />
        )}
      </div>

      {/* Månedsbadge — plassert under linjen, sentrert på markørpunktet */}
      <div
        className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        style={{ left: `${currentPercent}%` }}
      >
        <div className="w-px h-2 bg-foreground/60" />
        <div className="bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5 rounded-sm leading-tight whitespace-nowrap">
          {monthLabel}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Bygg for å verifisere TypeScript**

```bash
bun run build 2>&1 | tail -15
```

Forventet: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add src/components/planner/LeaveHorizonLine.tsx
git commit -m "feat: opprett LeaveHorizonLine med tap-navigasjon og månedsbadge"
```

---

## Task 3: Opprett `PlanStatusBar.tsx`

Eier all gap- og sammendragskommunikasjon. Kombinerer eksisterende gap-logikk fra `StatsBar` med ny kompakt sammendragsrad.

**Files:**
- Create: `src/components/planner/PlanStatusBar.tsx`

**Step 1: Opprett komponenten**

Kopier gap-beregningslogikken direkte fra `StatsBar.tsx` (den er allerede korrekt med `workDays`-fix), legg til sammendragsraden:

```tsx
'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlossaryTerm } from '@/components/ui/glossary-term';
import type { LeaveResult, CustomPeriod } from '@/lib/types';

interface PlanStatusBarProps {
  leaveResult: LeaveResult;
  customPeriods: CustomPeriod[];
  daycareEnabled: boolean;
  daycareDate: Date | null;
}

export function PlanStatusBar({
  leaveResult,
  customPeriods,
  daycareEnabled,
  daycareDate,
}: PlanStatusBarProps) {
  const gapInfo = useMemo(() => {
    if (!daycareEnabled || !daycareDate) return null;

    const gapDays = leaveResult.gap.workDays;
    const gapStart = leaveResult.gap.start;
    const gapEnd = leaveResult.gap.end;

    const gapPeriods = customPeriods.filter(
      (p) =>
        (p.type === 'ferie' || p.type === 'ulonnet' || p.type === 'annet') &&
        p.startDate < gapEnd &&
        p.endDate > gapStart
    );

    const coveredDays = gapPeriods.reduce((sum, p) => {
      const overlapStart = p.startDate > gapStart ? p.startDate : gapStart;
      const overlapEnd = p.endDate < gapEnd ? p.endDate : gapEnd;
      let count = 0;
      const cur = new Date(overlapStart);
      while (cur < overlapEnd) {
        const day = cur.getDay();
        if (day >= 1 && day <= 5) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return sum + count;
    }, 0);

    const remainingDays = Math.max(0, gapDays - coveredDays);
    const remainingWeeks = Math.floor(remainingDays / 7);
    const extraDays = remainingDays % 7;

    return {
      totalDays: gapDays,
      coveredDays,
      remainingDays,
      remainingWeeks,
      extraDays,
      isCovered: remainingDays === 0,
    };
  }, [daycareEnabled, daycareDate, leaveResult.gap, customPeriods]);

  // Ikke vis noe hvis barnehage ikke er aktivert
  if (!daycareEnabled || !daycareDate) return null;

  return (
    <div className="space-y-1.5">
      {/* Gap-status — vises kun hvis det faktisk finnes et gap (workDays > 0) */}
      {gapInfo && gapInfo.totalDays > 0 && (
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg text-sm',
            gapInfo.isCovered
              ? 'bg-success-bg text-success-fg'
              : 'bg-warning-bg text-warning-fg'
          )}
        >
          {gapInfo.isCovered ? (
            <>
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                <GlossaryTerm term="gap">Gap</GlossaryTerm> dekket med ferie/permisjon
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {gapInfo.remainingWeeks > 0
                  ? `${gapInfo.remainingWeeks} uker${gapInfo.extraDays > 0 ? ` ${gapInfo.extraDays} dager` : ''}`
                  : `${gapInfo.remainingDays} dager`}
                {' '}udekket <GlossaryTerm term="gap">gap</GlossaryTerm>
                {gapInfo.coveredDays > 0 && ` (${gapInfo.coveredDays} dager dekket)`}
              </span>
            </>
          )}
        </div>
      )}

      {/* Kompakt sammendragsrad */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
        <span style={{ color: 'var(--color-mother)' }} className="font-medium">
          Mor {leaveResult.mother.weeks}uk
        </span>
        <span>│</span>
        <span style={{ color: 'var(--color-father)' }} className="font-medium">
          Far {leaveResult.father.weeks}uk
        </span>
        <span>│</span>
        <span>Bhg {format(daycareDate, 'd. MMM', { locale: nb })}</span>
      </div>
    </div>
  );
}
```

**Step 2: Bygg for å verifisere TypeScript**

```bash
bun run build 2>&1 | tail -15
```

Forventet: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add src/components/planner/PlanStatusBar.tsx
git commit -m "feat: opprett PlanStatusBar med gap-status og sammendragsrad"
```

---

## Task 4: Oppdater `PlannerCalendar.tsx`

Bytt ut de to gamle komponentene med de to nye. Fjern StatsBar fra bunnen.

**Files:**
- Modify: `src/components/planner/PlannerCalendar.tsx`

**Step 1: Oppdater imports**

Finn og erstatt:
```tsx
import { StatsBar } from './StatsBar';
import { LeaveHorizonBanner } from './LeaveHorizonBanner';
```

Med:
```tsx
import { PlanStatusBar } from './PlanStatusBar';
import { LeaveHorizonLine } from './LeaveHorizonLine';
```

**Step 2: Erstatt `<LeaveHorizonBanner>` med de to nye komponentene**

Finn blokken (ca. linje 210–216):
```tsx
<LeaveHorizonBanner
  leaveResult={leaveResult}
  activeMonth={activeMonth}
  daycareEnabled={daycareEnabled}
  daycareDate={daycareEnabled ? daycareStartDate ?? null : null}
/>
```

Erstatt med:
```tsx
<PlanStatusBar
  leaveResult={leaveResult}
  customPeriods={periods}
  daycareEnabled={daycareEnabled}
  daycareDate={daycareEnabled ? daycareStartDate ?? null : null}
/>
<LeaveHorizonLine
  leaveResult={leaveResult}
  activeMonth={activeMonth}
  daycareEnabled={daycareEnabled}
  daycareDate={daycareEnabled ? daycareStartDate ?? null : null}
  onMonthChange={setActiveMonthWithDirection}
/>
```

**Step 3: Fjern `<StatsBar>` fra bunnen**

Finn blokken (ca. linje 325–330):
```tsx
{/* Gap indicator */}
<StatsBar
  leaveResult={leaveResult}
  customPeriods={periods}
  daycareEnabled={daycareEnabled}
  daycareDate={daycareStartDate}
/>
```

Slett hele blokken inkludert kommentaren.

**Step 4: Bygg og verifiser**

```bash
bun run build 2>&1 | tail -20
```

Forventet: `✓ Compiled successfully` og ingen TypeScript-feil.

**Step 5: Kjør tester**

```bash
bun test 2>&1 | tail -10
```

Forventet: 97 pass, 2 fail (de pre-eksisterende Playwright-feilene — ikke relatert til våre endringer).

**Step 6: Commit**

```bash
git add src/components/planner/PlannerCalendar.tsx
git commit -m "feat: integrer PlanStatusBar og LeaveHorizonLine i PlannerCalendar"
```

---

## Task 5: Slett gamle filer og oppdater CHANGELOG

**Files:**
- Delete: `src/components/planner/LeaveHorizonBanner.tsx`
- Delete: `src/components/planner/StatsBar.tsx`
- Modify: `CHANGELOG.md`

**Step 1: Slett de gamle filene**

```bash
git rm src/components/planner/LeaveHorizonBanner.tsx
git rm src/components/planner/StatsBar.tsx
```

**Step 2: Bygg på nytt for å bekrefte ingen gjenværende imports**

```bash
bun run build 2>&1 | grep -i "error\|cannot find" | head -10
```

Forventet: ingen output (ingen feil).

**Step 3: Oppdater `CHANGELOG.md`**

Finn eksisterende `## 2026-02-26`-heading og legg til ny seksjon under:

```markdown
### Kalender-topprad redesign
Erstattet den tidlige horisontlinjen og gap-baren med to tydeligere komponenter: én som viser status (gap dekket/udekket + Mor/Far/Bhg-sammendrag) og én ren orienteringslinje du kan trykke på for å hoppe direkte til en måned i kalenderen.
```

**Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "chore: slett LeaveHorizonBanner og StatsBar, oppdater CHANGELOG"
```

# LeaveHorizonLine — Ruler med månedsinndeling og aktiv-felt

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Erstatt den tomme fargelinjen med en tidslinje som har synlig månedsinndeling, en ruler-rad med etiketter, og aktiv måned som et fremhevet felt (ikke en enkelt strek).

**Architecture:** To nye rene funksjoner i `dates.ts` (`getTimelineGranularity` + `buildTimelineSegments`) beregner segmentene én gang i en `useMemo`; `LeaveHorizonLine.tsx` rendrer en ruler-rad over den fargede linjen. Aktiv måned vises som et `bg-foreground/8`-rektangel med `border-l-2 border-r-2` ved segmentets kant. Granulariteten bytter automatisk: måneder (≤14 mnd) → kvartaler (15–24 mnd) → halvår (>24 mnd).

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, date-fns v4, `bun test`, `bun run build`

---

## Kontekst for implementøren

### Relevante filer

- **`src/components/planner/LeaveHorizonLine.tsx`** — komponenten som skal endres. Les den ferdig før du starter Task 3. Den er 108 linjer og bruker `date-fns` direkte (`differenceInDays`, `format`, `startOfMonth`).
- **`src/lib/calculator/dates.ts`** — hit legges Task 1 og Task 2. Filen bruker **egne** hjelpefunksjoner (`daysBetween`, intern `startOfMonth`, `addDays`), ikke `date-fns` direkte. Importer ingenting nytt fra `date-fns` inn i denne filen.
- **`src/lib/calculator/dates.test.ts`** — her legges testene for Tasks 1 og 2. Ser på eksisterende tester for å forstå mønsteret (`describe` + `it`/`test`, `bun:test`-imports).

### Viktig domenekontekst

`LeaveHorizonLine` viser hele permisjonsperioden som én horisontal linje:
- **Rosa** = mor (`leaveResult.mother.start` → `leaveResult.mother.end`)
- **Blå** = far (`leaveResult.mother.end` → `leaveResult.father.end`)
- **Oransj stiplet** = gap (`leaveResult.father.end` → `daycareDate`, kun hvis `daycareEnabled`)

Tidslinjestart = `leaveResult.mother.start`, slutt = `daycareDate` (eller `leaveResult.father.end` hvis ingen barnehage).

Typiske varigheter:
- **Kort** (100%, lite far, lite gap): ~9 måneder
- **Typisk**: 12–18 måneder
- **Lang** (ulønnet, sen barnehage): 24–30 måneder

---

## Task 1: `getTimelineGranularity` + `TimelineGranularity`-type

**Files:**
- Modify: `src/lib/calculator/dates.ts`
- Modify: `src/lib/calculator/dates.test.ts`

### Step 1: Skriv de feilvise testene

Legg til nederst i `src/lib/calculator/dates.test.ts` (etter siste `describe`-blokk):

```typescript
// ============================================================
// getTimelineGranularity
// ============================================================
import { getTimelineGranularity } from './dates';

describe('getTimelineGranularity', () => {
  it('returnerer month for 1 måned', () => {
    expect(getTimelineGranularity(1)).toBe('month');
  });

  it('returnerer month for 14 måneder (grensen)', () => {
    expect(getTimelineGranularity(14)).toBe('month');
  });

  it('returnerer quarter for 15 måneder (over grensen)', () => {
    expect(getTimelineGranularity(15)).toBe('quarter');
  });

  it('returnerer quarter for 24 måneder (grensen)', () => {
    expect(getTimelineGranularity(24)).toBe('quarter');
  });

  it('returnerer half-year for 25 måneder (over grensen)', () => {
    expect(getTimelineGranularity(25)).toBe('half-year');
  });

  it('returnerer half-year for 30 måneder', () => {
    expect(getTimelineGranularity(30)).toBe('half-year');
  });
});
```

Legg til `getTimelineGranularity` i import-linjen øverst i testfilen (der `clickRatioToMonth` allerede er importert).

### Step 2: Kjør testene — forvent FAIL

```bash
cd /Users/svedanie/kongebra/permisjonsokonomi-kalkulator/.worktrees/kabalen-redesign && bun test src/lib/calculator/dates.test.ts 2>&1 | tail -15
```

Forventet feil: `getTimelineGranularity is not a function` eller lignende.

### Step 3: Implementer i `dates.ts`

Legg til etter `clickRatioToMonth`-funksjonen (bunnen av filen):

```typescript
/**
 * Kalender-typer for tidslinjevisning
 */
export type TimelineGranularity = 'month' | 'quarter' | 'half-year';

/**
 * Bestemmer granularitet for tidslinjeruler basert på antall måneder i tidslinjen.
 * - ≤14 måneder → month (viser individuelle måneder)
 * - 15–24 måneder → quarter (viser kvartaler Q1–Q4)
 * - >24 måneder → half-year (viser halvår H1/H2)
 */
export function getTimelineGranularity(totalMonths: number): TimelineGranularity {
  if (totalMonths <= 14) return 'month';
  if (totalMonths <= 24) return 'quarter';
  return 'half-year';
}
```

### Step 4: Kjør testene — forvent PASS

```bash
bun test src/lib/calculator/dates.test.ts 2>&1 | tail -10
```

Forventet: alle `getTimelineGranularity`-tester grønne.

### Step 5: Commit

```bash
cd /Users/svedanie/kongebra/permisjonsokonomi-kalkulator/.worktrees/kabalen-redesign && git add src/lib/calculator/dates.ts src/lib/calculator/dates.test.ts && git commit -m "feat: legg til getTimelineGranularity for adaptiv ruler-granularitet"
```

---

## Task 2: `buildTimelineSegments` + `TimelineSegment`-type

**Files:**
- Modify: `src/lib/calculator/dates.ts`
- Modify: `src/lib/calculator/dates.test.ts`

### Bakgrunn

Funksjonen beregner en liste med segment-objekter for ruler-raden i `LeaveHorizonLine`. Hvert segment har en posisjon (prosent fra venstre), en bredde (prosent) og en etikett ("J", "Q1", "H1 '26" osv.).

Granulariteten styrer hvilke måneder som er segmentgrenser:
- `month` → alle månedsskifter
- `quarter` → januar, april, juli, oktober
- `half-year` → januar, juli

**Etikettformat:**
- `month`: enkeltbokstav ("J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"), men januar viser alltid årstall: `"J '26"`
- `quarter`: "Q1", "Q2", "Q3", "Q4", men Q1 viser alltid årstall: `"Q1 '26"`
- `half-year`: "H1" og "H2", men H1 viser alltid årstall: `"H1 '26"`

### Step 1: Skriv de feilvise testene

Legg til i `dates.test.ts` (etter `getTimelineGranularity`-testen):

```typescript
// ============================================================
// buildTimelineSegments
// ============================================================
import { buildTimelineSegments } from './dates';

describe('buildTimelineSegments', () => {
  describe('month-granularitet', () => {
    it('returnerer 3 segmenter for jan–mar 2026', () => {
      const start = new Date(2026, 0, 1); // 1. jan
      const end = new Date(2026, 3, 1);   // 1. apr (eksklusiv slutt)
      const segs = buildTimelineSegments(start, end, 'month');
      expect(segs).toHaveLength(3);
    });

    it('første segment starter på 0%', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 3, 1);
      const segs = buildTimelineSegments(start, end, 'month');
      expect(segs[0].leftPercent).toBeCloseTo(0, 1);
    });

    it('widthPercent summerer til ~100', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 6, 1); // 6 måneder
      const segs = buildTimelineSegments(start, end, 'month');
      const total = segs.reduce((s, seg) => s + seg.widthPercent, 0);
      expect(total).toBeCloseTo(100, 0);
    });

    it('januar-etikett inneholder årstall', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 3, 1);
      const segs = buildTimelineSegments(start, end, 'month');
      expect(segs[0].label).toBe("J '26");
    });

    it('andre månedsnavnet er F', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 3, 1);
      const segs = buildTimelineSegments(start, end, 'month');
      expect(segs[1].label).toBe('F');
    });

    it('start-dato settes korrekt på hvert segment', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 3, 1);
      const segs = buildTimelineSegments(start, end, 'month');
      expect(segs[0].start.getMonth()).toBe(0); // januar
      expect(segs[1].start.getMonth()).toBe(1); // februar
      expect(segs[2].start.getMonth()).toBe(2); // mars
    });
  });

  describe('quarter-granularitet', () => {
    it('returnerer 4 segmenter for ett kalenderår', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2027, 0, 1);
      const segs = buildTimelineSegments(start, end, 'quarter');
      expect(segs).toHaveLength(4);
    });

    it('Q1 viser årstall, Q2–Q4 gjør ikke det', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2027, 0, 1);
      const segs = buildTimelineSegments(start, end, 'quarter');
      expect(segs[0].label).toBe("Q1 '26");
      expect(segs[1].label).toBe('Q2');
      expect(segs[2].label).toBe('Q3');
      expect(segs[3].label).toBe('Q4');
    });
  });

  describe('half-year-granularitet', () => {
    it('returnerer korrekte halvårssegmenter', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2027, 6, 1); // H1 '26, H2 '26, H1 '27
      const segs = buildTimelineSegments(start, end, 'half-year');
      expect(segs).toHaveLength(3);
      expect(segs[0].label).toBe("H1 '26");
      expect(segs[1].label).toBe('H2');
      expect(segs[2].label).toBe("H1 '27");
    });
  });
});
```

Legg til `buildTimelineSegments` i import-linjen øverst i testfilen.

### Step 2: Kjør testene — forvent FAIL

```bash
bun test src/lib/calculator/dates.test.ts 2>&1 | tail -15
```

### Step 3: Implementer i `dates.ts`

Legg til etter `getTimelineGranularity` (og `TimelineGranularity`-typen):

```typescript
/**
 * Et segment i tidslinjeruler-raden
 */
export interface TimelineSegment {
  start: Date;       // Segmentets startdato (brukes for active-check i komponenten)
  leftPercent: number;  // Avstand fra venstre kant i prosent [0–100]
  widthPercent: number; // Segmentets bredde i prosent
  label: string;        // Vises i ruler-raden ("J '26", "Q2", "H1 '25")
}

// Norske månedsinitaler, indeks 0 = januar
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

// Bestemmer etiketten for et ruler-segment
function formatSegmentLabel(date: Date, granularity: TimelineGranularity): string {
  const month = date.getMonth();
  const shortYear = `'${String(date.getFullYear()).slice(2)}`;

  if (granularity === 'month') {
    return month === 0 ? `J ${shortYear}` : MONTH_INITIALS[month];
  }
  if (granularity === 'quarter') {
    const quarter = Math.floor(month / 3) + 1;
    return quarter === 1 ? `Q1 ${shortYear}` : `Q${quarter}`;
  }
  // half-year
  return month === 0 ? `H1 ${shortYear}` : 'H2';
}

/**
 * Bygger liste med segment-objekter for tidslinjeruler basert på granularitet.
 * Brukes av LeaveHorizonLine til å tegne måneds-/kvartal-/halvårsinndeling.
 *
 * @param leaveStart - Første dag i tidslinjen
 * @param timelineEnd - Siste dag i tidslinjen (eksklusiv)
 * @param granularity - Inndelingstype fra getTimelineGranularity
 */
export function buildTimelineSegments(
  leaveStart: Date,
  timelineEnd: Date,
  granularity: TimelineGranularity
): TimelineSegment[] {
  const totalDays = Math.max(1, daysBetween(leaveStart, timelineEnd));

  // Finn alle måneder fra startOfMonth(leaveStart) til og med timelineEnd
  const boundaries: Date[] = [];
  const cur = startOfMonth(leaveStart);
  while (cur <= timelineEnd) {
    const month = cur.getMonth();
    const shouldInclude =
      granularity === 'month' ||
      (granularity === 'quarter' && [0, 3, 6, 9].includes(month)) ||
      (granularity === 'half-year' && [0, 6].includes(month));

    if (shouldInclude) {
      boundaries.push(new Date(cur));
    }
    // Gå til neste måned
    cur.setMonth(cur.getMonth() + 1);
  }

  // Bygg segmenter mellom par av grenser
  return boundaries.map((segStart, i) => {
    const segEnd = boundaries[i + 1] ?? timelineEnd;
    const leftDays = Math.max(0, daysBetween(leaveStart, segStart));
    const widthDays = daysBetween(segStart, segEnd);

    return {
      start: segStart,
      leftPercent: (leftDays / totalDays) * 100,
      widthPercent: Math.min(100, (widthDays / totalDays) * 100),
      label: formatSegmentLabel(segStart, granularity),
    };
  });
}
```

**Merk:** `startOfMonth` og `daysBetween` er allerede definert i filen — bruk dem direkte, ikke importer fra date-fns.

### Step 4: Kjør testene — forvent PASS

```bash
bun test src/lib/calculator/dates.test.ts 2>&1 | tail -15
```

Forventet: alle tester grønne (inkl. eksisterende 42 tester).

### Step 5: Commit

```bash
git add src/lib/calculator/dates.ts src/lib/calculator/dates.test.ts && git commit -m "feat: legg til buildTimelineSegments for ruler-inndeling i tidslinjen"
```

---

## Task 3: Redesign `LeaveHorizonLine.tsx`

**Files:**
- Modify: `src/components/planner/LeaveHorizonLine.tsx`

### Mål

Erstatt den eksisterende enkle linjen + pill-badge med:
1. **Ruler-rad** (over linjen): etiketter sentrert i hvert segment, tynne tikkmerker ved segmentgrenser
2. **Farget linje** (uendret logikk): rosa/blå/oransj
3. **Aktiv-måneds-felt**: et halvtransparent rektangel med to border-streker som spenner aktiv måneds bredde over både ruler og linje

### Ny komponentstruktur (fullstendig erstatning av filen)

Erstatt hele innholdet i `src/components/planner/LeaveHorizonLine.tsx` med:

```tsx
'use client';

import { useMemo } from 'react';
import { differenceInDays, format, startOfMonth } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  clickRatioToMonth,
  getTimelineGranularity,
  buildTimelineSegments,
} from '@/lib/calculator/dates';
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

  const {
    motherPercent,
    fatherPercent,
    gapPercent,
    currentPercent,
    activeMonthEndPercent,
    totalDays,
    segments,
  } = useMemo(() => {
    const total = Math.max(1, differenceInDays(gapEnd, leaveStart));
    const motherDays = Math.max(0, differenceInDays(leaveResult.mother.end, leaveStart));
    const fatherDays = Math.max(0, differenceInDays(leaveEnd, leaveResult.mother.end));
    const gapDays = Math.max(0, differenceInDays(gapEnd, leaveEnd));

    // Aktiv måneds startposisjon
    const activeStart = startOfMonth(activeMonth);
    const currentDays = Math.max(0, Math.min(total, differenceInDays(activeStart, leaveStart)));

    // Aktiv måneds sluttposisjon (start av neste måned)
    const nextMonthStart = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1);
    const activeEndDays = Math.max(0, Math.min(total, differenceInDays(nextMonthStart, leaveStart)));

    // Antall måneder for granularitetsberegning
    const totalMonths =
      (gapEnd.getFullYear() - leaveStart.getFullYear()) * 12 +
      (gapEnd.getMonth() - leaveStart.getMonth()) + 1;

    const granularity = getTimelineGranularity(totalMonths);
    const segs = buildTimelineSegments(leaveStart, gapEnd, granularity);

    return {
      motherPercent: Math.max(0, Math.min(100, (motherDays / total) * 100)),
      fatherPercent: Math.max(0, Math.min(100, (fatherDays / total) * 100)),
      gapPercent: Math.max(0, Math.min(100, (gapDays / total) * 100)),
      currentPercent: Math.max(0, Math.min(100, (currentDays / total) * 100)),
      activeMonthEndPercent: Math.max(0, Math.min(100, (activeEndDays / total) * 100)),
      totalDays: total,
      segments: segs,
    };
  }, [leaveStart, leaveResult.mother.end, leaveEnd, gapEnd, activeMonth]);

  const activeMonthWidthPercent = activeMonthEndPercent - currentPercent;

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
    // min-h-[44px] sikrer WCAG touch-target
    <div
      role="slider"
      tabIndex={0}
      aria-label="Naviger i permisjonstidslinjen"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(currentPercent)}
      aria-valuetext={format(activeMonth, 'MMMM yyyy', { locale: nb })}
      className="relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded select-none"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Aktiv måneds fremhevede felt — strekker seg over ruler og linje */}
      {activeMonthWidthPercent > 0 && (
        <div
          className="absolute inset-y-0 bg-foreground/8 border-l-2 border-r-2 border-foreground/30 rounded-sm pointer-events-none z-10"
          style={{
            left: `${currentPercent}%`,
            width: `${activeMonthWidthPercent}%`,
          }}
        />
      )}

      {/* Ruler-rad med tikkmerker og etiketter */}
      <div className="relative h-5 mb-0.5">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{ left: `${seg.leftPercent}%`, width: `${seg.widthPercent}%` }}
          >
            {/* Tikkemerk ved segment-start */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-foreground/20" />
            {/* Etikett sentrert i segmentet */}
            <span className="absolute inset-0 flex items-center justify-center text-[9px] text-muted-foreground leading-none select-none">
              {seg.label}
            </span>
          </div>
        ))}
        {/* Avsluttende tikkemerk */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-foreground/20" />
      </div>

      {/* Farget linje */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted flex mb-2">
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
    </div>
  );
}
```

### Step 2: Bygg og verifiser

```bash
cd /Users/svedanie/kongebra/permisjonsokonomi-kalkulator/.worktrees/kabalen-redesign && bun run build 2>&1 | tail -15
```

Forventet: `✓ Compiled successfully`, ingen TypeScript-feil.

Vanlige feil:
- `getTimelineGranularity is not exported` → sjekk at `export` er lagt til riktig i `dates.ts`
- `buildTimelineSegments is not exported` → samme
- `TimelineSegment` type-feil → sjekk at `buildTimelineSegments` returnerer `TimelineSegment[]` og at typen er eksportert

### Step 3: Kjør tester

```bash
bun test 2>&1 | tail -10
```

Forventet: alle eksisterende tester grønne (101 pass + de nye). Ignorer de 2 pre-eksisterende Playwright-feilene.

### Step 4: Commit

```bash
git add src/components/planner/LeaveHorizonLine.tsx && git commit -m "feat: redesign LeaveHorizonLine med ruler, månedsinndeling og aktiv-måneds-felt"
```

---

## Task 4: Oppdater CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

### Step 1: Les og oppdater CHANGELOG

Finn eksisterende `## 2026-02-26`-heading og legg til ny seksjon under eksisterende entries:

```markdown
### Tidslinje med månedsinndeling
Permisjonstidslinjen øverst i kalenderen viser nå måneder med etiketter og synlige skiller. Den aktive måneden er fremhevet som et felt — ikke en enkel strek. Ved lange permisjoner (over 2 år) byttes automatisk til kvartal- eller halvårsinndeling for å unngå rot.
```

### Step 2: Commit

```bash
git add CHANGELOG.md && git commit -m "chore: oppdater CHANGELOG med ruler-redesign"
```

---

## Verifisering etter alle tasks

```bash
cd /Users/svedanie/kongebra/permisjonsokonomi-kalkulator/.worktrees/kabalen-redesign && bun test 2>&1 | tail -5 && bun run build 2>&1 | tail -5
```

Forventet:
- Alle tester grønne (Playwright-feil ignoreres)
- `✓ Compiled successfully`

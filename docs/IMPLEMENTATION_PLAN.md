# Permisjonsøkonomi-kalkulator: Implementeringsplan

> **ARKIVERT:** Dette er den opprinnelige implementeringsplanen fra prosjektoppstart. Arkitekturen har utviklet seg betydelig — se `PROGRESS.md` for nåværende status og `CLAUDE.md` for gjeldende arkitektur. Beholdt for historisk referanse.

## Sammendrag

Bygge en **samlet permisjons- og økonomikalkulator** for norske foreldre med:
- Datokalkulator (termindato → permisjonsperioder)
- Fleksibel fordeling via sliders (felleskvote + overlapp)
- Interaktiv Gantt-tidslinje med klikkbar ferie
- Valgfri økonomisk sammenligning (80% vs 100%)

---

## Fase 1: Prosjektoppsett

### 1.1 Installer shadcn/ui
```bash
bunx shadcn@latest init
```
Konfigurer:
- Style: Default
- Base color: Neutral
- CSS variables: Yes
- Tailwind CSS: Yes (v4 kompatibel)

### 1.2 Installer shadcn-komponenter
```bash
bunx shadcn@latest add button input label slider toggle card tooltip date-picker collapsible tabs
```

### 1.3 Installer Recharts for grafer
```bash
bun add recharts
```

### 1.4 Oppdater metadata i layout.tsx
- Endre `lang="en"` → `lang="no"`
- Oppdater title og description

---

## Fase 2: Konstantfiler og typer

### 2.1 Opprett `src/lib/constants.ts`
```typescript
export const G = 124_028; // Grunnbeløpet (oppdater årlig)
export const WORK_DAYS_PER_MONTH = 21.7;

export const LEAVE_CONFIG = {
  100: { total: 49, mother: 15, father: 15, shared: 16, preBirth: 3 },
  80: { total: 59, mother: 19, father: 19, shared: 18, preBirth: 3 },
} as const;
```

### 2.2 Opprett `src/lib/types.ts`
```typescript
export type Coverage = 100 | 80;
export type ParentRights = 'both' | 'mother-only' | 'father-only';
export type Parent = 'mother' | 'father';

export interface ParentEconomy {
  monthlySalary: number;
  monthlyCommissionLoss: number;
  employerCoversAbove6G: boolean;
  employerPaysFeriepenger: boolean; // "Får du feriepenger fra arbeidsgiver som om du var i jobb?"
}

export interface CalculatorInput {
  dueDate: Date;
  coverage: Coverage;
  rights: ParentRights;
  sharedWeeksToMother: number; // 0-16 eller 0-18, default: halvparten
  overlapWeeks: number;
  daycareStartDate: Date;
  motherEconomy?: ParentEconomy;
  fatherEconomy?: ParentEconomy;
  vacationWeeks: { parent: Parent; weekIndex: number }[];
}

// For Gantt-visualisering - hvert segment kan fargelegges separat
export interface LeaveSegment {
  parent: Parent;
  type: 'mandatory' | 'shared' | 'overlap' | 'vacation' | 'unpaid';
  start: Date;
  end: Date;
  weeks: number;
}

export interface LeaveResult {
  segments: LeaveSegment[]; // For Gantt-visualisering
  mother: { start: Date; end: Date; weeks: number };
  father: { start: Date; end: Date; weeks: number };
  overlap: { start: Date; end: Date; weeks: number } | null;
  gap: { start: Date; end: Date; weeks: number; days: number };
  totalCalendarWeeks: number; // Overlapp forkorter total kalendertid
  vacationDaysNeeded: { mother: number; father: number };
}

export interface EconomyResult {
  scenario80: { total: number; breakdown: EconomyBreakdown };
  scenario100: { total: number; breakdown: EconomyBreakdown };
  difference: number;
  recommendation: string;
}

export interface EconomyBreakdown {
  navPayout: number;
  commissionLoss: number;
  gapCost: number; // Beregnes ut fra hvem som tar gapet (dagsats)
  gapTakenBy: Parent | null;
  feriepengeDifference: number;
}
```

---

## Fase 3: Beregningsmotor

### 3.1 Opprett `src/lib/calculator/dates.ts`
Funksjoner:
- `calculateLeaveStart(dueDate)` - Termindato minus 3 uker
- `calculateMotherPeriod(start, coverage, sharedWeeks)` - Mors perioder (inkl. 6 uker obligatorisk etter fødsel)
- `calculateFatherPeriod(motherEnd, coverage, sharedWeeks, overlapWeeks)` - Fars periode
  - **NB:** Overlapp *forkorter* total kalendertid. Hvis overlapWeeks > 0, starter far tidligere.
  - Standard: Sekvensielt (far starter når mor slutter). Med overlapp: Parallelt.
- `calculateGap(lastLeaveEnd, daycareStart)` - Antall uker/dager i gap
- `calculateVacationDaysNeeded(gap, vacationWeeks)` - Feriedager per forelder
- `buildLeaveSegments(...)` - Returnerer array av `LeaveSegment` for Gantt-visualisering

### 3.2 Opprett `src/lib/calculator/economy.ts`
Funksjoner:
- `calculateBasis(salary, employerCoversAbove6G)` - min(lønn, 6G) eller full
- `calculate80Scenario(input)` - Total ved 80%
- `calculate100Scenario(input)` - Total ved 100% + gap
- `calculateFeriepengeDifference(salary, navWeeks, employerPays)` - År 2 differanse
- `compareScenarios(input)` - Endelig sammenligning

### 3.3 Opprett `src/lib/calculator/index.ts`
- Eksporter hovedfunksjon `calculate(input): { leave: LeaveResult; economy?: EconomyResult }`

---

## Fase 4: UI-komponenter

### 4.1 Input-komponenter (`src/components/input/`)

**`DueDateInput.tsx`**
- Date picker for termindato
- Default: i dag + 9 måneder

**`RightsSelector.tsx`**
- Radio group: Begge / Kun mor / Kun far
- Tooltip med forklaring

**`CoverageToggle.tsx`**
- Toggle mellom 100% (49 uker) og 80% (59 uker)
- Vis ukeantall under hver option

**`DistributionSliders.tsx`**
- Slider 1: Felleskvote til mor (0-16/18 uker)
  - **Default:** Halvparten (8 uker ved 100%, 9 uker ved 80%)
- Slider 2: Overlapp-uker (0-X uker, maks = fars kvote)
  - **Default:** 0 uker
- Live preview av fordeling

**`EconomySection.tsx`** (collapsible)
- Ekspanderbar seksjon
- To kolonner: Mor og Far
- Felt per forelder: lønn, provisjon, 6G-toggle, feriepenge-toggle

**`DaycareInput.tsx`**
- Date picker for barnehagestart
- Default: 1. august (samme år hvis etter fødsel, ellers neste år)

### 4.2 Tidslinje-komponent (`src/components/timeline/`)

**`GanttTimeline.tsx`**
- Recharts BarChart/kompositt
- X-akse: Uker fra permisjonstart til barnehagestart
- To horisontale bars: Mor og Far
- Fargekoding:
  - Mor (lilla/rosa), Far (blå), Overlapp (gradient), Ferie (grønn), Gap (rød stiplet)

**`TimelineWeek.tsx`**
- Klikkbar ukecelle
- Hover-state og selected-state for ferie
- Tooltip med dato og status

**`VacationSummary.tsx`**
- "Feriedager mor: X (Y uker)"
- "Feriedager far: X (Y uker)"
- Advarsel hvis gap ikke dekket

### 4.3 Resultat-komponenter (`src/components/results/`)

**`DateSummary.tsx`**
- Tabell: Hvem | Startdato | Sluttdato | Uker
- Gap-rad med dager

**`EconomyComparison.tsx`**
- "Det store tallet": Netto differanse
- Breakdown: NAV-utbetaling, provisjonstap, gap-kostnad, feriepenger
- Anbefaling tekst

**`LiquidityChart.tsx`**
- Recharts LineChart
- Akkumulert inntekt over tid for begge scenarioer

---

## Fase 5: Hovedside og state

### 5.1 Opprett `src/app/page.tsx` (erstatt boilerplate)
Layout:
```
┌─────────────────────────────────────────────┐
│  Header: "Permisjonsøkonomi-kalkulator"     │
├─────────────────────────────────────────────┤
│  Tabs: [Kalkulator] [Om kalkulatoren]       │
├─────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Input-felt   │  │ Gantt-tidslinje     │  │
│  │ (venstre)    │  │ (høyre)             │  │
│  │              │  │ [klikkbar ferie]    │  │
│  │ - Termin     │  └─────────────────────┘  │
│  │ - Rettighet  │  ┌─────────────────────┐  │
│  │ - Dekning    │  │ Dato-resultat       │  │
│  │ - Sliders    │  │ (tabell)            │  │
│  │ - Barnehage  │  └─────────────────────┘  │
│  │              │                           │
│  │ [+ Økonomi]  │  ┌─────────────────────┐  │
│  │ (collapse)   │  │ Økonomisk resultat  │  │
│  │              │  │ (når ekspandert)    │  │
│  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 5.2 State management
- Bruk React `useState` for all input
- `useMemo` for beregninger (memoizer kalkulasjoner)
- Ingen global state manager trengs for MVP

---

## Fase 6: Responsivitet og polish

### 6.1 Mobile layout
- Stack input og resultat vertikalt på mobil
- Tidslinje: Horisontal scroll container, ELLER forenklet liste-visning av datoer
- Touch-vennlig ferie-klikking (større touch targets)

### 6.2 Tooltips og hjelpetekster
- "Dekning over 6G" forklaring
- "Feriepenger fra NAV vs arbeidsgiver" forklaring
- Juni-lønna/ferietrekk infoboks

### 6.3 Dark mode
- Allerede støttet via Tailwind CSS-variabler
- Verifiser kontrast på alle fargekoder

---

## Implementeringsrekkefølge

1. **Oppsett** (Fase 1): shadcn, recharts, metadata
2. **Typer & konstanter** (Fase 2): Grunnmuren
3. **Datoberegning** (Fase 3.1-3.2): Kjernefunksjonalitet
4. **Basis-UI** (Fase 4.1): Input-felter
5. **Tidslinje** (Fase 4.2): Gantt med ferie-klikk
6. **Dato-resultat** (Fase 4.3 delvis): Tabell
7. **Økonomi-beregning** (Fase 3.3): Avansert logikk
8. **Økonomi-UI** (Fase 4.3 resten): Sammenligning og graf
9. **Polish** (Fase 6): Responsivitet, tooltips

---

## Kritiske filer som opprettes

| Fil | Formål |
|-----|--------|
| `src/lib/constants.ts` | G-verdi, ukeantall |
| `src/lib/types.ts` | TypeScript interfaces |
| `src/lib/calculator/dates.ts` | Datoberegninger |
| `src/lib/calculator/economy.ts` | Økonomiberegninger |
| `src/lib/calculator/index.ts` | Hovedeksport |
| `src/components/input/*.tsx` | 6 input-komponenter |
| `src/components/timeline/*.tsx` | 3 tidslinje-komponenter |
| `src/components/results/*.tsx` | 3 resultat-komponenter |
| `src/app/page.tsx` | Hovedside (erstatter boilerplate) |

---

## Verifisering

### Manuell testing
1. Legg inn termindato, velg 100%, verifiser at datoer beregnes riktig
2. Juster felleskvote-slider, se at tidslinje oppdateres
3. Legg til overlapp, verifiser at Far starter før Mor slutter
4. Klikk på uker i gap for å markere ferie, se ferietelling
5. Ekspander økonomi, legg inn lønn, se sammenligning

### Akseptansekrav fra KRAVSPEC.md
1. **Høytlønnet med provisjon**: 78k fast + 12k provisjon viser at 100% lønner seg
2. **Gap-test**: Mai-august gap vises korrekt og trekkes fra 100%-alternativet
3. **Feriepenge-sjokk**: NAV vs arbeidsgiver viser 50k+ differanse
4. **Optimalisering**: Anbefaler at forelder med lavest dagsats tar gap

### Kjør lokalt
```bash
bun dev
# Åpne http://localhost:3000
```

---

## Avgrensninger for MVP

- Kun ett barn (ingen flerlingsstøtte)
- Ingen lagring av data (kun client-side)
- Ingen brukerkontoer eller historikk
- Grunnbeløpet (G) er hardkodet i konstanter (lett å oppdatere)

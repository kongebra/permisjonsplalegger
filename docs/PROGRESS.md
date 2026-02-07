# Prosjekt-fremgang

Sist oppdatert: 7. februar 2026

## Status: Wizard + Planlegger-kalender ferdig, polering pågår

Applikasjonen har to moduser: en 8-trinns onboarding-wizard og en interaktiv planlegger-kalender med økonomi-fane. Gammel kalkulator-side beholdt under `/gammel` for referanse.

---

## Arkitektur-oversikt

### Brukerflyt

```
/ (redirect) → /planlegger (wizard) → /planlegger/kalender (kalender + økonomi)
                                      └→ /gammel (legacy kalkulator, beholdt for referanse)
```

### State management

Zustand store med slices:
- **wizardSlice** — Wizard-steg, termindato, rettigheter, dekning, fordeling, barnehage
- **periodsSlice** — Custom perioder, undo-stack, leaveResult
- **economySlice** — Lønnsdata for begge foreldre
- **jobSettingsSlice** — Jobbtype (kontor/turnus) per forelder
- **persistenceSlice** — Lagring/lasting av plan til localStorage
- **uiSlice** — Settings-sheet, autolagring, tabs

### Lagdeling

```
src/lib/          → Ren beregningslogikk (ingen UI-avhengigheter)
src/store/        → Zustand state management
src/components/   → UI-komponenter (wizard, planner, calendar, input, results)
src/app/          → Next.js App Router sider
```

---

## Implementert

### 1. Prosjektoppsett

- [x] Next.js 16 med App Router
- [x] React 19
- [x] shadcn/ui komponenter (Calendar, Popover, Slider, Toggle, Tabs, Dialog, Select, Switch, Sheet, Toast, InfoBox, GlossaryTerm)
- [x] Recharts (installert, brukes i MonthlyIncomeOverview)
- [x] react-day-picker v9 for kalendre
- [x] date-fns v4 for datoberegninger
- [x] Zustand v5 for state management
- [x] Tailwind CSS v4 med CSS-variabler (light + dark mode)
- [x] Geist Sans + Geist Mono fonter
- [x] TypeScript med streng typing

### 2. Beregningsmotor (`src/lib/`)

| Fil | Beskrivelse | Status |
|-----|-------------|--------|
| `constants.ts` | G-verdi (130 160), ukefordeling, feriepenge-konstanter, wizard-steg | ✅ |
| `types.ts` | TypeScript interfaces for alle datastrukturer (inkl. CustomPeriod, SavedPlan) | ✅ |
| `format.ts` | `formatCurrency()` med norsk locale | ✅ |
| `holidays.ts` | Norske helligdager med Computus-algoritme og caching | ✅ |
| `utils.ts` | `cn()` helper for Tailwind | ✅ |
| `calculator/index.ts` | Hovedeksport, `calculate()`, default-beregninger | ✅ |
| `calculator/dates.ts` | Datoberegninger, perioder, gap, segmenter, validering, kvotebruk | ✅ |
| `calculator/economy.ts` | Økonomisk sammenligning 80% vs 100%, feriepenger, gap-kostnad | ✅ |
| `planner/initialize-periods.ts` | Konverterer wizard-resultat til editerbare CustomPeriod-objekter | ✅ |

### 3. Zustand Store (`src/store/`)

| Fil | Beskrivelse | Status |
|-----|-------------|--------|
| `index.ts` | Hovedstore med alle slices kombinert | ✅ |
| `hooks.ts` | Custom hooks (computed values fra store) | ✅ |
| `slices/wizardSlice.ts` | Wizard-tilstand og navigering | ✅ |
| `slices/periodsSlice.ts` | Custom perioder, undo/redo | ✅ |
| `slices/economySlice.ts` | Lønnsdata begge foreldre | ✅ |
| `slices/jobSettingsSlice.ts` | Jobbtype per forelder | ✅ |
| `slices/persistenceSlice.ts` | localStorage lagring/lasting | ✅ |
| `slices/uiSlice.ts` | UI-tilstand (settings, autolagring) | ✅ |

### 4. Wizard (`src/components/wizard/`)

8-trinns onboarding-wizard med animasjoner og touch-sveip:

| Komponent | Beskrivelse | Status |
|-----------|-------------|--------|
| `WizardContainer` | Orkestrator: animasjoner, history-API, sveip, validering | ✅ |
| `WizardProgress` | Progress-bar (mobil) / steg-indikatorer (desktop) | ✅ |
| `WelcomeIntro` | Intro-skjerm med tre info-kort | ✅ |
| `SetupLoader` | Animert laste-skjerm etter wizard-fullføring | ✅ |
| `steps/DueDateStep` | Steg 1: Termindato | ✅ |
| `steps/RightsStep` | Steg 2: Hvem har rett (begge/mor/far) | ✅ |
| `steps/CoverageStep` | Steg 3: Dekningsgrad 80%/100% | ✅ |
| `steps/DistributionStep` | Steg 4: Fordeling fellesperiode + overlapp | ✅ |
| `steps/DaycareStep` | Steg 5: Barnehagestart | ✅ |
| `steps/JobSettingsStep` | Steg 6: Jobbtype (kontor/turnus) | ✅ |
| `steps/EconomyStep` | Steg 7: Lønn og arbeidsgiverinfo | ✅ |
| `steps/SummaryStep` | Steg 8: Oppsummering med endringsmuligheter | ✅ |

### 5. Planlegger-kalender (`src/components/planner/`)

Interaktiv kalender med periode-redigering:

| Komponent | Beskrivelse | Status |
|-----------|-------------|--------|
| `PlannerCalendar` | Hovedkomponent: sveip, dag-valg, modal, låste dater | ✅ |
| `MonthView` | Måneds-render med custom perioder og bands | ✅ |
| `PeriodModal` | Opprett/rediger perioder (type, parent, datoer, farge) | ✅ |
| `AddPeriodFab` | Floating action button for nye perioder | ✅ |
| `DayDetailPanel` | Bottom-sheet med dag-detaljer | ✅ |
| `StatsBar` | Alert-bar for gap-status (dekket/udekket) | ✅ |
| `YearOverview` | Fullskjerm-årskalender | ✅ |
| `MiniMonth` | Miniature-måned med fargekodede punkter | ✅ |
| `SettingsSheet` | Side-sheet for plan-innstillinger med bekreftelsesdialog | ✅ |
| `PlannerEconomy` | Økonomi-fane med kvoteoversikt og inntektsvisning | ✅ |
| `MonthlyIncomeOverview` | Stablede barer per måned (NAV + lønn) | ✅ |
| `CalendarOnboarding` | Engangs-onboarding overlay | ✅ |
| `CalendarSkeleton` | Loading-skeleton | ✅ |
| `LeaveIndicatorCalendar` | react-day-picker med leave-indikatorer (prikker) | ✅ |
| `SaveControls` | Lagre/autolagre-kontroller | ✅ |

### 6. Delte kalender-primitiver (`src/components/calendar/`)

Gjenbrukbare kalenderbyggesteiner brukt av både CalendarTimeline og PlannerCalendar:

| Fil | Beskrivelse | Status |
|-----|-------------|--------|
| `DayCell` | Enkelt-dag celle (interaktiv og ikke-interaktiv) | ✅ |
| `MonthGrid` | 7x-ukes grid med ukedagshoder | ✅ |
| `PeriodBandRenderer` | Horisontale periode-bands over uker | ✅ |
| `CalendarLegend` | Fargekode-legende | ✅ |
| `colors.ts` | Fargedefinisjoner per periodetype | ✅ |
| `resolve-bands.ts` | Beregn bands fra segmenter/perioder per uke | ✅ |
| `resolve-day.ts` | Beregn dag-status fra segmenter | ✅ |
| `types.ts` | CalendarDayData, PeriodBandData, etc. | ✅ |

### 7. Legacy input-komponenter (`src/components/input/`)

Brukes av gammel side (`/gammel`) og delvis av wizard/planner:

| Komponent | Status | Merknad |
|-----------|--------|---------|
| `DueDateInput` | ✅ | Brukes i gammel side |
| `RightsSelector` | ✅ | Brukes i gammel side |
| `CoverageToggle` | ✅ | Brukes i gammel side |
| `DistributionSliders` | ✅ | Brukes i gammel side |
| `DaycareInput` | ✅ | Brukes i gammel side |
| `VacationInput` | ✅ | Brukes i gammel side |
| `EconomySection` | ✅ | Brukes i gammel side og SettingsSheet |
| `PeriodInput` | ✅ | Brukes i gammel side |
| `ParentPeriodSection` | ✅ | Brukes av PeriodInput |
| `AddPeriodDialog` | ✅ | Brukes av ParentPeriodSection |
| `PeriodListItem` | ✅ | Brukes av ParentPeriodSection |
| `QuotaSummary` | ✅ | Brukes av PeriodInput og PlannerEconomy |

### 8. Resultat-komponenter (`src/components/results/`)

| Komponent | Status | Merknad |
|-----------|--------|---------|
| `DateSummary` | ✅ | Tabell med start/slutt/uker |
| `EconomyComparison` | ✅ | "Det store tallet" + breakdown |

### 9. Tidslinje (`src/components/timeline/`)

| Komponent | Status | Merknad |
|-----------|--------|---------|
| `CalendarTimeline` | ✅ | Bruker delte kalender-primitiver fra `calendar/` |

---

## Viktige designbeslutninger

### Dato-håndtering

- **Internt:** Sluttdatoer er **eksklusive** (dagen ETTER siste permisjonsdag)
- **Visning:** Sluttdatoer vises **inklusivt** via `subDays(date, 1)`
- **Sammenligninger:** Bruk `isSameDay()` eller `startOfDay()` for tidspunkt-uavhengighet

### State management

- **Zustand med slices** ble valgt over React Context for:
  - Lettere å dele state mellom wizard og planner
  - Undo/redo-funksjonalitet (periodsSlice)
  - localStorage-persistering (persistenceSlice)
  - Bedre ytelse (fine-grained subscriptions med `useShallow`)

### Wizard → Planner overgang

- Wizard samler input → beregner `LeaveResult` → konverterer til `CustomPeriod[]`
- `initializePeriodsFromLeave()` mapper wizard-segmenter til editerbare perioder
- Wizard-perioder er låst (`isLocked: true`), bruker-perioder kan fritt redigeres

### localStorage-bruk

- **Planlegger bruker localStorage** for lagring/lasting av planer (`permisjonsplan-v1`)
- Dette er IKKE generell datalagring — ingen tracking, cookies, eller server-side lagring
- Bruker kan starte fersk eller fortsette fra lagret plan
- Autolagring aktiveres etter første manuelle lagring

### Barnehagestart default

```typescript
if (dueDate >= augustFirstSameYear) {
  return new Date(year + 2, 7, 1); // Født etter aug → bhg 2 år senere
}
return new Date(year + 1, 7, 1); // Født før aug → bhg 1 år senere
```

---

## Hva er gjort annerledes enn opprinnelig plan

| Planlagt | Faktisk implementert | Begrunnelse |
|----------|---------------------|-------------|
| Recharts Gantt-tidslinje | Kalender-visning med period-bands | Mer intuitivt for foreldre å se måneder/datoer |
| Recharts LiquidityChart (akkumulert linje) | MonthlyIncomeOverview (stablede barer per måned) | Enklere å forstå per-måned-inntekt |
| Klikkbare uker for ferie i Gantt | PeriodModal med datepicker-overlay | Mer fleksibelt — støtter alle periodetyper |
| React Context for state | Zustand med slices | Bedre for persistering, undo/redo, og wizard↔planner |
| En enkelt side med inputs/output | Wizard + kalender (to separate sider) | Bedre UX — guided oppsett, deretter fri redigering |
| Ingen lagring | localStorage for plan-persistering | Brukerforespørsel — folk vil ikke fylle ut alt på nytt |
| GanttTimeline + TimelineWeek + VacationSummary | CalendarTimeline + delte primitiver + StatsBar | Bedre gjenbruk mellom gammel og ny visning |

---

## Ikke implementert ennå / Gjenstående

### Fra kravspek (KRAVSPEC.md)

1. **Likviditetsgraf** — Akkumulert inntekt over tid som linjediagram (80% vs 100%). MonthlyIncomeOverview viser per-måned, men ikke akkumulert sammenligning.
2. **Feriepenge-beregning (fullstendig)** — Delvis i `economy.ts`, men mangler detaljert breakdown av opptjeningsperioder og juni-trekk forklaring.
3. **Tooltips for juni-lønna** — Kravspek sier "Forklaringen av juni-lønna og ferietrekket må inkluderes som en infoboks". Ikke implementert.

### UX/Kvalitet

4. **Input-validering** — Grunnleggende, men mangler tydelige feilmeldinger for ugyldige scenarier.
5. **Mobiloptimalisering** — Fungerer, men kan forbedres (spesielt planner-kalenderen).
6. **Dark mode testing** — CSS-variabler er definert, men ikke grundig testet.
7. **Akseptansetest-verifisering** — De fire akseptansekriteriene fra KRAVSPEC.md bør kjøres gjennom systematisk.

### Teknisk

8. **Tester** — Ingen automatiske tester (unit/integration).
9. **Legacy-opprydding** — `/gammel`-ruten og tilhørende input-komponenter kan potensielt fjernes hvis wizard/planner dekker alt.

---

## Filstruktur (oppdatert)

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (Geist fonter, Providers)
│   ├── page.tsx                      # Redirect → /planlegger
│   ├── globals.css                   # Tailwind v4 + CSS vars (light/dark)
│   ├── planlegger/
│   │   ├── page.tsx                  # Wizard-side (ny plan / fortsett lagret)
│   │   └── kalender/
│   │       └── page.tsx              # Kalender + økonomi (etter wizard)
│   └── gammel/
│       └── page.tsx                  # Legacy kalkulator (beholdt for referanse)
├── store/
│   ├── index.ts                      # Zustand store (alle slices)
│   ├── hooks.ts                      # Custom hooks (computed values)
│   └── slices/
│       ├── wizardSlice.ts            # Wizard-steg og input
│       ├── periodsSlice.ts           # Custom perioder, undo
│       ├── economySlice.ts           # Lønnsdata
│       ├── jobSettingsSlice.ts       # Jobbtype per forelder
│       ├── persistenceSlice.ts       # localStorage lagring
│       └── uiSlice.ts               # UI-state
├── lib/
│   ├── constants.ts                  # G, ukefordeling, feriepenge-konstanter
│   ├── types.ts                      # Alle TypeScript interfaces
│   ├── format.ts                     # formatCurrency() (norsk locale)
│   ├── holidays.ts                   # Norske helligdager + caching
│   ├── utils.ts                      # cn() for Tailwind
│   ├── calculator/
│   │   ├── index.ts                  # calculate(), defaults, re-exports
│   │   ├── dates.ts                  # Perioder, gap, segmenter, validering
│   │   └── economy.ts               # NAV-utbetaling, feriepenger, sammenligning
│   └── planner/
│       └── initialize-periods.ts     # Wizard-resultat → editerbare perioder
├── components/
│   ├── providers.tsx                 # Root: ToastProvider
│   ├── calendar/                     # Delte kalender-primitiver
│   │   ├── DayCell.tsx
│   │   ├── MonthGrid.tsx
│   │   ├── PeriodBandRenderer.tsx
│   │   ├── CalendarLegend.tsx
│   │   ├── colors.ts
│   │   ├── resolve-bands.ts
│   │   ├── resolve-day.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── wizard/                       # 8-trinns onboarding
│   │   ├── WizardContainer.tsx
│   │   ├── WizardProgress.tsx
│   │   ├── WelcomeIntro.tsx
│   │   ├── SetupLoader.tsx
│   │   ├── steps/
│   │   │   ├── DueDateStep.tsx
│   │   │   ├── RightsStep.tsx
│   │   │   ├── CoverageStep.tsx
│   │   │   ├── DistributionStep.tsx
│   │   │   ├── DaycareStep.tsx
│   │   │   ├── JobSettingsStep.tsx
│   │   │   ├── EconomyStep.tsx
│   │   │   └── SummaryStep.tsx
│   │   └── index.ts
│   ├── planner/                      # Interaktiv planlegger
│   │   ├── PlannerCalendar.tsx
│   │   ├── MonthView.tsx
│   │   ├── PeriodModal.tsx
│   │   ├── AddPeriodFab.tsx
│   │   ├── DayDetailPanel.tsx
│   │   ├── StatsBar.tsx
│   │   ├── YearOverview.tsx
│   │   ├── MiniMonth.tsx
│   │   ├── SettingsSheet.tsx
│   │   ├── PlannerEconomy.tsx
│   │   ├── MonthlyIncomeOverview.tsx
│   │   ├── CalendarOnboarding.tsx
│   │   ├── CalendarSkeleton.tsx
│   │   ├── LeaveIndicatorCalendar.tsx
│   │   ├── SaveControls.tsx
│   │   └── index.ts
│   ├── input/                        # Input-komponenter (legacy + gjenbrukt)
│   │   ├── DueDateInput.tsx
│   │   ├── RightsSelector.tsx
│   │   ├── CoverageToggle.tsx
│   │   ├── DistributionSliders.tsx
│   │   ├── DaycareInput.tsx
│   │   ├── VacationInput.tsx
│   │   ├── EconomySection.tsx
│   │   ├── PeriodInput.tsx
│   │   ├── ParentPeriodSection.tsx
│   │   ├── AddPeriodDialog.tsx
│   │   ├── PeriodListItem.tsx
│   │   ├── QuotaSummary.tsx
│   │   └── index.ts
│   ├── timeline/
│   │   ├── CalendarTimeline.tsx
│   │   └── index.ts
│   ├── results/
│   │   ├── DateSummary.tsx
│   │   ├── EconomyComparison.tsx
│   │   └── index.ts
│   └── ui/                           # shadcn/ui (19 komponenter)
│       ├── button, input, label, card, tabs, ...
│       ├── info-box.tsx              # Custom
│       └── glossary-term.tsx         # Custom
docs/
├── KRAVSPEC.md                       # Kravspesifikasjon (gjeldende)
├── IMPLEMENTATION_PLAN.md            # Opprinnelig plan (ARKIVERT)
└── PROGRESS.md                       # Dette dokumentet
```

---

## Kontekst for nye utviklere

### Brukerflyt

1. Bruker starter på `/planlegger` → ser WelcomeIntro
2. Går gjennom 8 wizard-steg (termin → rettigheter → dekning → fordeling → barnehage → jobbtype → økonomi → oppsummering)
3. Wizard beregner `LeaveResult` → konverterer til `CustomPeriod[]`
4. Sendes til `/planlegger/kalender` med kalender- og økonomi-faner
5. Kan redigere perioder, lagre plan, og endre innstillinger

### Domenekunskap

- Les `CLAUDE.md` for alle regler og konstanter
- Les `docs/KRAVSPEC.md` for detaljerte krav på norsk
- G-verdien (130 160 kr per mai 2025) må oppdateres årlig i `constants.ts`

### Kodekonvensjoner

- **Kode:** Engelske variabelnavn (`grossSalary`, `gapWeeks`)
- **UI:** Norsk tekst (`Månedslønn`, `Uker i gapet`)
- **Datoer:** Alltid bruk date-fns, aldri native Date-manipulering
- **State:** Zustand store med slices, `useShallow` for selektorer
- **Kalender:** Eksklusiv end-dato internt, inklusiv i visning

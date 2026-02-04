# Interaktiv Permisjonsplanlegger - Implementeringsplan

> **REGEL:** Denne filen MÅ oppdateres etter hver implementert komponent/feature med checkmark og dato.

## Oversikt

Bygge en mobil-first, wizard-basert permisjonsplanlegger med interaktiv kalender. Erstatter dagens "alt på én side"-kalkulator med en guidet opplevelse.

## Progress

### Fase 1: Grunnlag
- [x] Installer Zustand (2025-02-04)
- [x] wizardSlice - wizard steg og permisjonskonfigurasjon (2025-02-04)
- [x] jobSettingsSlice - jobbtype og feriedager (2025-02-04)
- [x] periodsSlice - egendefinerte perioder med undo (2025-02-04)
- [x] uiSlice - UI-tilstand for kalender og seleksjon (2025-02-04)
- [x] persistenceSlice - localStorage lagring (2025-02-04)
- [x] store/index.ts - kombinert store med auto-save (2025-02-04)
- [x] Utvidet types.ts med nye typer (2025-02-04)
- [x] store/hooks.ts - convenience hooks (2025-02-04)
- [x] Opprett route-struktur (/planlegger, /planlegger/kalender) (2025-02-04)
- [x] Flytt gammel kalkulator til /gammel (2025-02-04)

### Fase 2: Wizard
- [ ] WizardContainer med steg-navigasjon
- [ ] WizardProgress indikator
- [ ] DueDateStep
- [ ] RightsStep
- [ ] CoverageStep
- [ ] DistributionStep
- [ ] DaycareStep
- [ ] JobSettingsStep
- [ ] SummaryStep med tilbake-funksjon

### Fase 3: Kalender-grunnlag
- [ ] PlannerCalendar hovedkomponent
- [ ] MonthView med dager
- [ ] DayCell med periode-visning
- [ ] Swipe-navigasjon med snap
- [ ] MonthOverview for hopping mellom måneder

### Fase 4: Perioder
- [ ] PeriodToolbar for valg av periodetype/forelder
- [ ] Tap-tap interaksjon for periode-opprettelse
- [ ] PeriodModal for redigering
- [ ] Undo-funksjonalitet i UI

### Fase 5: Stats og varsler
- [ ] StatsBar med kvote-oversikt
- [ ] Toast-varsler for overlapp, gap, etc.

### Fase 6: Lagring
- [ ] SaveControls komponent
- [ ] "Fortsett der du slapp" dialog
- [ ] "Ny plan" med bekreftelse

### Fase 7: Polish
- [ ] Responsive desktop-tilpasninger
- [ ] Animasjoner og overganger
- [ ] Edge case-håndtering

---

## Tekniske detaljer

### State management: Zustand med slices

```typescript
// Slices
- wizardSlice: dueDate, rights, coverage, sharedWeeksToMother, daycareStartDate, daycareEnabled, wizardCompleted
- jobSettingsSlice: mother/father JobSettings | null
- periodsSlice: periods[], undoStack[]
- uiSlice: selectedPeriodType, selectedParent, activeMonth
- persistenceSlice: hasSavedPlan, autoSaveEnabled
```

### Route-struktur

```
src/app/
├── page.tsx                    → Redirect til /planlegger
├── gammel/page.tsx             → Dagens kalkulator (bevart)
├── planlegger/page.tsx         → Wizard
└── planlegger/kalender/page.tsx → Interaktiv kalender
```

### Komponentstruktur

```
src/components/
├── wizard/
│   ├── WizardContainer.tsx
│   ├── WizardProgress.tsx
│   └── steps/
│       ├── DueDateStep.tsx
│       ├── RightsStep.tsx
│       ├── CoverageStep.tsx
│       ├── DistributionStep.tsx
│       ├── DaycareStep.tsx
│       ├── JobSettingsStep.tsx
│       └── SummaryStep.tsx
├── planner/
│   ├── PlannerCalendar.tsx
│   ├── MonthView.tsx
│   ├── DayCell.tsx
│   ├── MonthOverview.tsx
│   ├── PeriodToolbar.tsx
│   ├── StatsBar.tsx
│   ├── PeriodModal.tsx
│   └── SaveControls.tsx
└── ui/ (eksisterende shadcn)

src/store/
├── index.ts
├── hooks.ts
└── slices/
    ├── wizardSlice.ts
    ├── jobSettingsSlice.ts
    ├── periodsSlice.ts
    ├── uiSlice.ts
    └── persistenceSlice.ts
```

### Periodetyper og farger
- Permisjon mor: rosa (#fce7f3)
- Permisjon far: blå (#dbeafe)
- Ferie: stiplet versjon
- Ulønnet: grå stiplet
- Annet: custom farge
- Gap: rød/oransje
- Helligdager: rød tekst

### localStorage format

```typescript
const STORAGE_KEY = 'permisjonsplan-v1'

interface SavedPlan {
  version: 1;
  savedAt: string;
  wizard: WizardState;
  jobSettings: { mother: JobSettings | null, father: JobSettings | null };
  periods: CustomPeriod[];
  autoSaveEnabled: boolean;
}
```

---

## Gjenbruk fra eksisterende kode

- `src/lib/constants.ts` - G, LEAVE_CONFIG
- `src/lib/holidays.ts` - helligdagslogikk
- `src/lib/types.ts` - utvides med nye typer
- `src/lib/calculator/dates.ts` - beregningslogikk
- `src/components/ui/*` - alle shadcn-komponenter

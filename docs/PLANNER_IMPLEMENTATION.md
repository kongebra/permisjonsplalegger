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
- [x] WizardContainer med steg-navigasjon (2025-02-04)
- [x] WizardProgress indikator (2025-02-04)
- [x] DueDateStep (2025-02-04)
- [x] RightsStep (2025-02-04)
- [x] CoverageStep (2025-02-04)
- [x] DistributionStep (2025-02-04)
- [x] DaycareStep (2025-02-04)
- [x] JobSettingsStep (2025-02-04)
- [x] SummaryStep med tilbake-funksjon (2025-02-04)
- [x] Switch UI-komponent (2025-02-04)

### Fase 3: Kalender-grunnlag
- [x] PlannerCalendar hovedkomponent (2025-02-04)
- [x] MonthView med dager (2025-02-04)
- [x] DayCell med periode-visning (2025-02-04)
- [x] Swipe-navigasjon med touch events (2025-02-04)
- [x] MonthOverview for hopping mellom måneder (2025-02-04)
- [x] Kalender-side med header og lagring (2025-02-04)

### Fase 4: Perioder
- [x] PeriodToolbar for valg av periodetype/forelder (2025-02-04)
- [x] Tap-tap interaksjon for periode-opprettelse (2025-02-04)
- [x] PeriodModal for redigering (2025-02-04)
- [x] Undo-funksjonalitet i UI (allerede i header) (2025-02-04)

### Fase 5: Stats og varsler
- [x] StatsBar med kvote-oversikt (2025-02-04)
- [x] Toast-varsler system med ToastProvider (2025-02-04)
- [x] Providers wrapper for app layout (2025-02-04)

### Fase 6: Lagring
- [x] SaveControls komponent (2025-02-04)
- [x] localStorage-integrasjon (i store) (2025-02-04)
- [x] "Fortsett der du slapp" dialog (2025-02-04)
- [x] "Ny plan" med bekreftelse (2025-02-04)

### Fase 7: Polish
- [ ] Responsive desktop-tilpasninger (flere måneder per rad)
- [ ] Animasjoner og overganger
- [ ] Edge case-håndtering
- [x] TypeScript build verification (2025-02-04)

### Fase 8: Kalender-redesign (2025-02-05)
- [x] Drag-seleksjon med Pointer Events (erstatter tap-tap) (2025-02-05)
- [x] Rød tekst for søndager og helligdager (2025-02-05)
- [x] Fjernet grå prikker for låste datoer (2025-02-05)
- [x] Ny uiSlice med drag-state (isDragging, dragStartDate, dragCurrentDate) (2025-02-05)
- [x] StripeRenderer komponent for horisontale periodestriper (2025-02-05)
- [x] Refaktorert MonthView til uke-rad struktur med striper (2025-02-05)
- [x] YearOverview med MiniMonth komponenter (erstatter MonthOverview) (2025-02-05)
- [x] Dropdown måned/år-velger i datepicker (2025-02-05)
- [x] Slettet MonthOverview.tsx (2025-02-05)

### Fase 9: UX-forbedringer (2026-02-05)
Basert på brukertesting med 5 personas (Emilie, Fatima, Maja, Jonas, Erik).
Se `docs/plans/2026-02-05-ux-improvements.md` for detaljer.

- [x] economySlice for lønn og økonomiske data (2026-02-05)
- [x] EconomyStep wizard-steg (steg 7 av 8) (2026-02-05)
- [x] Økonomi-sammenligning i SummaryStep (2026-02-05)
- [x] Fikset kalender-instruksjonstekst (drag i stedet for tap-tap) (2026-02-05)
- [x] GlossaryTerm komponent for NAV-terminologi (2026-02-05)
- [x] WelcomeIntro velkomstskjerm før wizard (2026-02-05)
- [x] Disable Neste-knapp til steg er validert + hjelpetekst (2026-02-05)
- [x] Gap-kostnad i kroner i DaycareStep (2026-02-05)
- [x] CalendarOnboarding overlay for førstegangsbrukere (2026-02-05)
- [x] Info-boks for enslige foreldre i RightsStep (2026-02-05)

---

## Status: Kjernefunksjonalitet ferdig

Implementert 2025-02-04:
- Wizard med 7 steg (termin, rettigheter, dekning, fordeling, barnehage, jobb, oppsummering)
- Interaktiv kalender med månedsvisning og oversikt
- Tap-tap periode-opprettelse med toolbar
- Periode-redigering via modal
- Stats bar med kvote-oversikt og gap-status
- Toast-varsler system
- localStorage lagring med auto-save
- "Fortsett der du slapp" dialog

Gjenstår (polish):
- Desktop-optimalisering
- Animasjoner
- Edge case testing

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
│   ├── YearOverview.tsx
│   ├── MiniMonth.tsx
│   ├── StripeRenderer.tsx
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

# Design: Helligdager trekkes fra feriedager + DialogTitle a11y-fix

**Dato:** 2026-02-24
**Status:** Godkjent

## Bakgrunn

To uavhengige bugs:

1. Ferieperioder med norske helligdager (f.eks. påske) viser feil antall virkedager fordi `differenceInBusinessDays` (date-fns) ikke kjenner til norske helligdager. Eksempel: 22. mars – 3. apr. 2027 inkluderer Skjærtorsdag og Langfredag, men viser 10 virkedager i stedet for 8 feriedager.

2. Desktop-varianten av `SmartPeriodPicker` mangler `DialogTitle`, noe som bryter Radix-kravet og gir en tilgjengelighetsfeil for skjermlesere.

## Rotårsaker

- `PickerFooter` og `PeriodModal` bruker `differenceInBusinessDays` fra date-fns.
- Funksjonen `countVacationDays(start, end, jobType)` i `src/lib/calculator/dates.ts` finnes allerede og er korrekt (man-fre, minus helligdager for kontorjobb).
- `SmartPeriodPicker` desktop-dialog mangler `<DialogTitle>`.

## Design

### Fix 1: Helligdagskorrigert feriedagstelling

**`src/components/picker/PickerFooter.tsx`**
- Erstatt `differenceInBusinessDays(endDate, startDate)` med `countVacationDays(startDate, endDate, 'office')`
- Endre tekst fra `"virkedager"` til `"feriedager"` (juridisk korrekt begrep fra ferieloven)
- `PickerFooter` er en generisk komponent uten jobbtype-kontekst → 'office' er korrekt default

**`src/components/planner/PeriodModal.tsx`**
- Hent `motherJobSettings` og `fatherJobSettings` fra Zustand-store
- Utled `jobType` basert på valgt `parent`: `motherJobSettings?.jobType ?? 'office'`
- Erstatt `workDays = differenceInBusinessDays(...)` med `countVacationDays(startDate, endDate, jobType)`
- Ved lagring/oppdatering av 'ferie'-periode: legg til `vacationDaysUsed: workDays` i periodData
  (Dette legger grunnlaget for fremtidig kvoteregnskap uten ekstra beregning.)

### Fix 2: DialogTitle for skjermlesere

**`src/components/picker/SmartPeriodPicker.tsx`**
- Importer `DialogTitle` fra `@/components/ui/dialog`
- Legg til `<DialogTitle className="sr-only">Velg periode</DialogTitle>` som første barn av `<DialogContent>` i desktop-varianten
- `PickerHeader` viser allerede dynamisk tekst visuelt; den statiske sr-only-tittelen er kun for skjermleser-kontekst

## Berørte filer

| Fil | Endring |
|-----|---------|
| `src/components/picker/PickerFooter.tsx` | `countVacationDays` + "feriedager" |
| `src/components/planner/PeriodModal.tsx` | Zustand jobType, `countVacationDays`, `vacationDaysUsed` på lagring |
| `src/components/picker/SmartPeriodPicker.tsx` | `DialogTitle className="sr-only"` |

## Ikke i scope

- Ingen endringer i `economy.ts` (gap-kalkulasjoner er kalenderdag-baserte og upåvirket)
- Ingen endringer i skiftarbeider-logikk utover at `PeriodModal` allerede bruker korrekt jobbtype fra store

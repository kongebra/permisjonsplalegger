# Prosjekt-fremgang

Sist oppdatert: 4. februar 2026

## Status: MVP Fase 2 - Avansert permisjonsplanlegger

Kalkulatoren er funksjonell med datokalkulator, visuell tidslinje og økonomisk sammenligning. Nå utvidet med avansert permisjonsplanlegger for fleksible perioder.

---

## Implementert

### 1. Prosjektoppsett

- [x] Next.js 16 med App Router
- [x] shadcn/ui komponenter installert (Calendar, Popover, Slider, Toggle, Tabs, etc.)
- [x] date-fns for datoberegninger
- [x] Tailwind CSS v4 med CSS-variabler
- [x] TypeScript med streng typing

### 2. Beregningsmotor (`src/lib/calculator/`)

| Fil | Beskrivelse | Status |
|-----|-------------|--------|
| `constants.ts` | G-verdi (130 160), ukefordeling per dekning | ✅ Ferdig |
| `types.ts` | TypeScript interfaces for alle datastrukturer | ✅ Ferdig |
| `dates.ts` | Datoberegninger (permisjonsperioder, gap, segmenter) | ✅ Ferdig |
| `economy.ts` | Økonomisk sammenligning 80% vs 100% | ✅ Ferdig |
| `index.ts` | Hovedeksport, hjelpefunksjoner | ✅ Ferdig |
| `holidays.ts` | Norske helligdager 2025-2027 med påskeberegning | ✅ Ferdig |

### 2b. Helligdagsmodul (`src/lib/holidays.ts`)

Ny modul for norske helligdager med:
- **Computus-algoritme** for beregning av påskedagen
- **Faste helligdager:** Nyttår, 1. mai, 17. mai, jul
- **Påske-relative:** Skjærtorsdag, langfredag, påske, pinse, Kr. himmelfart
- **Utility-funksjoner:** `isHoliday()`, `getHolidayName()`, `getHolidaysInRange()`
- **Caching** for ytelse

Verifisert mot timeanddate.no for 2026 og 2027.

### 3. UI-komponenter

#### Input-komponenter (`src/components/input/`)

| Komponent | Beskrivelse | Status |
|-----------|-------------|--------|
| `DueDateInput` | Datepicker for termindato | ✅ Ferdig |
| `RightsSelector` | Radio: Begge/Kun mor/Kun far | ✅ Ferdig |
| `CoverageToggle` | Toggle 100%/80% med ukevisning | ✅ Ferdig |
| `DistributionSliders` | Slidere for felleskvote og overlapp | ✅ Ferdig |
| `DaycareInput` | Datepicker for barnehagestart | ✅ Ferdig |
| `VacationInput` | Feriedager før/etter permisjon | ✅ Ferdig |
| `EconomySection` | Lønn og arbeidsgiverinfo (collapsible) | ✅ Ferdig |
| `PeriodInput` | Avansert permisjonsplanlegger (collapsible) | ✅ Ferdig |
| `ParentPeriodSection` | Per-forelder seksjon med jobbtype | ✅ Ferdig |
| `AddPeriodDialog` | Modal for å legge til perioder | ✅ Ferdig |
| `PeriodListItem` | Viser en periode med type-badge | ✅ Ferdig |
| `QuotaSummary` | Kvote-bruk med progress bar | ✅ Ferdig |

#### Tidslinje (`src/components/timeline/`)

| Komponent | Beskrivelse | Status |
|-----------|-------------|--------|
| `CalendarTimeline` | Kalendervisning med fargekodede perioder | ✅ Ferdig |

**CalendarTimeline-funksjoner:**
- Fargekoding: mor (rosa), far (blå), overlapp (gradient), gap (rød stiplet)
- Ferie vises med stiplet kant
- Ulønnet permisjon vises med grå bakgrunn + stiplet kant
- **Røde dager:** Søndager og helligdager vises med rød, fet tekst
- Tooltip viser helligdagsnavn ved hover

#### Resultater (`src/components/results/`)

| Komponent | Beskrivelse | Status |
|-----------|-------------|--------|
| `DateSummary` | Tabell med start/slutt/uker per forelder | ✅ Ferdig |
| `EconomyComparison` | Sammenligning 80% vs 100% (vises når lønn er satt) | ✅ Ferdig |

### 4. Hovedside (`src/app/page.tsx`)

- [x] To-kolonners layout (input venstre, resultater høyre)
- [x] Tabs: Kalkulator / Om kalkulatoren
- [x] Reaktiv oppdatering via useMemo
- [x] State management med useState/useRef

---

## Viktige designbeslutninger

### Dato-håndtering

**Internt format:**
- Sluttdatoer er **eksklusive** (dagen ETTER siste permisjonsdag)
- Dette gjør beregninger enklere: `fatherStart = motherEnd` (ingen +1 nødvendig)

**Visning til bruker:**
- Sluttdatoer vises **inklusivt** (siste dag med permisjon)
- `DateSummary` bruker `subDays(date, 1)` for å vise korrekt sluttdato

**Datosammenligninger:**
- Bruk `isSameDay()` eller `startOfDay()` for å unngå tidspunkt-problemer
- Kalenderdager har tid 00:00:00, men beregnede datoer kan ha andre tidspunkt

### Barnehagestart default

```typescript
// Barnet må være ~1 år før barnehagestart (hovedopptak 1. august)
if (dueDate >= augustFirstSameYear) {
  return new Date(year + 2, 7, 1); // Født etter aug → bhg 2 år senere
}
return new Date(year + 1, 7, 1); // Født før aug → bhg 1 år senere
```

### Auto-oppdatering av barnehagestart

- Barnehagestart oppdateres automatisk når termindato endres
- MEN: Hvis bruker har manuelt endret barnehagestart, forblir den uendret
- Spores med `useRef(isDaycareManuallySet)`

---

## Kjente begrensninger / TODO

### Ikke implementert ennå

1. ~~**Feriedag-markering i kalender**~~ ✅ Implementert via PeriodInput
2. **Likviditetsgraf** - Akkumulert inntekt over tid (Recharts)
3. **Feriepenge-beregning** - Differanse NAV vs arbeidsgiver (delvis i economy.ts)
4. **Validering av input** - Negative verdier, ugyldige datoer
5. **Mobile responsivitet** - Fungerer, men kan forbedres
6. **Dark mode testing** - Implementert via Tailwind, men ikke grundig testet
7. **Integrasjon av PeriodInput med beregninger** - Periodene vises, men brukes ikke ennå i hovedberegningen

### Kjente bugs

- Ingen kjente bugs per nå

### Teknisk gjeld

- `buildLeaveSegments()` for mother-only dekker ikke alle 59 uker (kun visuelt problem i segmenter, ikke i beregninger)
- Noen komponenter kunne vært refaktorert for bedre gjenbruk

---

## Testing

### Manuelle testscenarier

1. **Standard case:**
   - Termindato: 5. juli 2026
   - 80%, begge foreldre, 18 uker til mor
   - Forventet: Mor 14.06.26 → 20.03.27, Far 21.03.27 → 31.07.27

2. **Mother-only:**
   - 80%, kun mor
   - Forventet: Mor får alle 59 uker

3. **Overlapp:**
   - Sett overlapp til 2 uker
   - Forventet: Far starter 2 uker før mor slutter, oransje farge i kalender

4. **Økonomisk sammenligning:**
   - Legg inn lønn 600 000 for mor
   - Forventet: Viser sammenligning med "Det store tallet"

### Referanse-kalkulator

Bruk [permisjonskalkulator.no](https://www.permisjonskalkulator.no/) for å verifisere datoberegninger.

---

## Filstruktur

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Hovedside med all state
│   └── globals.css         # Tailwind + CSS vars
├── components/
│   ├── input/              # Alle input-komponenter
│   │   ├── index.ts        # Re-exports
│   │   ├── DueDateInput.tsx
│   │   ├── RightsSelector.tsx
│   │   ├── CoverageToggle.tsx
│   │   ├── DistributionSliders.tsx
│   │   ├── DaycareInput.tsx
│   │   ├── VacationInput.tsx
│   │   ├── EconomySection.tsx
│   │   ├── PeriodInput.tsx       # Avansert permisjonsplanlegger
│   │   ├── ParentPeriodSection.tsx
│   │   ├── AddPeriodDialog.tsx
│   │   ├── PeriodListItem.tsx
│   │   └── QuotaSummary.tsx
│   ├── timeline/
│   │   ├── index.ts
│   │   └── CalendarTimeline.tsx  # Med helligdags-styling
│   ├── results/
│   │   ├── index.ts
│   │   ├── DateSummary.tsx
│   │   └── EconomyComparison.tsx
│   └── ui/                 # shadcn/ui komponenter
│       ├── dialog.tsx      # Ny
│       ├── select.tsx      # Ny
│       └── ...
├── lib/
│   ├── calculator/
│   │   ├── index.ts        # Hovedeksport
│   │   ├── dates.ts        # Datoberegninger + periodelogikk
│   │   └── economy.ts      # Økonomiberegninger
│   ├── holidays.ts         # Norske helligdager (ny)
│   ├── constants.ts        # G, ukefordeling
│   ├── types.ts            # TypeScript interfaces (utvidet)
│   └── utils.ts            # cn() helper
docs/
├── KRAVSPEC.md             # Kravspesifikasjon
├── IMPLEMENTATION_PLAN.md  # Opprinnelig plan
└── PROGRESS.md             # Dette dokumentet
```

---

## Neste steg (prioritert)

1. **Integrer PeriodInput med beregninger** - Bruk periodene i hovedberegningen og kalenderen
2. **Forbedre økonomisk sammenligning** - Mer detaljert breakdown, tydeligere anbefaling
3. **Likviditetsgraf** - Visuell sammenligning av inntekt over tid
4. **Validering og feilmeldinger** - Bedre UX ved ugyldige input
5. **Mobiloptimalisering** - Test og fiks på små skjermer

---

## Kontekst for nye utviklere

### Hvorfor dette verktøyet?

De fleste foreldre velger 80% fordi "59 uker > 49 uker", men de glemmer:
1. **Gapet:** Permisjonen slutter før barnehagen starter (vanligvis 1. august)
2. **6G-taket:** NAV dekker maks 6G (~780k). Høytlønnede taper differansen.
3. **Feriepenger:** NAV gir kun feriepengeopptjening de første 12-15 ukene.

### Domenekunskap

- Les `CLAUDE.md` for alle regler og konstanter
- Les `docs/KRAVSPEC.md` for detaljerte krav på norsk
- G-verdien (130 160 kr per mai 2025) må oppdateres årlig i `constants.ts`

### Kodekonvensjoner

- **Kode:** Engelske variabelnavn (`grossSalary`, `gapWeeks`)
- **UI:** Norsk tekst (`Månedslønn`, `Uker i gapet`)
- **Datoer:** Alltid bruk date-fns, aldri native Date-manipulering
- **State:** React hooks (useState, useMemo, useRef), ingen global state manager

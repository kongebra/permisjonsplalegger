# Design: Far-only med aktivitetskrav-split

**Dato:** 2026-02-24
**Status:** Klar for implementasjon
**Kilde:** NAV.no – «Kun far eller medmor har rett»

---

## Bakgrunn

Kalkulatoren bruker i dag `LEAVE_CONFIG.total` (49 uker / 61 uker) for far-only-scenariet.
NAV sier at far-only har **40 uker (100%)** og **52 uker og 1 dag (80%)**, med et distinkt skille
mellom uker med og uten aktivitetskrav.

I tillegg starter far-only-permisjonen fra **termindato**, ikke 3 uker før som for mor.

---

## Scope

### I scope
- Rette totalt antall uker for far-only (100% og 80%)
- Vise to segmenter i kalenderen: «uten aktivitetskrav» (10 uker) og «med aktivitetskrav» (30/42 uker)
- Fikse startdato (termindato, ikke termin minus 3 uker)
- Oppdatere UI-tekst i RightsStep som nå viser feil tall
- Oppdatere `docs/nav/foreldrepenger.md` med mer detaljert far-only-info

### Ikke i scope
- Modellering av mor-deltids-reduksjon av fars foreldrepenger
- 7-ukersgrensen for når aktivitetskravet starter
- Flerbarnsdager (ingen aktivitetskrav gjelder her – edge case)

---

## Datamodell

### `src/lib/constants.ts` – LEAVE_CONFIG

Legg til `fatherOnly`-understruktur:

```typescript
100: {
  total: 49,          // Uendret – brukes for mor-only
  mother: 15,
  father: 15,
  shared: 16,
  preBirth: 3,
  motherMandatoryPostBirth: 6,
  fatherOnly: {
    noRequirement: 10,   // Uten aktivitetskrav – fritt å ta ut
    withRequirement: 30, // Med aktivitetskrav – mor må være i aktivitet
    total: 40,
  },
},
80: {
  total: 61,          // Uendret – brukes for mor-only
  mother: 19,
  father: 19,
  shared: 20,
  preBirth: 3,
  motherMandatoryPostBirth: 6,
  fatherOnly: {
    noRequirement: 10,
    withRequirement: 42, // NAV: 42 uker og 1 dag – avrundet til hele uker
    total: 52,
  },
},
```

### `src/lib/types.ts` – LeaveSegmentType

Legg til ny type:

```typescript
// Eksisterende: 'quota' | 'shared' | 'vacation' | 'unpaid' | 'preBirth' | 'mandatory' | 'overlap'
// Ny:
| 'activity-required'  // Fars 30/42 uker som krever at mor er i aktivitet
```

---

## Logikkendringer

### `src/lib/calculator/dates.ts`

**`calculateFatherPeriod`**: For `father-only`, bruk `config.fatherOnly.total` i stedet for `config.total`.

**`buildLeaveSegments`**: For `father-only`:
1. Start fra `dueDate` (ikke `leaveStart = dueDate - 3 uker`)
2. Bygg to segmenter:
   - Segment 1: `type: 'quota'`, `weeks: config.fatherOnly.noRequirement` (10 uker)
   - Segment 2: `type: 'activity-required'`, `weeks: config.fatherOnly.withRequirement` (30/42 uker)

---

## Kalendervisualisering

### Farger/stil

| Segment | Type | Stil |
|---|---|---|
| Far – uten krav | `'quota'` | Eksisterende far-farge (uendret) |
| Far – med aktivitetskrav | `'activity-required'` | Litt lysere/dusere far-farge + stripet border eller `⚡`-ikon |

Nøyaktig styling avgjøres under implementasjon, men prinsippet er:
visuelt distinkt fra vanlig kvote, men ikke alarmmessig.

### Informasjonsboks

Under kalenderen (kun synlig ved `rights === 'father-only'`):

> **Om aktivitetskravet**
> 10 av ukene dine kan tas ut fritt. For de resterende 30 ukene (100%) / 42 ukene (80%)
> må mor enten jobbe, studere på heltid, eller oppfylle annet godkjent aktivitetskrav fra NAV.
> *Kalkulatoren tar ikke hensyn til reduksjon ved mors deltidsarbeid.*

---

## UI-oppdateringer

### `src/components/wizard/steps/RightsStep.tsx`

Nåværende InfoBox (feil):
> «opptil 46 uker (100%) eller 56 uker (80%) totalt, pluss 3 uker før termin»

Ny tekst:
> «Som eneste forelder med rett har du 40 uker (100%) eller 52 uker (80%) foreldrepenger.
> 10 uker er uten aktivitetskrav. De resterende ukene krever at den andre forelderen
> er i godkjent aktivitet (arbeid, heltidsstudier m.m.).»

### QuotaDisplay / PlannerEconomy

Når `rights === 'father-only'`, vis kvotene som:
- «Uten aktivitetskrav: 10 uker»
- «Med aktivitetskrav: 30 uker (100%) / 42 uker (80%)»

i stedet for «Fedrekvote» / «Fellesperiode».

---

## Dokumentasjon

`docs/nav/foreldrepenger.md` oppdateres med:
- Mer detaljert far-only-seksjon basert på NAV.no
- Aktivitetskrav-beskrivelse (mor-kriterier)
- Tabell for flerbarnsdager (referanse, ikke implementert)

---

## Testdekning

Nye/oppdaterte tester i `src/lib/calculator/dates.test.ts`:

- `far-only 100%: total = 40 uker`
- `far-only 80%: total = 52 uker`
- `far-only: starter på termindato, ikke 3 uker før`
- `far-only: to segmenter – quota (10) + activity-required (30)`

Oppdaterte tester i `src/lib/calculator/index.test.ts`:
- Far-only-scenario i `calculate()`-integrasjonstest

---

## Berørte filer

| Fil | Endring |
|---|---|
| `src/lib/constants.ts` | Legg til `fatherOnly`-understruktur |
| `src/lib/types.ts` | Legg til `'activity-required'` segment-type |
| `src/lib/calculator/dates.ts` | Fiks total + startdato + to segmenter |
| `src/lib/calculator/dates.test.ts` | Nye tester |
| `src/lib/calculator/index.test.ts` | Oppdater far-only integrasjonstest |
| `src/components/wizard/steps/RightsStep.tsx` | Fiks InfoBox-tekst |
| `src/components/planner/PlannerCalendar.tsx` | Ny farge/stil for `activity-required` |
| `src/components/planner/PlannerEconomy.tsx` | Kvotedisplay for far-only |
| `docs/nav/foreldrepenger.md` | Oppdater med mer detaljert far-only-info |

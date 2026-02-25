---
name: nav-compliant
description: Use when checking whether app constants in src/lib/constants.ts match current NAV documentation in docs/nav/. Detects stale G-values, wrong quota durations, or other discrepancies between the codebase and official NAV rules.
---

# nav-compliant

## Overview

Sammenligner `src/lib/constants.ts` mot `docs/nav/` og rapporterer avvik. Kjør etter `nav-scrape` eller når NAV-regler kan ha endret seg (typisk etter 1. mai hvert år).

## Sjekkliste

Les begge filer parallelt og sammenlign hver verdi:

### G-beløpet

Kilde: `docs/nav/grunnbelopet.md` (fra https://www.nav.no/grunnbelopet)

| Sjekk | docs/nav/ | constants.ts |
|---|---|---|
| Gjeldende G | f.eks. 130 160 | `G = 130_160` på linje 6 |
| Effektiv dato | 1. mai YYYY | kommentar på samme linje |
| 6G-tak | 6 × G | beregnes i economy.ts – ikke hardkodet |

Flagg avvik hvis: G-verdien er ulik, eller årstall i kommentaren er et år gammelt.

### Foreldrepenger-kvoter

Kilde: `docs/nav/foreldrepenger.md` (fra https://www.nav.no/foreldrepenger)

| NAV-felt | docs/nav/ | constants.ts-sti |
|---|---|---|
| Totalt 100% | 49 uker | `LEAVE_CONFIG[100].total` |
| Totalt 80% | 61 uker (og 1 dag) | `LEAVE_CONFIG[80].total` |
| Mødrekvote 100% | 15 uker | `LEAVE_CONFIG[100].mother` |
| Mødrekvote 80% | 19 uker | `LEAVE_CONFIG[80].mother` |
| Fedrekvote 100% | 15 uker | `LEAVE_CONFIG[100].father` |
| Fedrekvote 80% | 19 uker | `LEAVE_CONFIG[80].father` |
| Fellesperiode 100% | 16 uker | `LEAVE_CONFIG[100].shared` |
| Fellesperiode 80% | 20 uker (og 1 dag) | `LEAVE_CONFIG[80].shared` |
| Kun-far totalt 100% | 40 uker | `LEAVE_CONFIG[100].fatherOnly.total` |
| Kun-far totalt 80% | 52 uker (og 1 dag) | `LEAVE_CONFIG[80].fatherOnly.total` |
| Kun-far uten krav 100% | 10 uker | `LEAVE_CONFIG[100].fatherOnly.noRequirement` |
| Kun-far uten krav 80% | 10 uker | `LEAVE_CONFIG[80].fatherOnly.noRequirement` |
| Kun-far med krav 100% | 30 uker | `LEAVE_CONFIG[100].fatherOnly.withRequirement` |
| Kun-far med krav 80% | 42 uker (og 1 dag) | `LEAVE_CONFIG[80].fatherOnly.withRequirement` |

### Feriepenger

| Sjekk | NAV-docs | constants.ts |
|---|---|---|
| Sats | 10,2% | `FERIEPENGER_RATE = 0.102` |
| Uker som teller, 100% | 12 uker | `FERIEPENGER_NAV_WEEKS[100]` |
| Uker som teller, 80% | 15 uker | `FERIEPENGER_NAV_WEEKS[80]` |

### Barnehagerett

Kilde: `docs/nav/barnehagerett.md` (fra https://lovdata.no/nav/lov/2005-06-17-64/kapIV/%C2%A716)

Sammenlign opptak-logikken mot `src/lib/calculator/dates.ts` (funksjonen for barnehagestart):
- Jan–aug-fødte → 1. august år barnet er 1 år
- Sep/okt/nov-fødte → rett til plass månedsslutt i fødselsmåneden (kalkulatoren forenkler til august)
- Des-fødte → 1. august *neste* år (barnet ca 1 år 8 mnd)

## Rapportformat

```
## Avvik funnet

### Kritisk (påvirker beregninger)
- G er 130 160 i docs men XXXXX i constants.ts:6
  → Oppdater: export const G = 130_160; // Per 1. mai 2025

### Advarsel (avrunding/datokommentar)
- LEAVE_CONFIG[80].shared er 20 – NAV sier "20 uker og 1 dag"
  → Avrunding er bevisst – legg til kommentar hvis den mangler

## Alt ser OK ut
- FERIEPENGER_RATE: 0.102 ✓
- G: 130 160 ✓
```

## Når foreslå kodeendringer

Foreslå bare endring i `constants.ts` når docs viser en annen numerisk verdi. For "og 1 dag"-tilfeller: flagg som dokumentert, bevisst avrunding hvis det allerede finnes en kommentar på linjen.

## Notat om docs/nav/-ferskhet

Hvis `Hentet:`-datoer i docs/nav/ er eldre enn ~6 måneder, anbefal å kjøre `nav-scrape` først.

---
name: nav-scrape
description: Use when NAV documentation in docs/nav/ needs refreshing, G-beløpet may have changed, or official NAV rules around foreldrepenger, grunnbeløp, engangsstønad, or barnehagerett need to be re-verified against nav.no.
---

# nav-scrape

## Overview

Fetches official NAV documentation and updates `docs/nav/` markdown files. Always run `nav-compliant` after to surface discrepancies with `src/lib/constants.ts`.

## Pages to fetch

| docs/nav/ fil       | URL                                                     | Merknad                                |
| ------------------- | ------------------------------------------------------- | -------------------------------------- |
| `foreldrepenger.md` | https://www.nav.no/foreldrepenger                       | Primærside – kvoter, krav, feriepenger |
| `grunnbelopet.md`   | https://www.nav.no/grunnbelopet                         | G-verdi, historikk                     |
| `engangsstonad.md`  | https://www.nav.no/engangsstonad                        | Engangsbeløp                           |
| `barnehagerett.md`  | https://lovdata.no/nav/lov/2005-06-17-64/kapIV/%C2%A716 | § 16–18, opptak og frister             |

Sjekk også 1 nivå av child-lenker på nav.no/foreldrepenger for nye seksjoner (f.eks. `#kun-far-har-rett`, `#aktivitetskrav`). Opprett ny `docs/nav/`-fil hvis du finner relevante undersider.

## Hva du skal trekke ut

### foreldrepenger.md

- Kvoter i uker ved 100% og 80% (totalt, mødrekvote, fedrekvote, fellesperiode)
- Kun-far-regler: totalt, uten/med aktivitetskrav, startdato
- Feriepenger: sats (10,2%), antall uker som gir grunnlag (12 / 15)
- Maks beregningsgrunnlag (6G)
- Aktivitetskrav-betingelser

### grunnbelopet.md

- Gjeldende G og dato (1. mai YYYY)
- 6G = maks foreldrepenger
- Endringsfaktor fra forrige år
- Neste oppdatering-dato

### engangsstonad.md

- Gjeldende engangsbeløp

### barnehagerett.md (Lovdata § 16)

- Fødselsmåneder og tilhørende rett til opptak
- Spesialtilfeller: jan–aug → august, sep/okt/nov → månedsslutt, des → neste august
- Søknadsfrist-regler (kommunalt fastsatt)

## Oppdateringsformat

Behold eksisterende filstruktur. Oppdater tallverdier i tabeller og løpende tekst. Alltid oppdater header:

```markdown
> Kilde: https://...
> Hentet: YYYY-MM-DD
```

Legg til kommentar hvis NAV bruker "X uker og 1 dag" men vi runder til hele uker (se eksisterende filer for mønster).

## Etter scraping

Kjør `nav-compliant` for å sammenligne oppdaterte docs mot `src/lib/constants.ts`.

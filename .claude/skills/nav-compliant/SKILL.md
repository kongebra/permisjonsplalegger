---
name: nav-compliant
description: Sjekker at NAV-konstantene i src/lib/constants.ts (G, foreldrepengekvoter, feriepenger) og barnehagestart-logikken i src/lib/calculator/index.ts stemmer med docs/nav/*.md, og rapporterer avvik. Bruk etter nav-scrape, etter 1. mai når G endres, eller når brukeren ber om å verifisere at kalkulatoren følger NAVs regler.
---

# nav-compliant

Sammenlign verdiene under mot `docs/nav/` og rapporter avvik.
Les kildefilene parallelt.
Dette er en ren lesesjekk: rediger ikke noe uten at brukeren ber om det.

## 1. G-beløpet

Kilde: `docs/nav/grunnbelopet.md`.

- Gjeldende G i docs (raden med nyeste dato) er lik `G` i `src/lib/constants.ts`.
- Datoen i kommentaren på `G` er lik effektiv dato i docs.
- 6G-taket er ikke hardkodet: `grep -n "6 \* G" src/lib/calculator/economy.ts` skal gi treff.

## 2. Foreldrepengekvoter

Kilde: `docs/nav/foreldrepenger.md`, kvotetabellene (begge dekningsgrader, og tabellen for kun-far).
Sammenlign mot `LEAVE_CONFIG[100]` og `LEAVE_CONFIG[80]` i `constants.ts`: `total`, `mother`, `father`, `shared`, `fatherOnly.total`, `fatherOnly.noRequirement`, `fatherOnly.withRequirement`.

Verdier per docs ved 100 % / 80 %:

| Felt | 100 % | 80 % |
|---|---|---|
| total | 49 | 61 (NAV: og 1 dag) |
| mother | 15 | 19 |
| father | 15 | 19 |
| shared | 16 | 20 (NAV: og 1 dag) |
| fatherOnly.total | 40 | 52 (NAV: og 1 dag) |
| fatherOnly.noRequirement | 10 | 10 |
| fatherOnly.withRequirement | 30 | 42 (NAV: og 1 dag) |

Tabellen er en huskeliste.
Docs er fasit: ved ulikhet gjelder docs, og tabellen her skal oppdateres.

## 3. Feriepenger

Kilde: seksjonen "Feriepenger av foreldrepenger" i `docs/nav/foreldrepenger.md`.

- Sats 10,2 % er lik `FERIEPENGER_RATE` (0.102).
- Uker som teller: 12 ved 100 % og 15 ved 80 %, lik `FERIEPENGER_NAV_WEEKS`.

## 4. Barnehagerett

Kilde: `docs/nav/barnehagerett.md`, tabellen "Praktisk oppsummering for kalkulatoren".
Sammenlign mot `getDefaultDaycareStart` i `src/lib/calculator/index.ts`:

- Jan-aug-fødte: 1. august året etter fødsel.
- Sep/okt/nov-fødte: fødselsmåneden året etter (koden bruker den 1. i måneden som tidligste start).
- Des-fødte: 1. august to år etter fødselsåret.

## Rapportformat

Grupper funnene slik, og list alt som er OK til slutt med ✓:

```
## Avvik funnet

### Kritisk (påvirker beregninger)
- G er <docs-verdi> i docs men <kode-verdi> i constants.ts
  → Oppdater: export const G = <docs-verdi>; // Per 1. mai <år>

### Advarsel (avrunding/datokommentar)
- LEAVE_CONFIG[80].shared er 20 - NAV sier "20 uker og 1 dag"
  → Avrunding er bevisst - legg til kommentar hvis den mangler

## OK
- FERIEPENGER_RATE: 0.102 ✓
```

## Regler for forslag

- Foreslå endring i `constants.ts` bare når docs viser en annen numerisk verdi.
- "og 1 dag"-tilfeller er bevisst avrunding til hele uker: flagg som advarsel bare hvis kommentar mangler på linjen.
- Hvis `Hentet:`-datoen i `docs/nav/*.md` er eldre enn ca. 6 måneder, anbefal å kjøre `nav-scrape` først, siden docs da kan være utdatert.

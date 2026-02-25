# Grunnbeløpet i folketrygden (G) – NAV

> Kilde: https://www.nav.no/grunnbelopet
> Hentet: 2026-02-25

Grunnbeløpet (G) er et tall som brukes til å beregne mange av NAVs utbetalinger. Det oppdateres **1. mai hvert år** og bestemmes av Stortinget etter trygdeoppgjøret.

---

## Gjeldende grunnbeløp

| Dato og år | Grunnbeløpet (G) | Gjennomsnitt per år | Omregningsfaktor |
|---|---|---|---|
| **1. mai 2025** | **130 160 kroner** | 128 116 kroner | 1,049440 (+4,94%) |
| 1. mai 2024 | 124 028 kroner | 122 225 kroner | 1,045591 (+4,56%) |

> **Merk:** Gjennomsnitt per år er lavere enn selve grunnbeløpet fordi beløpet oppdateres 1. mai (ikke 1. januar).

---

## Relevante G-baserte beløp (per 1. mai 2025)

| Multiplum | Beløp |
|---|---|
| 1G | 130 160 kr |
| 3G | 390 480 kr |
| 6G (maks foreldrepenger) | **780 960 kr** |

---

## Bruk i kalkulatoren

```typescript
// src/lib/constants.ts
const G = 130_160;  // Per 1. mai 2025 — oppdater 1. mai hvert år

// Maks beregningsgrunnlag for foreldrepenger
const MAKS_GRUNNLAG = 6 * G;  // 780 960 kr
```

> **Viktig:** Bruk alltid konstanten fra `src/lib/constants.ts`, ikke hardkod verdien andre steder.

---

## Når oppdateres G?

- Oppdateres **1. mai** hvert år
- Bestemt av Stortinget etter trygdeoppgjøret
- Neste oppdatering: **1. mai 2026** (beløp ikke kjent ennå)

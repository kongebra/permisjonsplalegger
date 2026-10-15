# Grunnbeløpet i folketrygden (G) – NAV

> Kilde: https://www.nav.no/grunnbelopet
> Hentet: 2026-10-15

Grunnbeløpet (G) er et tall som brukes til å beregne mange av NAVs utbetalinger. Det oppdateres **1. mai hvert år** og bestemmes av Stortinget etter trygdeoppgjøret.

---

## Gjeldende grunnbeløp

| Dato og år | Grunnbeløpet (G) | Gjennomsnitt per år | Omregningsfaktor |
|---|---|---|---|
| **1. mai 2026** | **136 549 kroner** | (ikke hentet) | 1,049085 (+4,91%) |
| 1. mai 2025 | 130 160 kroner | 128 116 kroner | 1,049440 (+4,94%) |
| 1. mai 2024 | 124 028 kroner | 122 225 kroner | 1,045591 (+4,56%) |

> **Merk:** Gjennomsnitt per år er lavere enn selve grunnbeløpet fordi beløpet oppdateres 1. mai (ikke 1. januar).

---

## Relevante G-baserte beløp (per 1. mai 2026)

| Multiplum | Beløp |
|---|---|
| 1G | 136 549 kr |
| 3G | 409 647 kr |
| 6G (maks foreldrepenger) | **819 294 kr** |

---

## Bruk i kalkulatoren

```typescript
// src/lib/constants.ts
const G = 136_549;  // Per 1. mai 2026 — oppdater 1. mai hvert år

// Maks beregningsgrunnlag for foreldrepenger
const MAKS_GRUNNLAG = 6 * G;  // 819 294 kr
```

> **Viktig:** Bruk alltid konstanten fra `src/lib/constants.ts`, ikke hardkod verdien andre steder.

---

## Når oppdateres G?

- Oppdateres **1. mai** hvert år
- Bestemt av Stortinget etter trygdeoppgjøret
- Neste oppdatering: **1. mai 2027** (beløp ikke kjent ennå)

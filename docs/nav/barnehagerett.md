# Rett til plass i barnehage – Barnehageloven § 16

> Kilde: https://lovdata.no/nav/lov/2005-06-17-64/kapIV/%C2%A716
> Hentet: 2026-02-25

Barnehageloven kapittel IV regulerer kommunenes oppgaver, inkludert retten til barnehageplass. Dette er direkte relevant for kalkulatoren – barnehagestart bestemmer lengden på det ubetalte «gapet» mellom endt permisjon og barnehagestart.

---

## § 16. Rett til plass i barnehage (fulltekst)

> **Ledd 1:** Barn som fyller ett år **senest innen utgangen av august** det året det søkes om barnehageplass, har etter søknad rett til å få plass i barnehage fra **august** i samsvar med denne loven med forskrifter.
>
> **Ledd 2:** Barn som fyller ett år i **september, oktober eller november** det året det søkes om barnehageplass, har etter søknad rett til å få plass i barnehage innen utgangen av den **måneden barnet fyller ett år**.
>
> **Ledd 3:** Barnet har rett til plass i barnehage i den kommunen der det er bosatt.
>
> **Ledd 4:** Søknadsfrist til opptaket fastsettes av kommunen.

---

## Praktisk oppsummering for kalkulatoren

| Fødselsmåned | Tidligste rett til barnehageplass |
|---|---|
| Januar–August | **1. august** samme år som barnet fyller 1 |
| September | Innen **30. september** samme år som barnet fyller 1 |
| Oktober | Innen **31. oktober** samme år som barnet fyller 1 |
| November | Innen **30. november** samme år som barnet fyller 1 |
| **Desember** | **1. august** *neste* år (barnet er da ~1 år og 8 mnd) |

> **Eksempel:** Barn født 15. mars 2024 → rett til plass fra 1. august 2025.
> **Eksempel:** Barn født 5. september 2024 → rett til plass innen 30. september 2025.
> **Eksempel:** Barn født 10. desember 2024 → tidligst 1. august 2026.

---

## Implementasjon i kalkulatoren

Kalkulatoren bruker en forenklet modell med to regler (se `CLAUDE.md` avsnitt 10):

```typescript
// src/lib/calculator/dates.ts
function calcDaycareStart(dueDate: Date): Date {
  const year = dueDate.getFullYear();
  const augustFirst = new Date(year, 7, 1); // August = måned 7 (0-indeksert)

  if (dueDate >= augustFirst) {
    // Født i august–desember → neste august-opptak er 2 år frem
    return new Date(year + 2, 7, 1);
  }
  // Født januar–juli → august-opptak neste år
  return new Date(year + 1, 7, 1);
}
```

> **Forenkling:** Kalkulatoren skiller ikke mellom september/oktober/november-fødte
> (som teknisk kan starte en måned eller to tidligere). Denne forenklingen aksepteres fordi:
> 1. Disse foreldrene velger vanligvis august-opptak uansett (søknadsfrist passer)
> 2. Avviket er maksimalt 3 måneder ekstra «gap» i worst case
> 3. Økt kompleksitet er ikke verdt det for MVP

---

## § 17. Samordnet opptaksprosess

Alle godkjente barnehager i kommunen **skal samarbeide om opptak**. Kommunen legger til rette for en samordnet opptaksprosess med likebehandling av barn og likebehandling av kommunale og private barnehager.

> Relevans for kalkulatoren: Søknadsfrist fastsettes lokalt – typisk 1. mars for august-opptak.

---

## § 18. Prioritet ved opptak

Følgende barn har **prioritet** ved opptak:
1. Barn med nedsatt funksjonsevne (etter sakkyndig vurdering)
2. Barn med vedtak etter barnevernsloven § 5-1, § 3-1, og § 3-4

> Relevans for kalkulatoren: Lav – påvirker ikke beregning av gap/kostnad.

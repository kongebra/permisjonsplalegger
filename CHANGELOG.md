# Changelog

## 2026-02-24 (2)

### Fikset: Feriedager trekker nå fra norske helligdager

Når du velger en ferieperiode som inneholder helligdager (f.eks. påske, jul), vil kalkulatoren nå korrekt vise antall **feriedager** du faktisk bruker — ikke antall vanlige arbeidsdager.

Tidligere ble skjærtorsdag, langfredag og andre helligdager feilaktig talt med som feriedager. Nå trekkes de fra automatisk, tilpasset om du jobber kontortid eller skift.

I tillegg er det fikset en mangel i datovelgeren der skjermlesere ikke fikk oppgitt et navn på dialogboksen (UU-krav).

---

## 2026-02-24

### Fikset: Far-only permisjonsberegning

Rettet flere feil i beregningen for scenariet der kun far/medmor har rett til foreldrepenger:

- **Feil varighet:** Appen brukte 49/61 uker (fellesperiode inkludert). NAV-regelverket sier 40 uker (100%) eller 52 uker (80%).
- **Feil startdato:** Permisjonen startet 3 uker før termin. Skal starte på termindato.
- **Manglende aktivitetskrav-visning:** Appen viste én samlet periode. NAV deler dette i to: 10 uker uten aktivitetskrav + 30/42 uker med aktivitetskrav.

Endringer:
- Ny konfigurasjon `fatherOnly` i `LEAVE_CONFIG` med korrekte uker
- Ny segmenttype `activity-required` i kalenderen
- Kalendervisning splittet i to segmenter med riktig startdato
- Informasjonsboks i wizard og kalender forklarer aktivitetskravet
- Dokumentasjon i `docs/nav/foreldrepenger.md` oppdatert

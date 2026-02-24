# Changelog

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

# Ideer og backlog

## Kjente bugs

- Klikke på en dag flere ganger «spiser» uker for mor – kvotetelling trigges feil ved gjentatt klikk
- Wizard: barnehagestart-datepicker viser dagens dato i stedet for estimert dato fra termindato
- Termindato-valg: vanskelig å hoppe mer enn én måned frem/tilbake – må utvide komponentet

## UI-issues

- Wizard-sidene bør helst passe på én skjermhøyde uten scrolling. Vurder mer kompakte komponenter, spesielt på mobil. Oppsummerings-steget kan være unntaket.

## Feature-ideer

### Feriedager før/etter permisjon

**Mor:** Legg inn antall feriedager etter permisjon. Valgfri checkbox: «Skal tas ut i fars permisjon» (mor er hjemme men tar ferie mens far har permisjon). Hvis ikke avhuket, dyttes fars permisjon tilsvarende.

**Far/Medmor:** To linjer:
- Feriedager *før* permisjon (med tilsvarende checkbox om de skal tas i mors permisjon)
- Feriedager *etter* permisjon (legges bare på i kalender)

### Diagonal fargedeling for felles dager

I stedet for én oransje farge for fellesperiode, split dagcellen diagonalt: øverste venstre = mors farge, nederste høyre = fars farge. Gjelder også de 2 første ukene etter fødsel.

### Barnehagestart – smartere dato

I stedet for kun august-opptak, vis «Tidligst barnehagestart: [dato]» tydelig i appen med forbehold om at faktisk oppstart kan variere. Se `docs/nav/barnehagerett.md` for lovhjemmel og logikk. Kan vurdere å støtte september/oktober/november-opptak for barn født i disse månedene.

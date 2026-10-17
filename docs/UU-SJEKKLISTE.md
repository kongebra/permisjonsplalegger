# UU-sjekkliste (Universell Utforming)

Kilde: https://www.uutilsynet.no/wcag-standarden/wcag-standarden/86

---

## Verktøy og automatisering

| Verktøy | Status | Beskrivelse |
|---------|--------|-------------|
| `eslint-plugin-jsx-a11y` | Installert | Kjører med `bun run lint`. Recommended-regler aktivert. |
| `bun run build` | Bestått | Verifiserer gyldig HTML og ingen kompileringsfeil. |
| `bun run test:a11y` | Finnes | Playwright med axe-core (`e2e/a11y-*.spec.ts`) på wizard, kalender, årsoversikt og periode-modal. `e2e/plassering.spec.ts` kjører axe, inkludert kontrast, på «Ny periode» for hver rettighet. |
| axe DevTools | Ikke gjort | Kjør manuelt i Chrome på `/planlegger` og `/planlegger/kalender`. |

---

## Sjekkliste for nye features

For hver ny feature SKAL følgende verifiseres før push:

### Automatisert
- [ ] `bun run lint` passerer (inkl. jsx-a11y)
- [ ] `bun run build` passerer
- [ ] `bun run test:a11y` passerer

### Tastatur
- [ ] Alle nye interaktive elementer er tilgjengelige med Tab, Enter, Space, Escape
- [ ] Synlig fokusring på alle nye knapper/kontroller
- [ ] Ingen tastaturfeller

### Skjermleser
- [ ] Nye knapper har beskrivende tekst eller `aria-label`
- [ ] Nye skjemafelt har tilhørende `<label>` eller `aria-labelledby`
- [ ] Statusendringer annonseres med `aria-live`
- [ ] Dekorative ikoner har `aria-hidden="true"`

### Visuell
- [ ] Ny tekst har kontrastforhold >= 4.5:1 (3:1 for stor tekst)
- [ ] Informasjon formidles ikke kun med farge
- [ ] Fungerer ved 200% nettleserzoom
- [ ] Reflow (1.4.10): ingen vannrett scrolling ved 320 px bredde, se "Reflow ved 320 px" under
- [ ] Focus Not Obscured (2.4.11): fokusert element er aldri helt skjult av klebrige flater, se "Focus Not Obscured" under

### Semantikk
- [ ] Korrekte HTML-elementer brukt (`<button>` for handlinger, `<a>` for lenker)
- [ ] Overskriftshierarki er logisk (h1 → h2 → h3)
- [ ] Lister bruker `<ul>`/`<ol>`/`<li>`

---

## Mønstre vi bruker

Disse mønstrene er etablert i kodebasen og SKAL gjenbrukes:

| Mønster | Brukes i | Beskrivelse |
|---------|----------|-------------|
| `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none` | Alle custom-knapper | Standard fokusring |
| `role="img" aria-label="..."` | Fargeprøver i legender | Ikke-tekst innhold |
| `<fieldset role="radiogroup">` + `<legend>` + native `<input type="radio">` | Type, Forelder, Plassering og Farge i PeriodModal | Gjensidig utelukkende valg, se "Radiogrupper" under |
| `aria-pressed={boolean}` | Kun ekte av/på-knapper | Ikke bruk til valg der bare ett kan være valgt |
| `<fieldset>` + `<legend>` | Ja/Nei toggle-par | Gruppering av relaterte kontroller |
| `aria-labelledby` + `aria-valuetext` | Sliders | Skjermleserstøtte for verdier |
| `aria-live="polite"` + `aria-atomic="true"` | PlannerCalendar, sliders | Dynamiske oppdateringer |
| `aria-live="assertive"` + `role="alert"` | Wizard hint-boks | Feilmeldinger |
| `<nav aria-label="...">` | Wizard sticky-navigasjon | Navigasjonslandemerke |
| `<ul>` + `<li>` | Legender | Semantiske lister |

---

## Radiogrupper

Valg der bare ett kan være valgt er native radioknapper, ikke knapper med `aria-pressed`.
PeriodModal bruker `ChoiceGroup` for Type, Forelder og Plassering, og samme mønster for fargene.

- Gruppen er en `<fieldset role="radiogroup">` med `<legend>`, og navnet kommer fra legenden (`aria-labelledby`).
- Hver rad er en `<label>` rundt radioen, slik at hele raden er klikkflate (minst 44 px høy).
- Radioens navn er den korte teksten (`aria-labelledby`).
  Datolinjen og andre forklaringer ligger utenfor navnet og kobles med `aria-describedby`.
- Ingen `GlossaryTerm` eller annen knapp inne i en radiolabel.
- Alle radioer i en gruppe har samme `name`, slik at nettleseren flytter valget med piltaster.
- Valgt rad vises med fylt radio, tykkere kantlinje og bakgrunn, så valget ikke bare formidles med farge.
- Fokusringen ligger på raden (`has-[:focus-visible]`).
- Valg som ikke gjelder fjernes fra lista i stedet for å vises deaktivert.
  Hvis det valgte valget forsvinner, velges standard og endringen annonseres.

### Tastaturflyt i PeriodModal

- Tab går til Type, Forelder og Plassering, og stopper én gang per gruppe, på valgt radio.
- Piltaster (opp/ned og venstre/høyre) flytter både fokus og valg innenfor gruppen, og datoene regnes ut med en gang.
- Tab går ut av gruppen til neste gruppe.
  Fra og Til er skjult til "Velg datoer selv" er valgt, og kommer da rett etter plasseringen i tabrekkefølgen.
- Fra og Til har navn som inneholder datoen, f.eks. "Fra 23. nov. 2026", via `aria-labelledby` på synlig label og synlig verdi.
- Escape lukker dialogen.

### Live-region i PeriodModal

- Dialogen har én live-region (`aria-live="polite"` og `aria-atomic="true"`) med en kort setning, f.eks. "Valgene gjelder nå far. Ferie 3. mai 2027 til 16. mai 2027."
- Regionen er tom når dialogen åpnes, og fylles først etter en handling fra brukeren.
- Advarselen om ferie i permisjonen er vanlig synlig tekst utenfor regionen, så to meldinger ikke annonseres samtidig.

---

## Reflow ved 320 px

WCAG 1.4.10: innholdet skal kunne brukes ved 320 CSS-piksler bredde uten vannrett scrolling.

- Dialoger har `max-h-[90dvh]` og `overflow-y-auto`, ikke `vh`, slik at mobilnettlesernes adresselinje ikke skjuler bunnen.
- Dialogen har margin mot skjermkanten (`max-w-[calc(100%-2rem)]`) og `p-4` på smal skjerm.
- Rader og knapper får lov til å bryte tekst, uten faste bredder.
- Sjekk: Playwright-testen i `e2e/plassering.spec.ts` åpner dialogen ved 320 x 568 px og feiler hvis dialogen scroller vannrett eller går utenfor skjermen.

## Focus Not Obscured

WCAG 2.4.11: et fokusert element skal aldri være helt skjult av innhold som ligger over det.

- Dialoger har ingen klebrig footer eller klebrig konsekvensboks.
  Footer ligger sist i innholdet og scroller med.
- Tidligere klebrige flater sammen med `p-6` ga fokus bak innhold på 375 px.
  Hvis en klebrig flate trengs senere, må den kombineres med `scroll-padding-bottom` som er minst like høy som flaten.
- Sjekk: Playwright-testen tabber gjennom dialogen ved 320 px og kontrollerer at hvert fokuserte element ligger innenfor dialogen og ikke dekkes av noe annet.

---

## Kjente begrensninger

- **High Contrast Mode**: Ikke testet. Bør verifiseres manuelt.
- **VoiceOver**: Ikke systematisk testet. Bør gjøres for wizard-flow og periode-opprettelse.
  Radiogruppene i PeriodModal (navn, posisjon, datolinje som beskrivelse) og live-regionen er bare verifisert med axe og Playwright, ikke lest opp av en skjermleser.
- **Kontrast i PeriodModal**: axe-testene måler kontrast i dialogen (WCAG AA), men valgt-tilstand i mørk modus er ikke målt.
- **Likviditetsgrafen** (`CumulativeLiquidityChart`): håndlaget SVG med `role="img"` og `aria-label`, men uten tabellfallback. Skjermleserbrukere får ikke tallene.

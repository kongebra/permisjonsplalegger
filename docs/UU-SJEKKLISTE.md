# UU-sjekkliste (Universell Utforming)

Kilde: https://www.uutilsynet.no/wcag-standarden/wcag-standarden/86

Sist oppdatert: 2026-02-10

---

## Verktøy og automatisering

| Verktøy | Status | Beskrivelse |
|---------|--------|-------------|
| `eslint-plugin-jsx-a11y` | Installert | Kjører med `bun run lint`. Recommended-regler aktivert. |
| `bun run build` | Bestått | Verifiserer gyldig HTML og ingen kompileringsfeil. |
| axe DevTools | SJEKK | Kjør manuelt i Chrome på `/planlegger` og `/planlegger/kalender`. |

---

## Sjekkliste for nye features

For hver ny feature SKAL følgende verifiseres før push:

### Automatisert
- [ ] `bun run lint` passerer (inkl. jsx-a11y)
- [ ] `bun run build` passerer

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
| `aria-pressed={boolean}` | Toggle-knapper i PeriodModal | Valgt-tilstand |
| `<fieldset>` + `<legend>` | Ja/Nei toggle-par | Gruppering av relaterte kontroller |
| `aria-labelledby` + `aria-valuetext` | Sliders | Skjermleserstøtte for verdier |
| `aria-live="polite"` + `aria-atomic="true"` | PlannerCalendar, sliders | Dynamiske oppdateringer |
| `aria-live="assertive"` + `role="alert"` | Wizard hint-boks | Feilmeldinger |
| `<nav aria-label="...">` | Wizard sticky-navigasjon | Navigasjonslandemerke |
| `<ul>` + `<li>` | Legender | Semantiske lister |

---

## Kjente begrensninger

- **High Contrast Mode**: Ikke testet. Bør verifiseres manuelt.
- **VoiceOver**: Ikke systematisk testet. Bør gjøres for wizard-flow og periode-opprettelse.
- **Diagrammer (Recharts)**: SVG-basert. Kan ha begrenset skjermleserstøtte. Vurder `aria-label` på `<svg>` og tabellfallback.

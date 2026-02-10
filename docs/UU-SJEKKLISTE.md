# UU-sjekkliste (Universell Utforming)

Kilde: https://www.uutilsynet.no/wcag-standarden/wcag-standarden/86

Denne sjekklisten dekker alle 35 WCAG-suksesskriterier (nivå A og AA) som UU-tilsynet krever for norske nettsider rettet mot privat sektor.

Sist oppdatert: 2026-02-10

---

## Status-forklaring

- OK = Oppfylt
- N/A = Ikke relevant for denne appen
- SJEKK = Krever manuell verifisering ved endringer

---

## Prinsipp 1: Mulig å oppfatte

| # | Krav | Nivå | Status | Implementering |
|---|------|------|--------|----------------|
| 1.1.1 | Ikke-tekstlig innhold | A | OK | Ingen `<img>`-tagger. SVG-ikoner (Lucide) med `aria-label`/`aria-hidden`. Fargeprøver i legender har `role="img"` + `aria-label`. |
| 1.2.1 | Bare lyd/video | A | N/A | Ingen lyd/video. |
| 1.2.2 | Teksting (forhåndsinnspilt) | A | N/A | Ingen video. |
| 1.3.1 | Informasjon og relasjoner | A | OK | Sliders har `aria-labelledby`. Toggle-par pakket i `<fieldset>`/`<legend>`. Semantiske landemerker (`<nav>`, `<main>`, `<header>`, `<footer>`). Lister bruker `<ul>`/`<li>`. |
| 1.3.2 | Meningsfylt rekkefølge | A | OK | DOM-rekkefølge = visuell rekkefølge. Wizard-steg i logisk sekvens. |
| 1.3.3 | Sensoriske egenskaper | A | OK | Instruksjoner bruker ikke kun form/farge/posisjon. |
| 1.4.1 | Bruk av farge | A | OK | Mønster (hatched/dashed/solid) differensierer periodetyper. Legender har tekstetiketter ved fargeprøver. `PeriodBandRenderer` bruker border-dashed for ferie og opacity for ulønnet. |
| 1.4.2 | Styring av lyd | A | N/A | Ingen lyd. |
| 1.4.3 | Kontrast (minimum) | AA | OK | `--muted-foreground` justert til L=0.45 (>4.5:1). `--warning-fg` justert til L=0.44. Alle tekstfarger verifisert mot bakgrunn. |
| 1.4.4 | Endring av tekststørrelse | AA | OK | Tailwind bruker `rem`. Wizard har `pb-32`+`scroll-pb-32` for sticky-knapper. DayDetailPanel maks 40vh. |
| 1.4.5 | Bilder av tekst | AA | OK | Ingen bilder av tekst. |

---

## Prinsipp 2: Mulig å betjene

| # | Krav | Nivå | Status | Implementering |
|---|------|------|--------|----------------|
| 2.1.1 | Tastatur | A | OK | `PeriodBandRenderer`: `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space). DayCell (non-interactive): `tabIndex`, `onKeyDown`. Alle custom-knapper har tastaturstotte. |
| 2.1.2 | Ingen tastaturfelle | A | OK | Radix Dialog fokusfangst. Escape lukker modaler. |
| 2.2.1 | Justerbar hastighet | A | N/A | Ingen tidsbegrensninger. |
| 2.2.2 | Pause, stopp, skjul | A | OK | Animasjoner respekterer `prefers-reduced-motion` (`globals.css`). |
| 2.3.1 | Tre glimt | A | OK | Ingen blinkende innhold. |
| 2.4.1 | Hoppe over blokker | A | OK | Skip-link i `layout.tsx` ("Hopp til hovedinnhold" -> `#main`). |
| 2.4.2 | Sidetitler | A | OK | `/planlegger` = "Planlegger | Permisjonsøkonomi-kalkulator". `/planlegger/kalender` = "Kalender | Permisjonsøkonomi-kalkulator". |
| 2.4.3 | Fokusrekkefølge | A | OK | Logisk tabindex-rekkefølge. Wizard-navigasjon i `<nav>`. |
| 2.4.4 | Formal med lenke | A | OK | Svart fa lenker - knapper har beskrivende tekst. |
| 2.4.5 | Flere mater | AA | OK | Kalkulator-app med en navigasjonsvei (akseptabelt). Sidetitler differensierer sider. |
| 2.4.6 | Overskrifter og ledetekster | AA | OK | Beskrivende overskrifter og labels gjennomgaende. |
| 2.4.7 | Synlig fokus | AA | OK | `focus-visible:ring-2 focus-visible:ring-primary` pa alle custom-knapper, periodeband, fargevelger, plassering-knapper, YearOverview. |

---

## Prinsipp 3: Forstaelig

| # | Krav | Nivå | Status | Implementering |
|---|------|------|--------|----------------|
| 3.1.1 | Sprak pa siden | A | OK | `lang="no"` i `<html>` (`layout.tsx`). |
| 3.1.2 | Sprak pa deler | AA | OK | All tekst er norsk. Ingen blandede sprak i UI. |
| 3.2.1 | Fokus | A | OK | Ingen automatiske sideendringer ved fokus. |
| 3.2.2 | Inndata | A | OK | Skjemafelt utloser ikke uventede sideendringer. |
| 3.2.3 | Konsekvent navigering | AA | OK | Konsekvent mellom wizard-steg og planner-sider. |
| 3.2.4 | Konsekvent identifikasjon | AA | OK | Knapper og kontroller bruker konsekvent design. |
| 3.3.1 | Identifikasjon av feil | A | OK | Alert-boks med `role="alert"`, `aria-atomic="true"`, `aria-live="assertive"`. |
| 3.3.2 | Ledetekster eller instruksjoner | A | OK | Labels pa skjemafelt. Wizard gir instruksjoner per steg. Tooltip-hjelp med `aria-label`. |
| 3.3.3 | Forslag ved feil | AA | OK | Hint-meldinger foreslår hva som ma fylles ut. |
| 3.3.4 | Forhindring av feil | AA | N/A | Ingen juridisk bindende transaksjoner. |

---

## Prinsipp 4: Robust

| # | Krav | Nivå | Status | Implementering |
|---|------|------|--------|----------------|
| 4.1.1 | Oppdeling (parsing) | A | OK | `bun run build` passerer uten feil. React genererer gyldig HTML. |
| 4.1.2 | Navn, rolle, verdi | A | OK | Periodeband har `role="button"` + `aria-label`. Toggle-par i `<fieldset>` med `aria-label`. Sliders med `aria-labelledby` + `aria-valuetext`. Skjermleser-annonsering via `aria-live`. |

---

## Verktoy og automatisering

| Verktoy | Status | Beskrivelse |
|---------|--------|-------------|
| `eslint-plugin-jsx-a11y` | Installert | Kjorer med `bun run lint`. Recommended-regler aktivert. |
| `bun run build` | Bestatt | Verifiserer gyldig HTML og ingen kompileringsfeil. |
| axe DevTools | SJEKK | Kjor manuelt i Chrome pa `/planlegger` og `/planlegger/kalender`. |

---

## Sjekkliste for nye features

For hver ny feature SKAL folgende verifiseres for push:

### Automatisert

- [ ] `bun run lint` passerer (inkl. jsx-a11y)
- [ ] `bun run build` passerer

### Tastatur

- [ ] Alle nye interaktive elementer er tilgjengelige med Tab, Enter, Space, Escape
- [ ] Synlig fokusring pa alle nye knapper/kontroller
- [ ] Ingen tastaturfeller

### Skjermleser

- [ ] Nye knapper har beskrivende tekst eller `aria-label`
- [ ] Nye skjemafelt har tilhorende `<label>` eller `aria-labelledby`
- [ ] Statusendringer annonseres med `aria-live`
- [ ] Dekorative ikoner har `aria-hidden="true"`

### Visuell

- [ ] Ny tekst har kontrastforhold >= 4.5:1 (3:1 for stor tekst)
- [ ] Informasjon formidles ikke kun med farge
- [ ] Fungerer ved 200% nettleserzoom

### Semantikk

- [ ] Korrekte HTML-elementer brukt (`<button>` for handlinger, `<a>` for lenker)
- [ ] Overskriftshierarki er logisk (h1 -> h2 -> h3)
- [ ] Lister bruker `<ul>`/`<ol>`/`<li>`

---

## Monstere vi bruker

Disse monsterne er etablert i kodebasen og SKAL gjenbrukes:

| Monster | Brukes i | Beskrivelse |
|---------|----------|-------------|
| `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none` | Alle custom-knapper | Standard fokusring |
| `role="img" aria-label="..."` | Fargeprover i legender | Ikke-tekst innhold |
| `aria-pressed={boolean}` | Toggle-knapper i PeriodModal | Valgt-tilstand |
| `<fieldset>` + `<legend>` | Ja/Nei toggle-par | Gruppering av relaterte kontroller |
| `aria-labelledby` + `aria-valuetext` | Sliders | Skjermleserstotte for verdier |
| `aria-live="polite"` + `aria-atomic="true"` | PlannerCalendar, sliders | Dynamiske oppdateringer |
| `aria-live="assertive"` + `role="alert"` | Wizard hint-boks | Feilmeldinger |
| `<nav aria-label="...">` | Wizard sticky-navigasjon | Navigasjonslandemerke |
| `<ul>` + `<li>` | Legender | Semantiske lister |

---

## Kjente begrensninger

- **High Contrast Mode**: Ikke testet. Bor verifiseres manuelt.
- **VoiceOver**: Ikke systematisk testet. Bor gjores for wizard-flow og periode-opprettelse.
- **Diagrammer (Recharts)**: SVG-basert. Kan ha begrenset skjermleserstotte. Vurder `aria-label` pa `<svg>` og tabellfallback.

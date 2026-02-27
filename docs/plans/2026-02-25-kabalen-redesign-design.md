# Design: "Kabalen"-redesign — identitet, kalender og økonomi

**Dato:** 2026-02-25
**Status:** Godkjent av bruker

---

## Bakgrunn

Appen heter i dag "Permisjonsøkonomi-kalkulator" og er beskrevet som et verktøy for å sammenligne 80% og 100% foreldrepermisjon. Dette er feil fokus.

Det primære bruksbehovet er: *"Få kabalen til å gå opp."* Det vil si — at foreldrepermisjonen rekker frem til barnehagestart, at familien vet hva de har i inntekt måned for måned, og at 80/100-valget er svaret på et helhetlig regnestykke, ikke spørsmålet i seg selv.

Primærbrukeren er et foreldrepar som sitter sammen på én mobil og planlegger permisjon.

---

## Valgt tilnærming: Koordinert helhet (C)

Plan, identitet, kalender og økonomi planlegges som én sammenhengende redesign og implementeres i tre faser. Hver fase er leverbar alene.

---

## Fase 1 — Identitet & SEO

### Ny identitet

- **Appnavn:** `Permisjonsplanleggeren`
- **Tagline:** *"Få kabalen til å gå opp — permisjon, barnehage og økonomi samlet på ett sted"*
- **Fokus-shift:** 80% vs 100% er svaret, ikke spørsmålet. Kabalen er spørsmålet.

### Landingsside på `/`

Fjern permanent redirect fra `/` til `/planlegger`. Lag en ekte landingsside med:

- **H1:** "Permisjonsplanleggeren — få kabalen til å gå opp"
- **Tre svar på spørsmål folk faktisk søker på:**
  - "Burde jeg velge 80% eller 100% foreldrepermisjon?"
  - "Rekker permisjonen til barnehagestart?"
  - "Hva har familien i inntekt under permisjon?"
- **CTA:** "Start planleggingen" → `/planlegger`
- **USP vs NAV:** Rask, gratis, ingen innlogging — fremhev dette eksplisitt

**Ingen blogg, ingen artikler.** Én god side er nok for SEO.

### SEO-metadata

Oppdater `layout.tsx`:
- `title.default`: "Permisjonsplanleggeren"
- `description`: Reframe mot planlegging og "kabalen", ikke 80/100-sammenligning
- `keywords`: legg til "permisjonsplanlegging", "barnehagestart og foreldrepermisjon", "økonomi foreldrepermisjon", "burde jeg velge 80 eller 100 prosent"
- `dateModified` i JSON-LD: oppdater løpende

### Wizard-velkomst

Legg til en innledningsskjerm (eller oppdater `WelcomeIntro`) som setter rammen:
> *"Hva skal du få ut av dette?*
> ✓ Se om permisjonen rekker til barnehagestart
> ✓ Finn ut hvilken økonomi dere har måned for måned
> ✓ Velg 80% eller 100% basert på hva som faktisk passer"*

---

## Fase 2 — Kalender & oversikt

### Persistent permisjonshorisont-banner

En smal, alltid-synlig tidslinje øverst i kalenderen som viser:
- Hele buen: permisjonsstart → permisjonsslutt → gap → barnehagestart
- En markør som viser hvilken måned brukeren ser på nå ("du er her")
- Ikke interaktiv i seg selv, men tydelig og alltid til stede

### Nøkkeltall-strip

Tre tall alltid synlig under banneret:
- `Permisjon: X uker igjen`
- `Gap: Y uker` (rød hvis > 0 og ikke dekket av ferie)
- `Barnehagestart: DD. MMM`

### Mini-måneder (A/B-test via PostHog)

**Eksperiment:** Vis mini-måneder for forrige og neste måned i en strip over/under hoveddmåneden.

- **Variant A:** Horisontal strip med tre mini-måneder (forrige | nå | neste)
- **Variant B:** Ingen strip (nåværende opplevelse)
- **PostHog feature flag:** `calendar-mini-months`
- **Suksessmetrikk:** Antall månedsskift per sesjon, tid i kalender

**Note:** Prototyperes og evalueres på ekte mobil (375px) før låsing. Eksisterende `MiniMonth`-komponent gjenbrukes.

### PostHog feature flags som standard eksperiment-infrastruktur

PostHog er allerede integrert. Bruk feature flags for alle fremtidige UI-eksperimenter. Ikke bestem layout i kode — test det.

### Mobiloppsett

- Dagceller litt høyere for lettere trykking
- Periodestriper tydeligere (litt mer kontrast/høyde)
- FAB-knapp beholdes — fungerer godt

---

## Fase 3 — Månedlig økonomi

### Nytt månedsvisningspanel (erstatter/utvider `PlannerEconomy`)

Én rad per måned i permisjonsperioden:

```
Måned      | Mor        | Far       | Totalt     | vs normalt
Okt 2025   | 28 000 kr  | 0 kr      | 28 000 kr  | −12 000 kr
Nov 2025   | 28 000 kr  | 22 000 kr | 50 000 kr  | −5 000 kr
```

- **"Normal"-linje** øverst: hva familien tjener uten permisjon
- **Differanse** vist per måned (− = tap, + = gevinst)
- **Fargeindikator:** grønn (OK), gul (nær grense), rød (under) — brukeren setter selv "månedlig minstegrense" i innstillinger
- **Feriemåneder** markert med ikon og justert inntekt (feriepenger inn)

---

## Tekniske forutsetninger

- PostHog allerede integrert — feature flags aktiveres i PostHog-dashboardet, ingen ekstra pakke nødvendig
- `MiniMonth`-komponent eksisterer i `src/components/planner/MiniMonth.tsx`
- `PlannerEconomy`-komponent eksisterer i `src/components/planner/PlannerEconomy.tsx`
- Alle datoberegninger bruker `date-fns` v4 (eksisterende konvensjon)

---

## Suksesskriterier

- En bruker som lander på `/` forstår hva appen gjør uten å klikke noe
- En bruker i kalenderen vet alltid "hvor langt er det til barnehagestart" uten å trykke på noe
- En familie kan svare på "har vi råd i mars?" ved å se på månedsvisningen
- 80/100-valget oppleves som en konklusjon, ikke startpunktet

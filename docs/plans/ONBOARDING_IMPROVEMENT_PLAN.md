# Forbedringsplan: Onboarding/Wizard (Mobilfokus)

> Basert på analyse fra 6 uavhengige ekspertagenter: 3x UI/UX-review (flyt, visuelt design, interaksjon) + 3x frontend-review (kodekvalitet, mobil-layout, design system).

---

## Sammendrag

Wizard-flyten har et **solid fundament** med shadcn/ui, Zustand state management, og en logisk stegstruktur. Men det finnes flere kritiske problemer som direkte påvirker brukervennligheten på mobil. Denne planen prioriterer forbedringer etter alvorlighetsgrad og brukerimpact.

---

## FASE 1: Kritiske bugs og blokkere

> Disse må fikses umiddelbart. De påvirker funksjonalitet eller troverdighet.

### 1.1 TOTAL_STEPS-mismatch (BUG)

**Identifisert av:** 5 av 6 agenter

`WizardContainer.tsx` definerer `TOTAL_STEPS = 8`, mens `wizardSlice.ts` har `TOTAL_STEPS = 7`. Det betyr at `nextStep()` aldri navigerer til steg 8 (SummaryStep) via normal navigasjon. I tillegg har `WizardProgress.tsx` bare 7 labels (mangler "Økonomi").

**Løsning:**
- Definer steg-konfigurasjon **ett sted** (f.eks. `src/lib/constants.ts` eller ny `src/lib/wizard-config.ts`)
- Eksporter `WIZARD_STEPS` array og `TOTAL_WIZARD_STEPS` konstant
- Importer og bruk overalt (WizardContainer, wizardSlice, WizardProgress)
- Legg til "Økonomi" i labels mellom "Jobb" og "Oppsummering"

**Filer:** `WizardContainer.tsx`, `wizardSlice.ts`, `WizardProgress.tsx`

---

### 1.2 Dynamiske Tailwind-klasser fungerer ikke (BUG)

**Identifisert av:** 3 av 6 agenter

I `JobSettingsStep.tsx` brukes template literals for å generere CSS-klasser (`border-${color}-200`). Tailwind purger klasser som ikke finnes statisk i kildekoden. Disse fargene rendres aldri.

**Løsning:**
```tsx
// Erstatt dynamisk generering med statisk map:
const borderColors = {
  mother: 'border-pink-200 dark:border-pink-800',
  father: 'border-blue-200 dark:border-blue-800',
};
```

**Filer:** `JobSettingsStep.tsx`

---

### 1.3 Manglende norske tegn (TROVERDIGHET)

**Identifisert av:** 6 av 6 agenter

Flere filer har systematisk manglende æ/ø/å. Dette ødelegger troverdigheten for norske brukere umiddelbart.

**Berørte filer:**
- `EconomyStep.tsx` — "Okonomisk", "lonn", "Maanedslonn", "for a beregne" osv.
- `WelcomeIntro.tsx` — "forsta okonomien", "pa din enhet", "nar som helst", "far"

**Løsning:** Gjennomgå og fiks alle norske spesialtegn i begge filer.

---

### 1.4 Tooltips fungerer ikke på mobil (UTILGJENGELIG)

**Identifisert av:** 5 av 6 agenter

`GlossaryTerm` og `HelpCircle`-tooltips i `EconomyStep` bruker hover-baserte Radix Tooltips. Touch-enheter har ikke hover — kritisk domeneinfo (dekningsgrad, 6G, feriepenger) er usynlig for mobilbrukere.

**Løsning:**
- Erstatt `Tooltip` med `Popover` (klikk/tap) for mobilbrukere
- Alternativt: vis forklaring inline under feltet
- Kan bruke media-query-basert betinget rendering: Tooltip på desktop, Popover på mobil

**Filer:** `glossary-term.tsx`, `EconomyStep.tsx`

---

## FASE 2: Mobilbrukervennlighet (høy prioritet)

> Disse forbedringene gjør wizard-flyten vesentlig bedre å bruke på mobil.

### 2.1 Sticky navigasjonsknapper i bunn

**Identifisert av:** 5 av 6 agenter (høyest konsensus)

"Tilbake" og "Neste"-knappene er i normal dokumentflyt og forsvinner ved scrolling. På lange steg (EconomyStep, SummaryStep) må brukeren scrolle helt ned. Dette er det **mest omtalte mobil-UX-problemet**.

**Løsning:**
```tsx
<div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t py-3 -mx-4 px-4">
  <div className="flex justify-between gap-4">
    <Button variant="outline" className="min-h-[44px]">Tilbake</Button>
    <Button className="min-h-[44px] flex-1">Neste</Button>
  </div>
</div>
```
- "Neste" bør ha `flex-1` for å signalisere primærhandling
- Legg til safe-area-padding for iPhone (env(safe-area-inset-bottom))
- Fjern `min-h-[400px]` fra step-container — la innholdet bestemme høyden

**Filer:** `WizardContainer.tsx`, `globals.css`

---

### 2.2 Touch targets minimum 44px

**Identifisert av:** 5 av 6 agenter

| Element | Nåværende | Mål |
|---------|-----------|-----|
| Nav-knapper (Button default) | 36px (h-9) | 44px (min-h-[44px]) |
| Slider thumb | 16px (size-4) | 24px visuelt + 44px touch-area |
| Calendar cells | 32px | 40px+ (via --cell-size) |
| Toggle-knapper (Ja/Nei) | 36px | 44px eller erstatt med Switch |
| Switch | 24px høyde | 28px (h-7) |
| "Start planleggingen" CTA | 40px (h-10) | 48px (h-12) |

**Filer:** `WizardContainer.tsx`, `slider.tsx`, `calendar.tsx`, `EconomyStep.tsx`, `WelcomeIntro.tsx`

---

### 2.3 Erstatt Toggle-par med Switch for Ja/Nei

**Identifisert av:** 4 av 6 agenter

EconomyStep bruker to separate `<Toggle>`-knapper for Ja/Nei. Dette er:
- Forvirrende for skjermlesere (semantisk feil)
- Inkonsekvent — DaycareStep bruker allerede Switch for samme type valg
- For lite touch-target

**Løsning:** Bytt til Switch-komponent (som allerede brukes i DaycareStep) eller RadioGroup. Bruk Switch konsekvent for alle binære (ja/nei) valg.

**Filer:** `EconomyStep.tsx`

---

### 2.4 Number-input mobil-optimering

**Identifisert av:** 4 av 6 agenter

- Mangler `inputMode="numeric"` — gir feil tastatur på iOS
- Ingen formatering med tusenskilletegn
- Ingen `enterKeyHint` for tastatur-navigering
- Ingen `scrollIntoView` ved fokus (feltet kan skjules bak tastatur)

**Løsning:**
```tsx
<Input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  enterKeyHint="done"
  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
/>
```
Legg til formatering med tusenskilletegn (50 000) ved blur/onChange.

**Filer:** `EconomyStep.tsx`, `JobSettingsStep.tsx`

---

### 2.5 Safe area support (iPhone notch/home indicator)

**Identifisert av:** 2 av 6 agenter

Ingen bruk av `env(safe-area-inset-bottom)` noe sted. Sticky navigasjon uten safe-area-padding vil overlappe med home-indicator på nyere iPhones.

**Løsning:**
- Legg til `viewportFit: 'cover'` i viewport-metadata (`layout.tsx`)
- Legg til safe-area utility i `globals.css`
- Bruk `pb-safe` på sticky navigasjonsbar

**Filer:** `layout.tsx`, `globals.css`

---

### 2.6 Bruk `min-h-dvh` i stedet for `min-h-screen`

Bruk `dvh` (dynamic viewport height) som håndterer mobil-nettleseres adressefelt korrekt.

**Filer:** `page.tsx`

---

### 2.7 Responsive grids — fjern grid-cols-2 uten breakpoint

**Identifisert av:** 3 av 6 agenter

SummaryStep og DaycareStep tvinger `grid-cols-2` på alle skjermstørrelser. Datoer trunkeres på 320px-skjermer.

**Løsning:** Endre til `grid-cols-1 sm:grid-cols-2`

**Filer:** `SummaryStep.tsx`, `DaycareStep.tsx`

---

## FASE 3: Tilgjengelighet og semantikk

### 3.1 ARIA-roller for wizard-navigasjon

- WizardProgress mangler `role="progressbar"` på mobil og `role="list"` med `aria-current="step"` på desktop
- Legg til `aria-label` på wizard-container

**Filer:** `WizardProgress.tsx`, `WizardContainer.tsx`

---

### 3.2 Radio-gruppe-semantikk for valgknapper

RightsStep og CoverageStep implementerer visuelt radio-knapper men semantisk `<button>`. Skjermlesere annonserer dem som "knapp" i stedet for "radio-knapp, 1 av 3".

**Løsning:** Legg til `role="radiogroup"` på container og `role="radio"` med `aria-checked` på knappene. Eller bruk shadcn RadioGroup-komponenten som allerede er installert.

**Filer:** `RightsStep.tsx`, `CoverageStep.tsx`

---

### 3.3 Fokus-styring ved steg-bytte

Når brukeren trykker "Neste", flyttes ikke fokus til det nye stegets innhold. Skjermleser-brukere må tab gjennom hele siden.

**Løsning:** Bruk `ref` + `useEffect` for å flytte fokus til steg-innholdet ved navigering.

**Filer:** `WizardContainer.tsx`

---

## FASE 4: UX-polering og interaksjon

### 4.1 Overgangsanimasjon mellom steg

**Identifisert av:** 5 av 6 agenter

Steg byttes instantant uten animasjon. En enkel slide/fade gir retningsfølelse og profesjonelt inntrykk.

**Løsning:**
- Slide-left ved "Neste", slide-right ved "Tilbake"
- Kan oppnås med CSS `animate-in` fra Tailwind animate-utilities
- Eller `framer-motion` (AnimatePresence) for mer kontroll
- Scroll til topp ved steg-bytte

**Filer:** `WizardContainer.tsx`

---

### 4.2 Steg-spesifikke feilmeldinger

Generisk "Fyll ut informasjonen over for å fortsette" sier ingenting om hva som mangler.

**Løsning:** Map per steg:
- Steg 1: "Velg termindato for å gå videre"
- Steg 2: "Velg hvem som har rett til foreldrepenger"
- Steg 3: "Velg dekningsgrad"

**Filer:** `WizardContainer.tsx`

---

### 4.3 Håndtering av nettleser-tilbake

Nettleserens tilbake-knapp navigerer bort fra wizarden og mister all data.

**Løsning:** Bruk URL-hash (#steg-3) eller searchParams for hvert steg, slik at tilbake-knapp = forrige steg.

**Filer:** `WizardContainer.tsx`, `page.tsx`

---

### 4.4 Auto-save under wizard (ikke bare etter completion)

Nåværende: Ingen data lagres under wizarden. Lukker brukeren fanen, starter de på nytt.

**Løsning:** Lagre wizard-state til localStorage etter hvert steg-bytte. Vis "Fortsett der du slapp (steg 4 av 8)" ved retur.

**Filer:** `wizardSlice.ts`, `store/index.ts`, `page.tsx`

---

### 4.5 "Tilbake til oppsummering"-snarvei

Når bruker redigerer fra SummaryStep, må de klikke "Neste" gjennom alle steg for å komme tilbake.

**Løsning:** Lagre `cameFromSummary`-flag og vis en direkte-link tilbake til oppsummering.

**Filer:** `WizardContainer.tsx`, `wizardSlice.ts`

---

## FASE 5: Design system og konsistens

### 5.1 Semantiske farge-tokens for domenet

Hardkodede Tailwind-farger (pink-400, blue-500, amber-600) er spredt over mange filer.

**Løsning:** Definer CSS custom properties:
```css
:root {
  --color-mother: oklch(0.65 0.2 350);
  --color-father: oklch(0.55 0.15 250);
  --color-info: oklch(0.55 0.15 250);
  --color-warning: oklch(0.7 0.15 80);
  --color-success: oklch(0.55 0.2 150);
}
```

**Filer:** `globals.css`, deretter oppdater alle referanser

---

### 5.2 Ny `SelectionCard`-komponent

3+ ulike implementasjoner av "velg ett alternativ"-mønster (RightsStep, CoverageStep, JobSettingsStep, EconomyStep). Ingen bruker shadcn RadioGroup.

**Løsning:** Lag en gjenbrukbar `SelectionCard`-komponent.

---

### 5.3 Ny `InfoBox`-komponent

Informasjonsbokser har 3+ ulike implementasjoner med inkonsistent styling og mønster.

**Løsning:** Lag en `InfoBox` med varianter: `tip`, `info`, `warning`.

---

### 5.4 Visuell tidslinje i CoverageStep

Valget mellom 80% og 100% er kalkulatorens viktigste valg. En visuell tidslinje som viser forskjellen ville hjelpe enormt:
```
100%: [===== 49 uker =====]----GAP----[Barnehage]
 80%: [========== 59 uker ==========][BH]
```

---

### 5.5 Visuell gap-indikator i DaycareStep

"Gapet" mellom permisjonslutt og barnehagestart er et nøkkelkonsept, men forklares bare med tall. En mini-tidslinje ville gjøre det mye mer forståelig.

---

### 5.6 Standardiser spacing og konsistens

- Standardiser `space-y-6` for alle steg (DueDateStep og CoverageStep bruker `space-y-4`)
- Standardiser ikonstørrelser: `w-5 h-5` inline, `w-8 h-8` i feature-kort
- Flytt duplisert `formatCurrency` til `src/lib/format.ts`

---

## FASE 6: Performance og kodekvalitet

### 6.1 Refaktorer WizardContainer (God Component-problem)

WizardContainer destrukturerer hele wizard-state, job settings, economy og persistence. Hvert steg trenger bare 1-3 props.

**Løsning:** La hvert steg lese sin egen state direkte fra Zustand store via hooks. WizardContainer håndterer kun navigasjon og steg-rendering.

---

### 6.2 useCalculatedLeave() kjører på alle steg

Tung beregning som bare brukes i steg 5 (DaycareStep) og steg 8 (SummaryStep).

**Løsning:** Flytt hook-kallet ned til komponentene som trenger det, eller gate med `currentStep`.

---

### 6.3 checkLocalStorage() kjører ved hver render

I `page.tsx` kalles `checkLocalStorage()` uten memoization.

**Løsning:** Wrap i `useState(() => checkLocalStorage())`.

---

### 6.4 ParentJobSettings lokal state ut av sync

`isExpanded` er lokal useState basert på initial `settings !== null`, men oppdateres ikke ved ekstern endring.

**Løsning:** Bruk derived state: `const isExpanded = settings !== null`.

---

## Anbefalt implementeringsrekkefølge

```
Uke 1: Fase 1 (kritiske bugs) — 1-2 dager
  ├─ 1.1 TOTAL_STEPS-mismatch
  ├─ 1.2 Dynamiske Tailwind-klasser
  ├─ 1.3 Norske tegn
  └─ 1.4 Tooltips → Popover på mobil

Uke 1-2: Fase 2 (mobil UX) — 2-3 dager
  ├─ 2.1 Sticky navigasjon
  ├─ 2.2 Touch targets 44px
  ├─ 2.3 Toggle → Switch
  ├─ 2.4 Number-input optimering
  ├─ 2.5 Safe area
  ├─ 2.6 dvh
  └─ 2.7 Responsive grids

Uke 2: Fase 3 (a11y) — 1 dag
  ├─ 3.1 ARIA-roller
  ├─ 3.2 Radio-semantikk
  └─ 3.3 Fokus-styring

Uke 2-3: Fase 4 (UX-polering) — 2-3 dager
  ├─ 4.1 Steg-animasjoner
  ├─ 4.2 Steg-spesifikke feilmeldinger
  ├─ 4.3 Nettleser-tilbake
  ├─ 4.4 Auto-save under wizard
  └─ 4.5 Tilbake til oppsummering

Uke 3: Fase 5 (design system) — 2-3 dager
  ├─ 5.1 Farge-tokens
  ├─ 5.2 SelectionCard-komponent
  ├─ 5.3 InfoBox-komponent
  ├─ 5.4 CoverageStep tidslinje
  ├─ 5.5 Gap-indikator
  └─ 5.6 Konsistens-cleanup

Uke 3-4: Fase 6 (performance/kode) — 1-2 dager
  ├─ 6.1 WizardContainer refaktorering
  ├─ 6.2 useCalculatedLeave gate
  ├─ 6.3 checkLocalStorage memoize
  └─ 6.4 ParentJobSettings derived state
```

---

## Konsensus-score (antall agenter som identifiserte problemet)

| Problem | Score | Fase |
|---------|-------|------|
| Sticky navigasjon i bunn | 5/6 | 2.1 |
| TOTAL_STEPS mismatch | 5/6 | 1.1 |
| Tooltip → Popover på mobil | 5/6 | 1.4 |
| Touch targets < 44px | 5/6 | 2.2 |
| Steg-animasjoner | 5/6 | 4.1 |
| Norske tegn | 6/6 | 1.3 |
| Number-input optimering | 4/6 | 2.4 |
| Toggle → Switch | 4/6 | 2.3 |
| Dynamiske Tailwind-klasser (bug) | 3/6 | 1.2 |
| grid-cols-2 uten breakpoint | 3/6 | 2.7 |
| Manglende steg-label "Økonomi" | 3/6 | 1.1 |
| min-h-[400px] problematisk | 3/6 | 2.1 |
| Nettleser-tilbake håndtering | 2/6 | 4.3 |
| Auto-save under wizard | 2/6 | 4.4 |
| Safe area support | 2/6 | 2.5 |

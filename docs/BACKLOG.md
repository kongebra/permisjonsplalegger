# Backlog

Samlet liste over arbeid som ikke er ferdig.
Ferdige planer og ideer er fjernet fra `docs/` og kan hentes fra git-historikken.
Kilder oppgis som `git show <commit>:<sti>`.
`main` = `67144c3` (HEAD da backloggen ble laget).

## Under arbeid

### 1. Få PR #5 (kabalen-redesign) merget

**Hva:** Branchen `feature/kabalen-redesign` (PR #5, åpen) inneholder hele redesignet som ikke ligger på `main`.
På `main` redirecter `/` fortsatt til `/planlegger`.

**Innhold i PR-en:**

- Ny identitet: appnavnet er "Permisjonsplanleggeren", med SEO-metadata og en ekte landingsside på `/`.
  Landingssiden er én side uten blogg og artikler, med H1, tre svar på spørsmål folk søker på, og CTA til `/planlegger`.
- `SiteHeader` på `/`, `/om` og `/personvern`, slik at brukeren finner tilbake til forsiden.
- Wizard-velkomst med "kabal"-framing.
- Øverst i kalenderen: `PlanStatusBar` (gap-status, Mor/Far-uker, barnehagestart) og `LeaveHorizonLine` (tidslinje).
  Tidslinjen har ruler med månedsinndeling, aktiv måned som felt og tap-navigasjon.
  Granulariteten bytter automatisk: måneder (opptil 14 mnd), kvartaler (15-24 mnd), halvår (over 24 mnd).
  Tidslinjen har også barnehage-pinne, en grå post-sone to måneder etter gapet og milepæl-snarveier (Start, Permisjonsslutt, Bhg).
  `LeaveHorizonBanner` og `StatsBar` er slettet i PR-en.
- Månedlig økonomi i `MonthlyIncomeOverview`: differanse mot normal inntekt, fargeindikator (grønn, gul, rød), feriemåneder markert, og "månedlig minstegrense" som brukeren setter i innstillinger.
- Mini-måneder bak PostHog-flagget `calendar-mini-months` (se punkt 2).

**Gjenstår:** Merge, deretter slette plandokumenter som dukker opp igjen i `docs/plans/` (se "Merk" under).
De to untracked filene `docs/plans/2026-02-26-horizon-line-ruler.md` og `docs/plans/2026-03-01-horizon-line-daycare-anchor.md` er ferdig implementert på branchen, men finnes ikke i git.
De er beholdt fordi de ikke kan hentes tilbake.
Slett dem og hele `docs/plans/` når PR #5 er merget.

**Kilder:**

- Design: `git show fab4eec:docs/plans/2026-02-25-kabalen-redesign-design.md`
- Plan: `git show 67144c3:docs/plans/2026-02-25-kabalen-implementasjonsplan.md`
- Topprad: `git show 44bdf8b:docs/plans/2026-02-26-horizon-banner-redesign-design.md` og `git show d0b2122:docs/plans/2026-02-26-horizon-banner-redesign.md`
- Navigasjon: `git show 319753a:docs/plans/2026-02-26-site-navigation-design.md` og `git show 3c277dd:docs/plans/2026-02-26-site-navigation.md`
- Implementasjon: `git log main..feature/kabalen-redesign`

**Merk:** Kabalen-planene er fjernet fra `main`, men finnes uendret på feature-branchen.
Når PR #5 merges, kan filene dukke opp igjen i `docs/plans/`.
Slett dem da, eller fjern dem på branchen først.

### 2. Avgjør A/B-testen for mini-måneder

**Hva:** Eksperimentet `calendar-mini-months` er implementert i PR #5 (`MiniMonthStrip`), men ingen har bestemt hvilken variant som vinner.

**Beslutninger som er tatt:**

- Variant A: horisontal strip med tre mini-måneder (forrige, nå, neste).
  Variant B: ingen strip (dagens opplevelse).
- Suksessmetrikk: antall månedsskift per sesjon og tid i kalenderen.
- Evalueres også på ekte mobil (375px) før valget låses.
- Prinsipp: PostHog feature flags er standard for alle UI-eksperimenter.
  Layout avgjøres ved å teste, ikke i kode.

**Gjenstår:** Les ut resultatet, velg variant, fjern flagget og den tapende varianten.

**Kilde:** `git show fab4eec:docs/plans/2026-02-25-kabalen-redesign-design.md`, avsnittet "Mini-måneder".

## Funksjonalitet

### 3. Mobiloppsett i kalenderen

**Hva:** Dagceller litt høyere for lettere trykking, og tydeligere periodestriper (litt mer kontrast og høyde).
FAB-knappen beholdes som den er.

**Status:** Står i kabalen-designet, men hadde ingen oppgave i implementasjonsplanen og er ikke gjort, heller ikke i PR #5.
Planner-kalenderen på mobil ble også nevnt som forbedringsområde i den gamle statusoversikten.

**Kilde:** `git show fab4eec:docs/plans/2026-02-25-kabalen-redesign-design.md`, avsnittet "Mobiloppsett". `git show 67144c3:docs/PROGRESS.md`, punkt 5.

### 4. Vis "Tidligst barnehagestart" tydelig

**Hva:** Vis "Tidligst barnehagestart: [dato]" i appen, med forbehold om at faktisk oppstart kan variere.
Logikken er ferdig (`getDefaultDaycareStart` i `src/lib/calculator/index.ts` håndterer sept/okt/nov-fødte og desember).
Mangler tydelig tekst i UI: `DaycareStep` sier fortsatt bare at de fleste barnehager har hovedopptak 1. august.

**Beslutning:** Lovhjemmel og regler ligger i `docs/nav/barnehagerett.md`.

**Kilde:** `git show 67144c3:docs/IDEAS_01.md`, avsnittet "Barnehagestart - smartere dato".

### 5. Ferie før og etter permisjon i planleggeren

**Hva:** I den gamle modellen (`VacationInput` i den fjernede `/gammel`-ruten, se `git show 828af5b:src/components/input/VacationInput.tsx`) kunne man legge inn feriedager etter mors permisjon og før/etter fars permisjon.
Hver ferieblokk hadde en avkrysning: tas den samtidig med den andres permisjon (overlapp), eller skyver den den andres permisjon?
I planleggeren kan brukeren legge inn ferieperioder fritt, men skyving av den andres permisjon finnes ikke.

**Beslutninger:**

- Mor: feriedager etter permisjon, valgfri "Skal tas ut i fars permisjon".
  Er den ikke avkrysset, skyves fars permisjon tilsvarende.
- Far/medmor: feriedager før permisjon (med tilsvarende avkrysning) og feriedager etter permisjon (legges bare på i kalenderen).

**Usikkert:** Om dette fortsatt er ønsket når planleggeren lar brukeren plassere ferie selv.
Avgjør før noe bygges.

**Kilde:** `git show 67144c3:docs/IDEAS_01.md`, avsnittet "Feriedager før/etter permisjon".

### 6. Fullstendig feriepenge-beregning

**Hva:** `calculateFeriepengeDifference` i `src/lib/calculator/economy.ts` finnes og er testet, og juni-trekk forklares i en infoboks i `EconomyStep`.
Det som mangler er en detaljert oversikt over opptjeningsperiodene og hvordan de gir juni-trekket året etter.

**Beslutning:** NAV gir feriepengegrunnlag bare for de første 12 (100 %) eller 15 (80 %) ukene.
Full lønn fra arbeidsgiver gir full opptjening.
Se `docs/nav/foreldrepenger.md`, avsnittet "Feriepenger av foreldrepenger".

**Kilde:** `git show 67144c3:docs/PROGRESS.md`, punkt 2. `git show 67144c3:docs/KRAVSPEC.md`, "Feriepenger (År 2)".

## Feil og kvalitet

### 7. Bug: gjentatte klikk på en dag spiser uker for mor

**Hva:** Å klikke flere ganger på samme dag trekker feil mange uker fra mors kvote.
Ikke reprodusert på nytt, og ikke funnet i koden.
Reproduser først ende-til-ende i planlegger-kalenderen.

**Kilde:** `git show 67144c3:docs/IDEAS_01.md`, "Kjente bugs".

### 8. Bekreft at to gamle bugs er løst

Begge ser løst ut i koden, men er ikke bekreftet i nettleseren.
Slett dette punktet når de er bekreftet.

- Barnehagestart-datovelgeren i wizarden viste dagens dato i stedet for estimert dato.
  Koden bruker nå `getDefaultDaycareStart(dueDate)` som `defaultMonth` og i store.
- Termindato-valget var vanskelig å hoppe mer enn én måned.
  Koden bruker nå `captionLayout="dropdown"` med måned og år.

**Kilde:** `git show 67144c3:docs/IDEAS_01.md`, "Kjente bugs".

### 9. Wizard-sidene bør passe på én skjermhøyde

**Hva:** Wizard-stegene bør helst passe uten scrolling, særlig på mobil.
Vurder mer kompakte komponenter.
Oppsummeringssteget kan være unntaket.

**Kilde:** `git show 67144c3:docs/IDEAS_01.md`, "UI-issues".

### 10. Tydelige feilmeldinger ved ugyldig input

**Hva:** Validering finnes, men mangler tydelige feilmeldinger for ugyldige scenarier.

**Kilde:** `git show 67144c3:docs/PROGRESS.md`, punkt 4.

### 11. Test dark mode

**Hva:** CSS-variablene er definert, men mørk modus er ikke grundig testet.

**Kilde:** `git show 67144c3:docs/PROGRESS.md`, punkt 6.

### 12. Funksjonelle E2E-tester

**Hva:** Enhetstester finnes for `src/lib/calculator/` (inkludert akseptansekravene fra `KRAVSPEC.md`).
E2E-testene i `e2e/` dekker bare UU (axe-core).
Mangler: funksjonelle E2E-tester for wizard til kalender, og for periodeopprettelse.

**Kilde:** `git show 67144c3:docs/PROGRESS.md`, punkt 8.

## Andre åpne punkter

Åpne UU-punkter (manuell axe-sjekk, High Contrast Mode, VoiceOver, tabellfallback for diagrammet) står under "Kjente begrensninger" i `docs/UU-SJEKKLISTE.md`.

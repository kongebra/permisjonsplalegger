# Changelog

<!-- Generert av `bun run changelog` (scripts/changelog.ts). Ikke rediger for hånd. -->

## 2026-10-15

### Rettet

- Bruk lokal datonøkkel i kalenderen og samle NO_GAP og dato-sammenligning
- Oppdater grunnbeløpet til 136 549 kr (1. mai 2026)
- Bruk kalenderdager i daysBetween så vintertid ikke gir én dag for mye
- Legg til rad-roller i kalenderen for gyldig ARIA-grid
- Lang-testen forventer nb, og skru av agentRules i next dev
- Flytt milepælknapper ut av slider-rollen i horisontlinjen
- Gi periodebjelkene nok linjehøyde så teksten ikke klippes
- Bøy uke og dag riktig i entall (1 uke, 1 dag)
- Ta med fars uker med aktivitetskrav i planleggeren
- Vis aktivitetskrav-uker med riktig tekst og farge i kalenderen
- Kun forelder med permisjon i planen kan ta gapet i anbefalingen
- Vis lavest dagsats i gap-anbefalingen bare når begge har permisjon

### Opprydding

- Samle 6G-tak og dekningsgrad i konstanter og monthlyNavPayout

## 2026-03-02

### Nytt

- Legg til milepæl-snarveier for rask navigasjon i tidslinjen

### Rettet

- Skjul post-sone når barnehage ikke er aktivert
- WCAG touch-target og korrekt permisjonssluttmåned i milepæl-snarveier

## 2026-03-01

### Nytt

- Legg til post-sone og barnehage-pinne i tidslinjen

## 2026-02-27

### Rettet

- Svar på Copilot-review i PR #5

## 2026-02-26

### Nytt

- Månedlig økonomi med vs-normal, fargeindikator og budsjettgrense
- Legg til SiteHeader-komponent for info-sider
- Legg til SiteHeader og fiks back-lenke på /om
- Legg til SiteHeader og fiks back-lenke på /personvern
- Legg til SiteHeader på landingssiden
- Oppdater footer-navn og CHANGELOG for navigasjon
- Slank WelcomeIntro - fjern feature-kort som dekkes av landingssiden
- Legg til clickRatioToMonth-hjelpefunksjon for tap-navigasjon
- Opprett LeaveHorizonLine med tap-navigasjon og månedsbadge
- Opprett PlanStatusBar med gap-status og sammendragsrad
- Integrer PlanStatusBar og LeaveHorizonLine i PlannerCalendar
- Legg til getTimelineGranularity for adaptiv ruler-granularitet
- Legg til buildTimelineSegments for ruler-segmentliste
- Redesign LeaveHorizonLine med ruler, månedsinndeling og aktiv-måneds-felt

### Rettet

- Erstatt tabell-elementer med divs for å fikse Safari kalender-overflow
- Øk maks feriedager per år fra 50 til 99 i wizard
- Tydeliggjør lønnsfelt med 'f.eks.' placeholder og auto-markering ved fokus
- Vis mor og far sine permisjoner i separate farger i horisontlinjen
- Gap teller kun hverdager, fokus-fangst i onboarding-modal
- Legg til ARIA-attributter på slider og refaktorer coveredDays til countWorkdaysInRange
- Korriger segmentbredde ved midt-måneds start og vis årstall på H1/H2
- Forsvars-klemming og aria-hidden på ruler-rad

## 2026-02-25

### Nytt

- Ny identitet og SEO-metadata - Permisjonsplanleggeren
- Legg til ekte landingsside på / for SEO og deling
- Oppdater wizard-intro til kabal-framing
- Legg til persistent permisjonshorisont-banner i kalender
- Legg til A/B-test for mini-måneder via PostHog feature flag calendar-mini-months

### Rettet

- Fjern h-full fra kalender-datoer for å fikse Safari-overflow

<!-- Håndskrevet historikk fra før verktøyet. Kilde: scripts/changelog-historikk.md -->

## [Upublisert]

### Forbedringer
- Barnehagerett rettet for barn født i september, oktober og november: disse barna kan starte barnehage i fødselsmåneden (ikke august), og kalkulatoren viser nå riktig gap.
- Støtte for prematur fødsel i wizard: legg inn faktisk fødselsdato og permisjonen forlenges automatisk i tråd med NAV-regelverket.
- Informasjon om aktivitetskravet vises nå i oppsummeringen når far planlegger å ta fellesperioden.

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

### Fikset: Feriedager trekker nå fra norske helligdager

Når du velger en ferieperiode som inneholder helligdager (f.eks. påske, jul), vil kalkulatoren nå korrekt vise antall **feriedager** du faktisk bruker — ikke antall vanlige arbeidsdager.

Tidligere ble skjærtorsdag, langfredag og andre helligdager feilaktig talt med som feriedager. Nå trekkes de fra automatisk, tilpasset om du jobber kontortid eller skift.

I tillegg er det fikset en mangel i datovelgeren der skjermlesere ikke fikk oppgitt et navn på dialogboksen (UU-krav).

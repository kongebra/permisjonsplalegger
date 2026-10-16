# Kravspesifikasjon: Permisjonsplanleggeren

Status: kjernefunksjonaliteten er implementert som en wizard med interaktiv kalender og en økonomi-fane.
Det som gjenstår står i `docs/BACKLOG.md`.
Antall uker, satser og grenser står i `docs/nav/` og `src/lib/constants.ts`, ikke her.

## 1. Bakgrunn og formål

Mange foreldre taper store summer (ofte 50 000 til 100 000 kr) på å velge 80 % dekningsgrad fremfor 100 % dekningsgrad kombinert med ulønnet permisjon.
Det gjelder særlig arbeidstakere med lønn over 6G, provisjonslønn eller gode feriepengeavtaler hos arbeidsgiver.

Vanlige kalkulatorer (NAV m.fl.) tar ikke høyde for:

1. "Gapet" mellom permisjonsslutt og barnehagestart (ofte mai til august).
2. Arbeidsgivers dekningsgrad (for eksempel fastlønn over 6G, men ikke provisjon).
3. Tap av feriepengeopptjening året etter (NAV mot arbeidsgiver).

## 2. Brukerhistorier

- Som forelder med provisjonslønn vil jeg se hvor mye jeg taper i provisjon ved lengre permisjon (80 %), slik at jeg kan vurdere om fritiden er verdt prisen.
- Som foreldrepar vil vi se totalkostnaden av ulønnet permisjon i sammenligningsvinduet (frem til barnehagestart, se seksjon 3), slik at vi vet om vi har råd til 100 % dekningsgrad.
- Som arbeidstaker med god feriepengeavtale vil jeg vite hvordan valget påvirker feriepengene neste år, slik at jeg ikke får en overraskelse i juni.

## 3. Beregningsregler

### Scenario A: 80 % dekningsgrad

1. Total utbetaling er 80 % av grunnlaget over hele perioden (uker fra `docs/nav/foreldrepenger.md`).
2. Hvis arbeidsgiver ikke dekker over 6G, begrenses grunnlaget til 6G før 80 % beregnes.
3. Provisjonstap trekkes fra for hele perioden brukeren er i permisjon.
   Det at provisjon uteblir i permisjon er en antakelse uten kilde.

### Scenario B: 100 % dekningsgrad og ulønnet permisjon

1. Total utbetaling er 100 % av grunnlaget over den kortere perioden.
2. "Gapet" er tiden fra permisjonsslutt til barnehagestart.
3. Kostnaden av ulønnet permisjon i gapet regnes som tapt arbeidsinntekt.
   Forelderen med lavest dagsats tar den ulønnede permisjonen.
   Gapet regnes i arbeidsdager, ikke kalenderdager.

### Sammenligningsvindu

- "Mest penger" betyr samlet inntekt for familien i ett felles tidsrom, etter provisjonstap og tapt feriepengeopptjening.
- Vinduet går fra første permisjonsdag til barnehagestart.
  Hvis permisjonen i et av scenarioene varer lenger, går vinduet til siste permisjonsdag.
  Implementert i `getEconomyHorizon()` i `src/lib/calculator/economy.ts`.
- Begge scenarioer regnes over nøyaktig det samme vinduet.
  Uten det ville totalene ikke vært sammenlignbare.
- Barnehagestart styrer vinduet.
  Anbefalingen kan derfor snu med fødselsmåned (se `docs/nav/barnehagerett.md`).
- Vinduet er et valg i appen, ikke en NAV-regel.
- UI viser vinduet som tekst under totalene i økonomifanen ("fra første permisjonsdag til barnehagestart ..."), men ikke med konkrete datoer.
  Anbefaling, ikke bygget: vis start- og sluttdato for vinduet.

### Ulønnet gap

- En arbeidsdag i gapet (mandag til fredag uten helligdager) er ulønnet for forelderen som tar gapet.
  Da bortfaller lønn, provisjon og feriepengeopptjening for dagen.
- Retten til ferie består selv om feriepengene blir lavere (ferieloven § 5 nr. 5).
- Verifisert: ferieloven § 10 nr. 1 sier at feriepengegrunnlaget er arbeidsvederlag utbetalt i opptjeningsåret.
  Kilde: https://lovdata.no/dokument/NL/lov/1988-04-29-21
- Tolkning, ikke verifisert: ingen kilde sier uttrykkelig at ulønnet permisjon ikke gir feriepenger.
  Det er utledet av at ulønnet fravær ikke gir arbeidsvederlag.
- Antakelse uten kilde: provisjon uteblir også ved ulønnet fravær.
- Gap-kostnaden antar at én forelder er hjemme uten lønn i hele gapet.
  Ferie eller annen hjelp kan redusere den, og det er ikke modellert.
- UI skal si at tallene er veiledende, og at feriepenger og provisjon bør sjekkes med arbeidsgiver.

### Feriepenger av foreldrepenger

- Verifisert (NAV, `docs/nav/foreldrepenger.md`): NAV utbetaler feriepenger på 10,2 % av foreldrepengene, bare for de første 12 ukene (100 %) eller 15 ukene (80 %).
- Appen regner at permisjonsuker etter det ikke gir feriepengeopptjening.
  Tapet er 10,2 % av årsgrunnlaget per uke.
  Det gjelder ikke hvis arbeidsgiver betaler feriepenger under permisjonen.
- At dette gir et reelt tap i feriepengene året etter, er vår tolkning av ferieloven § 10 nr. 1 (se "Ulønnet gap"), ikke en NAV-regel.
- Tapet trekkes fra totalen i vinduet, selv om feriepengene utbetales året etter.
- Satsen er 10,2 % (ferieloven § 10 nr. 2).
  Satsen for over 60 år (12,5 %) og 12 % fra tariffavtaler er ikke modellert.
- NAV utbetaler sine feriepenger innen utgangen av mai året etter (verifisert, nav.no/feriepenger).
  Arbeidsgivers utbetaling følger ferieloven § 11 uten fast måned, så UI sier "året etter" uten måned.
- Kjent forenkling: ved 80 % gir NAV feriepenger av 80 % av lønnen i de første 15 ukene, mens modellen regner full opptjening der.
  Foreldrepenger over 6G gir heller ikke feriepenger av det overskytende.
  Se #37.

## 4. Utdata

- **Totalregnskap:** en tydelig sum for netto differanse mellom valgene.
  Eksempel: "Dere tjener totalt 45 000 kr mer på å velge 100 % og ulønnet permisjon."
- **Likviditetsgraf:** akkumulert inntekt over sammenligningsvinduet (80 % mot 100 %), fra første permisjonsdag til barnehagestart eller til siste permisjonsdag hvis den kommer senere.
- **Anbefaling for gapet:** hvem som bør ta den ulønnede permisjonen.

## 5. Akseptansekrav

Hvert scenario har en test med navn `acceptance:` i `src/lib/calculator/economy.test.ts`.

1. **Høytlønnet med provisjon:** 78k fast og 12k provisjon, der arbeidsgiver dekker fastlønn men ikke provisjon.
   Appen skal vise at tapet øker med lengre permisjon, og at 100 % lønner seg betydelig.
2. **Gap-testen:** 100 % permisjon slutter i mai og barnehagen starter i august.
   Tapt arbeidsinntekt for de tre månedene skal trekkes fra i 100 %-alternativet.
3. **Feriepenge-sjokket:** "NAV betaler feriepenger" mot "arbeidsgiver betaler" skal gi en tydelig differanse i utbetaling neste år.
4. **Optimalisering av ulønnet permisjon:** tjener mor 800k og far 500k, skal appen foreslå at far tar den ulønnede permisjonen i gapet.

## 6. Beslutninger som ikke står i koden

- **Wizard til planlegger:** wizarden beregner et `LeaveResult`.
  `initializePeriodsFromLeave()` (`src/lib/planner/initialize-periods.ts`) gjør det om til redigerbare `CustomPeriod[]`.
  Bare `preBirth` og `mandatory` er låst.
  Resten kan brukeren redigere.
- **Zustand framfor React Context:** enklere deling av state mellom wizard og planlegger, angre-stack i `periodsSlice`, og finkornede abonnement med `useShallow`.
- **Personvern:** planleggeren lagrer planen i `localStorage` under nøkkelen `permisjonsplan-v1`.
  PostHog bruker `persistence: "memory"` og lagrer ingenting i nettleseren.
  Derfor trengs ingen samtykke-banner (ekomloven §2-7b).
- **Sammenligningsvindu beholdt:** fra første permisjonsdag til barnehagestart, eller til siste permisjonsdag hvis 80 %-permisjonen varer lenger.
  Begge scenarioer regnes over samme tidsrom.
  Anbefalingen kan snu med fødselsmåned fordi barnehagestart styrer vinduet.
- **Ulønnet gap taper feriepengeopptjening og provisjon:** tolkning av ferieloven § 10 nr. 1 (https://lovdata.no/dokument/NL/lov/1988-04-29-21), ikke en NAV-regel.
  Ikke verifisert: ingen kilde sier uttrykkelig at ulønnet permisjon ikke gir feriepenger.
  Provisjonstapet er en antakelse uten kilde.

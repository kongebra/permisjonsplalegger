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
- Som foreldrepar vil vi se totalkostnaden av ulønnet permisjon frem til barnehagestart, slik at vi vet om vi har råd til 100 % dekningsgrad.
- Som arbeidstaker med god feriepengeavtale vil jeg vite hvordan valget påvirker feriepengene neste år, slik at jeg ikke får en overraskelse i juni.

## 3. Beregningsregler

### Scenario A: 80 % dekningsgrad

1. Total utbetaling er 80 % av grunnlaget over hele perioden (uker fra `docs/nav/foreldrepenger.md`).
2. Hvis arbeidsgiver ikke dekker over 6G, begrenses grunnlaget til 6G før 80 % beregnes.
3. Provisjonstap trekkes fra for hele perioden brukeren er i permisjon.

### Scenario B: 100 % dekningsgrad og ulønnet permisjon

1. Total utbetaling er 100 % av grunnlaget over den kortere perioden.
2. "Gapet" er tiden fra permisjonsslutt til barnehagestart.
3. Kostnaden av ulønnet permisjon i gapet regnes som tapt arbeidsinntekt.
   Forelderen med lavest dagsats tar den ulønnede permisjonen.
   Gapet regnes i arbeidsdager, ikke kalenderdager.

### Feriepenger (år 2)

- Differansen i utbetalte feriepenger året etter permisjon skal beregnes.
- Full lønn fra arbeidsgiver gir full opptjening.
- NAV-utbetaling gir opptjening bare for de første ukene (se `docs/nav/foreldrepenger.md`).

## 4. Utdata

- **Totalregnskap:** en tydelig sum for netto differanse mellom valgene.
  Eksempel: "Dere tjener totalt 45 000 kr mer på å velge 100 % og ulønnet permisjon."
- **Likviditetsgraf:** akkumulert inntekt frem til barnehagestart (80 % mot 100 %).
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

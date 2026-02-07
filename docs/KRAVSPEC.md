# Kravspesifikasjon: Permisjonsøkonomi-kalkulator (MVP)

## 1. Bakgrunn og Formål

Mange foreldre taper store summer (ofte 50 000 – 100 000 kr) på å velge 80 % dekningsgrad fremfor 100 % dekningsgrad kombinert med ulønnet permisjon. Dette gjelder spesielt for arbeidstakere med lønn over 6G, provisjonsbasert lønn, eller gode feriepengeavtaler gjennom arbeidsgiver.

Dagens kalkulatorer (NAV m.fl.) er for enkle og tar ikke høyde for:

1.  **"Gapet"** mellom permisjonsslutt og barnehagestart (ofte mai–august).
2.  **Arbeidsgivers spesifikke dekningsgrad** (f.eks. dekker fastlønn over 6G, men ikke provisjon).
3.  **Tap av feriepengeopptjening** året etter (NAV vs. Arbeidsgiver).

**Formålet med applikasjonen** er å visualisere den _totale_ økonomiske forskjellen mellom to hovedscenarioer (80 % vs. 100 % + ulønnet perm) for en husstand, slik at foreldre kan ta et informert valg basert på faktiske tall.

---

## 2. Brukerhistorier (User Stories)

- **Som en forelder med provisjonslønn**, ønsker jeg å se hvor mye jeg taper i provisjon ved å velge lengre permisjon (80 %), slik at jeg kan vurdere om fritiden er verdt prisen.
- **Som et foreldrepar**, ønsker vi å se totalkostnaden av å ta ulønnet permisjon frem til barnehagestart, slik at vi vet om vi har råd til å velge 100 % dekningsgrad for å maksimere totalutbetalingen.
- **Som en arbeidstaker med god feriepengeavtale**, ønsker jeg å vite hvordan valget mitt påvirker feriepengene neste år, slik at jeg ikke får en negativ overraskelse i juni året etter permisjon.

---

## 3. Funksjonelle Krav

### 3.1 Inndata (Input)

Applikasjonen skal ta inn følgende data for hver av foreldrene (Mor og Far/Medmor/Partner):

**Økonomi:**

- **Månedslønn (Brutto):** Fastlønn.
- **Variabelt tap/Provisjon:** Et felt hvor brukeren kan estimere "Tapt lønn/provisjon pr måned i permisjon".
- **Dekning over 6G:** Ja/Nei (Dekker arbeidsgiver lønn utover 6G?).
- **Feriepengeavtale:**
  - _Alternativ A:_ Standard (NAV-regler: kun 12/15 uker opptjening).
  - _Alternativ B:_ Full opptjening (Arbeidsgiver betaler lønn i perm/feriepenger som normalt).
- **Feriepengegrunnlag for år 202X:** (Valgfritt/Estimat) For å beregne trekk i juni-måneden.

**Tidslinje:**

- **Startdato for permisjon:** Dato.
- **Ønsket barnehagestart:** Dato (typisk august).
- **Fordeling av uker:** Antall uker mødrekvote, fedrekvote og fellesperiode.

### 3.2 Beregningsregler (Logikk)

**Scenario A: 80 % Dekningsgrad**

1.  Beregne total utbetaling basert på 80 % av grunnlaget i 59 uker (eller gjeldende ukeantall for året).
2.  Hvis _Dekning over 6G = Nei_: Begrens grunnlaget til 6G _før_ 80 % beregnes.
3.  Trekke fra provisjonstap for hele perioden brukeren er i permisjon (lengre periode enn ved 100 %).

**Scenario B: 100 % Dekningsgrad + Ulønnet**

1.  Beregne total utbetaling basert på 100 % av grunnlaget i 49 uker.
2.  Identifisere **"Gapet"** (Antall uker fra permisjonsslutt til Barnehagestart).
3.  Beregne kostnaden av ulønnet permisjon i "Gapet" (Tapt arbeidsinntekt).
    - Systemet skal kunne beregne dette basert på at den med lavest inntekt tar ulønnet perm, eller en definert fordeling.

**Feriepenger (År 2):**

- Beregne differansen i utbetalte feriepenger året etter permisjon.
- Logikk: _Full lønn fra arbeidsgiver_ gir full opptjening. _NAV-utbetaling_ gir sterkt redusert opptjening.

### 3.3 Utdata og Visualisering (Output)

- **Totalregnskapet:** En tydelig sum som viser netto differanse mellom valgene.
  - _Eks: "Dere tjener totalt 45 000 kr mer på å velge 100 % + ulønnet permisjon."_
- **Likviditets-graf:** En visuell fremstilling (linjediagram) av akkumulert inntekt gjennom perioden frem til barnehagestart.
- **Anbefaling for "Gapet":** En tekst som viser hvem av foreldrene det lønner seg at tar den ulønnede permisjonen (basert på dagsats).

---

## 4. Ikke-funksjonelle Krav

### 4.1 Brukervennlighet og Forklaringer

- **Pedagogisk språk:** Applikasjonen skal unngå NAV-byråkratisk språk der det er mulig.
- **Hjelpetekster (Tooltips):** Alle komplekse felt (f.eks. "Dekning over 6G", "Feriepengegrunnlag") skal ha en tydelig forklaring som dukker opp ved behov.
  - _Spesifikt krav:_ Forklaringen av juni-lønna og ferietrekket må inkluderes som en infoboks ("Hvorfor trekkes jeg i lønn i juni?").
- **Responsivitet:** Må fungere sømløst på mobil og desktop.

### 4.2 Personvern

- **Ingen lagring:** Ingen data skal lagres på server. Alt skjer i nettleseren til brukeren (client-side only).

### 4.3 Nøyaktighet

- **Grunnbeløpet (G):** Skal bruke oppdatert G-verdi (p.t. 130 160 kr per 1. mai 2025), men ha mulighet for enkel oppdatering i koden.
- **Virkedager:** Beregninger skal ta utgangspunkt i gjennomsnittlig 21.7 arbeidsdager i måneden for nøyaktighet.

---

## 5. Akseptansekrav (Acceptance Criteria)

Disse scenarioene må bestås for at løsningen er godkjent:

1.  **Høytlønnet med provisjon (Scenarioet til oppdragsgiver):**
    - Gitt en bruker med 78k fast + 12k provisjon, der arbeidsgiver dekker fastlønn men ikke provisjon.
    - Applikasjonen skal vise at brukeren taper mer penger totalt sett jo lenger permisjonen varer (pga tapt provisjon), og at 100 % lønner seg betydelig.

2.  **"Gap"-testen:**
    - Gitt at 100 % permisjon slutter i mai, og barnehage starter i august.
    - Applikasjonen skal korrekt trekke fra tapt arbeidsinntekt for disse 3 månedene i totalregnestykket for 100 %-alternativet, og sammenligne dette mot 80 %-alternativet (som kanskje dekker nesten helt til august).

3.  **Feriepenge-sjokket:**
    - Gitt at bruker velger "NAV betaler feriepenger" vs. "Arbeidsgiver betaler".
    - Resultatet skal vise en tydelig differanse i utbetaling for "Neste år" (ofte 50k+ forskjell for høytlønnede).

4.  **Optimalisering av ulønnet perm:**
    - Hvis Mor tjener 800k og Far tjener 500k.
    - Applikasjonen skal foreslå at det er mest økonomisk lønnsomt at Far tar den ulønnede permisjonen/ferien i "Gapet".

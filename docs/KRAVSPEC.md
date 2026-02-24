# Kravspesifikasjon: Permisjonsøkonomi-kalkulator (MVP)

> **Status (feb 2026):** Kjernefunksjonalitet implementert som wizard (8 steg) + interaktiv kalender.
> Gjenstående fra denne spekken: Likviditetsgraf (3.3), fullstendig feriepenge-breakdown, tooltips for juni-lønn.
> Se `docs/PROGRESS.md` for full implementasjonsstatus.

---

## 1. Bakgrunn og Formål

Mange foreldre taper store summer (ofte 50 000 – 100 000 kr) på å velge 80 % dekningsgrad fremfor 100 % dekningsgrad kombinert med ulønnet permisjon. Dette gjelder spesielt for arbeidstakere med lønn over 6G, provisjonsbasert lønn, eller gode feriepengeavtaler gjennom arbeidsgiver.

Dagens kalkulatorer (NAV m.fl.) er for enkle og tar ikke høyde for:

1. **"Gapet"** mellom permisjonsslutt og barnehagestart (ofte mai–august).
2. **Arbeidsgivers spesifikke dekningsgrad** (f.eks. dekker fastlønn over 6G, men ikke provisjon).
3. **Tap av feriepengeopptjening** året etter (NAV vs. Arbeidsgiver).

---

## 2. Brukerhistorier

- **Som en forelder med provisjonslønn**, ønsker jeg å se hvor mye jeg taper i provisjon ved å velge lengre permisjon (80 %), slik at jeg kan vurdere om fritiden er verdt prisen.
- **Som et foreldrepar**, ønsker vi å se totalkostnaden av å ta ulønnet permisjon frem til barnehagestart, slik at vi vet om vi har råd til å velge 100 % dekningsgrad for å maksimere totalutbetalingen.
- **Som en arbeidstaker med god feriepengeavtale**, ønsker jeg å vite hvordan valget mitt påvirker feriepengene neste år, slik at jeg ikke får en negativ overraskelse i juni året etter permisjon.

---

## 3. Beregningsregler

### Scenario A: 80 % Dekningsgrad

1. Beregne total utbetaling basert på 80 % av grunnlaget i 59 uker.
2. Hvis _Dekning over 6G = Nei_: Begrens grunnlaget til 6G _før_ 80 % beregnes.
3. Trekke fra provisjonstap for hele perioden brukeren er i permisjon.

### Scenario B: 100 % Dekningsgrad + Ulønnet

1. Beregne total utbetaling basert på 100 % av grunnlaget i 49 uker.
2. Identifisere **"Gapet"** (antall uker fra permisjonsslutt til barnehagestart).
3. Beregne kostnaden av ulønnet permisjon i gapet (tapt arbeidsinntekt).
   - Systemet skal beregne basert på at den med lavest inntekt tar ulønnet perm, eller en definert fordeling.

### Feriepenger (År 2)

- Beregne differansen i utbetalte feriepenger året etter permisjon.
- Logikk: _Full lønn fra arbeidsgiver_ gir full opptjening. _NAV-utbetaling_ gir sterkt redusert opptjening.

---

## 4. Utdata og Visualisering

- **Totalregnskapet:** En tydelig sum som viser netto differanse mellom valgene.
  - _Eks: "Dere tjener totalt 45 000 kr mer på å velge 100 % + ulønnet permisjon."_
- **Likviditets-graf:** *(Ikke implementert ennå)* En visuell fremstilling (linjediagram) av akkumulert inntekt gjennom perioden frem til barnehagestart.
- **Anbefaling for "Gapet":** En tekst som viser hvem av foreldrene det lønner seg at tar den ulønnede permisjonen (basert på dagsats).

---

## 5. Akseptansekrav

Disse scenarioene må bestås:

1. **Høytlønnet med provisjon:**
   - Gitt en bruker med 78k fast + 12k provisjon, der arbeidsgiver dekker fastlønn men ikke provisjon.
   - Applikasjonen skal vise at brukeren taper mer penger totalt sett jo lenger permisjonen varer, og at 100 % lønner seg betydelig.

2. **"Gap"-testen:**
   - Gitt at 100 % permisjon slutter i mai, og barnehage starter i august.
   - Applikasjonen skal korrekt trekke fra tapt arbeidsinntekt for disse 3 månedene i totalregnestykket for 100 %-alternativet.

3. **Feriepenge-sjokket:**
   - Gitt at bruker velger "NAV betaler feriepenger" vs. "Arbeidsgiver betaler".
   - Resultatet skal vise en tydelig differanse i utbetaling for "Neste år".

4. **Optimalisering av ulønnet perm:**
   - Hvis Mor tjener 800k og Far tjener 500k.
   - Applikasjonen skal foreslå at det er mest lønnsomt at Far tar den ulønnede permisjonen i gapet.

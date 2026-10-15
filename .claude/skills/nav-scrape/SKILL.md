---
name: nav-scrape
description: Henter og oppdaterer NAV-dokumentasjonen i docs/nav/ fra nav.no og Lovdata (foreldrepenger, grunnbeløpet, engangsstønad, barnehagerett). Bruk når brukeren ber om å oppdatere eller verifisere NAV-regler på nytt, når G-beløpet kan ha endret seg (nytt grunnbeløp 1. mai), eller når docs/nav/ ser utdatert ut. Ikke bruk for å sjekke kode mot docs (det er nav-compliant).
allowed-tools: WebFetch Read Edit Write Bash(git diff:*) Bash(git status:*)
---

# nav-scrape

Henter offisiell NAV-dokumentasjon og oppdaterer `docs/nav/`.
Dato-, UI- og kodekonvensjoner står i `AGENTS.md` og gjentas ikke her.

## Filer skillen skriver

Skillen skriver kun til disse filene i `docs/nav/`, og ingen andre steder:

| Fil                                 | Kilde-URL                                               | Innhold                                |
| ----------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| `docs/nav/foreldrepenger.md`        | https://www.nav.no/foreldrepenger                       | Kvoter, krav, feriepenger              |
| `docs/nav/grunnbelopet.md`          | https://www.nav.no/grunnbelopet                         | G-verdi og historikk                   |
| `docs/nav/engangsstonad.md`         | https://www.nav.no/engangsstonad                        | Engangsbeløp                           |
| `docs/nav/barnehagerett.md`         | https://lovdata.no/nav/lov/2005-06-17-64/kapIV/%C2%A716 | Barnehageloven § 16, opptak og frister |

Skillen skriver aldri til `src/`, `AGENTS.md` eller `CHANGELOG.md`.
Nye undersider fra nav.no/foreldrepenger kan gi en ny fil i `docs/nav/`, men si fra til brukeren først og legg til en rad i tabellen i `docs/nav/foreldrepenger.md` hvis den har en liste over relaterte filer.

## Fremgangsmåte

1. Kjør `git status --short docs/nav/`.
   Har filene ikke-committede endringer, er de håndskrevet eller under arbeid: si fra til brukeren før du fortsetter.
2. Les den eksisterende filen i `docs/nav/` før du henter kilden.
3. Hent kilde-URL-en med WebFetch.
   Sjekk også ett nivå med underlenker på nav.no/foreldrepenger for seksjoner som kun-far-regler og aktivitetskrav.
   Hvis en URL ikke svarer eller har endret struktur, stopp og rapporter det i stedet for å gjette.
4. Sammenlign kilden med den eksisterende filen og endre bare det som faktisk er endret (se "Hva du skal trekke ut").
5. Ikke overskriv håndskrevet innhold.
   Håndskrevet innhold er alt som ikke er rene gjengivelser av kilden, som kalkulatorspesifikke kommentarer, tolkninger og avrundingsnotater.
   Bruk Edit på enkeltlinjer og tabellceller, ikke Write på hele filen.
6. Kjør `git diff docs/nav/` og gå gjennom hver endring.
   Alt som fjerner eller omskriver tekst som ikke er hentet fra kilden, skal tilbakestilles eller legges fram for brukeren.
7. Oppdater headeren i hver endrede fil:

   ```markdown
   > Kilde: https://...
   > Hentet: YYYY-MM-DD
   ```

8. Kjør `nav-compliant` for å sammenligne oppdaterte docs mot `src/lib/constants.ts`, og rapporter avvik.
   Ikke endre `src/lib/constants.ts` selv.

## Hva du skal trekke ut

### foreldrepenger.md

- Kvoter i uker ved 100 % og 80 % (totalt, mødrekvote, fedrekvote, fellesperiode)
- Kun-far-regler: totalt, uten og med aktivitetskrav, startdato
- Feriepenger: sats og antall uker som gir grunnlag
- Maks beregningsgrunnlag (6G)
- Aktivitetskrav-betingelser

### grunnbelopet.md

- Gjeldende G og dato (1. mai ÅÅÅÅ)
- 6G (maks foreldrepenger)
- Endringsfaktor fra forrige år
- Dato for neste oppdatering

### engangsstonad.md

- Gjeldende engangsbeløp

### barnehagerett.md

- Fødselsmåneder og tilhørende rett til opptak (logikken er beskrevet i filen)
- Søknadsfrister (fastsettes kommunalt)

## Oppdateringsformat

Behold eksisterende filstruktur.
Oppdater tallverdier i tabeller og løpende tekst.
Hvis NAV oppgir «X uker og 1 dag», men kalkulatoren runder til hele uker, legg til en kommentar etter mønsteret i de eksisterende filene.

## Ferdig når

- Hver endrede fil har ny `Hentet`-dato.
- `git diff docs/nav/` er gjennomgått uten utilsiktede slettinger.
- `nav-compliant` er kjørt, og avvik er rapportert til brukeren.

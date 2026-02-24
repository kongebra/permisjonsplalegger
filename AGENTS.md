# AGENTS.md

## 🎯 Prosjektmål

Dette er en **permisjonsplanlegger**, ikke bare en enkel kalkulator. Målet er å hjelpe brukere med å skape den optimale planen for sin permisjon gjennom en interaktiv kalender.

- **Planlegging:** Brukere skal kunne legge opp løpet med permisjon, ferie og jobb.
- **"Gapet":** Visualisere tidsrommet mellom permisjonsslutt og barnehagestart, og beregne behovet for ferie eller ulønnet permisjon.
- **Økonomi:** Finne den beste økonomiske løsningen (80% vs 100% dekningsgrad) basert på brukerens unike plan.

## 🌿 Branching & PR-flyt

- **Hoved-branch:** `main`.
- **Workflow:** All ny funksjonalitet og feilretting **skal** gjøres via Pull Requests (PR), selv om vi kun har én hoved-branch. Dette er for å sikre review fra GitHub Copilot og opprettholde kodekvalitet.

## 🛠 Verktøy og Skills (Kritiske kommandoer)

- **Kjøring:** `bun run dev`.
- **Validering:** `bun run lint`
- **Bygg:** `bun run build`.

## 🧠 Domenelogikk: Planleggeren

- **Dato-håndtering (Kritisk):** - Internt: Eksklusive sluttdatoer (dagen etter siste dag).
  - UI: Inklusive sluttdatoer (viser den faktiske siste dagen).
  - Bruk alltid `date-fns` v4 for logikk.
- **Barnehagestart:** Se `docs/nav/barnehagerett.md` for lovhjemmel og implementasjonslogikk (september/november-fødte kan starte tidligere; desember-fødte venter til neste august-opptak).
- **NAV-regler:** Vi tilstriber å følge NAVs regelverk (5-dagers uker), men vi er et uavhengig verktøy.

## 🏗 Teknisk Standard

- **State:** All plan-logikk og data skal ligge i **Zustand-store** (`src/store/`).
- **Beregninger:** All kjerne-logikk for økonomi og datoer skal skje i `src/lib/calculator/`.
- **Konstanter:** Faste verdier (G, maks beregningsgrunnlag) skal ligge i `src/lib/constants.ts` – ikke hardkodes andre steder.
- **UU (Universell Utforming):** Vi skal opprettholde en høy UU-standard og fylle alle relevante WCAG-krav for å sikre en inkluderende brukeropplevelse.

## ✅ Sjekkliste for ferdigstillelse

1. **Logikk:** Er beregningene gjort ved hjelp av funksjonene i `src/lib/calculator/`?
2. **NAV-sjekk:** Har du sjekket `docs/nav/*.md` for å sikre at logikken er i tråd med NAVs dokumenterte regler?
3. **Disclaimer:** Er det tydelig opplyst i UI at vi _ikke_ er i samarbeid med NAV, og at beregningene er veiledende?
4. **Kalender-UX:** Fungerer justeringer i kalenderen sømløst, og oppdateres "gapet" korrekt når brukeren legger til ferie eller flytter perioder?
5. **PR-beskrivelse:** Er det lagt ved en folkelig, ikke-teknisk oppsummering av endringen nederst i PR-en?
6. **Språk:** Er kommentarer på **norsk** og variabler/kode på **engelsk**?
7. **Changelog:** Er `CHANGELOG.md` i rot oppdatert med en kort, ikke-teknisk beskrivelse av endringen? Bruk én `## ÅÅÅÅ-MM-DD`-heading per dag og legg nye `###`-seksjoner under eksisterende heading for den dagen — ikke opprett duplikate datoer.

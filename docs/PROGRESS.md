# Prosjekt-fremgang

Sist oppdatert: 10. februar 2026

## Status: Wizard + Planlegger-kalender ferdig

Applikasjonen har to moduser: en 8-trinns onboarding-wizard og en interaktiv planlegger-kalender med økonomi-fane. Gammel kalkulator-side beholdt under `/gammel` for referanse.

---

## Arkitektur-oversikt

### Brukerflyt

```
/ (redirect) → /planlegger (wizard) → /planlegger/kalender (kalender + økonomi)
                                      └→ /gammel (legacy kalkulator, beholdt for referanse)
/personvern  → Personvernerklæring (GDPR)
/om          → Om-side med disclaimer
/sitemap.xml → Auto-generert sitemap
/robots.txt  → Auto-generert robots.txt
```

### State management

Zustand store med slices:
- **wizardSlice** — Wizard-steg, termindato, rettigheter, dekning, fordeling, barnehage
- **periodsSlice** — Custom perioder, undo-stack, leaveResult
- **economySlice** — Lønnsdata for begge foreldre
- **jobSettingsSlice** — Jobbtype (kontor/turnus) per forelder
- **persistenceSlice** — Lagring/lasting av plan til localStorage
- **uiSlice** — Settings-sheet, autolagring, tabs

### Lagdeling

```
src/lib/          → Ren beregningslogikk (ingen UI-avhengigheter)
src/store/        → Zustand state management
src/components/   → UI-komponenter (wizard, planner, calendar, input, results)
src/app/          → Next.js App Router sider
```

---

## Viktige designbeslutninger

### Dato-håndtering

- **Internt:** Sluttdatoer er **eksklusive** (dagen ETTER siste permisjonsdag)
- **Visning:** Sluttdatoer vises **inklusivt** via `subDays(date, 1)`
- **Sammenligninger:** Bruk `isSameDay()` eller `startOfDay()` for tidspunkt-uavhengighet

### State management

Zustand med slices ble valgt over React Context for:
- Lettere å dele state mellom wizard og planner
- Undo/redo-funksjonalitet (periodsSlice)
- localStorage-persistering (persistenceSlice)
- Bedre ytelse (fine-grained subscriptions med `useShallow`)

### Wizard → Planner overgang

- Wizard samler input → beregner `LeaveResult` → konverterer til `CustomPeriod[]`
- `initializePeriodsFromLeave()` mapper wizard-segmenter til editerbare perioder
- Wizard-perioder er låst (`isLocked: true`), bruker-perioder kan fritt redigeres

### localStorage-bruk

- Planlegger bruker localStorage for lagring/lasting av planer (`permisjonsplan-v1`)
- PostHog analytics bruker `persistence: "memory"` — ingen lagring i brukerens nettleser
- Ingen samtykke-banner nødvendig (ekomloven §2-7b)

---

## Gjenstående

### Fra kravspek

1. **Likviditetsgraf** — Akkumulert inntekt over tid som linjediagram (80% vs 100%). MonthlyIncomeOverview viser per-måned, men ikke akkumulert sammenligning.
2. **Feriepenge-beregning (fullstendig)** — Delvis i `economy.ts`, men mangler detaljert breakdown av opptjeningsperioder og juni-trekk forklaring.
3. **Tooltips for juni-lønna** — Kravspek sier "Forklaringen av juni-lønna og ferietrekket må inkluderes som en infoboks". Ikke implementert.

### UX/Kvalitet

4. **Input-validering** — Grunnleggende, men mangler tydelige feilmeldinger for ugyldige scenarier.
5. **Mobiloptimalisering** — Fungerer, men kan forbedres (spesielt planner-kalenderen).
6. **Dark mode testing** — CSS-variabler er definert, men ikke grundig testet.
7. **Akseptansetest-verifisering** — De fire akseptansekriteriene fra `KRAVSPEC.md` bør kjøres gjennom systematisk.

### Teknisk

8. **Tester** — E2E a11y-tester finnes (Playwright), men mangler unit/integration-tester.
9. **Legacy-opprydding** — `/gammel`-ruten og tilhørende input-komponenter kan potensielt fjernes hvis wizard/planner dekker alt.

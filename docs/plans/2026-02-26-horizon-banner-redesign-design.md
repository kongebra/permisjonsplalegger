# Design: Kalender-topprad — full komponentersetting

**Dato:** 2026-02-26
**Bakgrunn:** UX-forskning (3 parallelle agenter) avdekket at `LeaveHorizonBanner` lider av tre strukturelle problemer: (1) informasjonsoverskudd med fem simultane datapunkter uten hierarki, (2) overlapp med `StatsBar` som beregner gap ulikt og skaper tvil om systemets pålitelighet, (3) «du er her»-markøren er 2px bred og ulesbar på mobil, med `title`-attributt som aldri vises på touch-enheter.

---

## Løsning

To distinkte lag øverst i kalenderen med tydelig ansvarsfordeling:

```
┌──────────────────────────────────────────┐
│ ✔ Gap dekket med ferie/permisjon         │  ← PlanStatusBar
│ Mor 18uk  │  Far 12uk  │  Bhg 1. aug    │
└──────────────────────────────────────────┘
[────rosa────────][──blå──][gap]  ▼ APR      ← LeaveHorizonLine

[← April 2027 →]                             ← NavHeader (uendret)
[Kalender]
```

---

## Komponent 1: `PlanStatusBar` (ny)

Erstatter og utvider `StatsBar`. Eier all status-kommunikasjon — én komponent, én sannhetskilde.

**Innhold:**
- **Rad 1:** Gap-alert (eksisterende logikk fra `StatsBar`):
  - `✔ Gap dekket med ferie/permisjon` — grønn bakgrunn
  - `⚠ X dager udekket gap` — oransj bakgrunn
  - Skjules hvis `daycareEnabled` er false (ingen barnehagestart = ingen gap å snakke om)
- **Rad 2** (kun hvis `daycareEnabled`): Tre kompakte chips:
  - `Mor Xuk` i mor-farge (`text-[var(--color-mother)]`)
  - `Far Xuk` i far-farge (`text-[var(--color-father)]`)
  - `Bhg DD. MMM` nøytral

**Props:**
```ts
interface PlanStatusBarProps {
  leaveResult: LeaveResult;
  customPeriods: CustomPeriod[];
  daycareEnabled: boolean;
  daycareDate: Date | null;
}
```

**Fil:** `src/components/planner/PlanStatusBar.tsx` (ny fil)

**Plassering i layout:** Øverst i `PlannerCalendar`, over orienteringslinjen.

---

## Komponent 2: `LeaveHorizonLine` (refaktorert fra `LeaveHorizonBanner`)

Rent orienteringsverktøy. Ingen tall, ingen tekst — kun farget linje + månedsbadge + tap-navigasjon.

**Innhold:**
- Samme fargede linje som i dag: rosa (mor), blå (far), stiplet oransj (gap)
- Markøren endres fra `w-0.5 bg-foreground/60` til en pill-badge (`20×20px`) med månedsforkortning (f.eks. `APR`)
- Tap-navigasjon: klikk/tap på linje beregner dato fra x-posisjon og hopper til riktig måned

**Tap-navigasjonslogikk:**
```ts
const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const targetDate = addDays(leaveStart, Math.round(ratio * totalDays));
  onMonthChange(startOfMonth(targetDate));
};
```

**Props:**
```ts
interface LeaveHorizonLineProps {
  leaveResult: LeaveResult;
  activeMonth: Date;
  daycareEnabled: boolean;
  daycareDate: Date | null;
  onMonthChange: (month: Date) => void;
}
```

**Tilgjengelighet:**
- `role="slider"`, `aria-label="Naviger i permisjonstidslinjen"`, `aria-valuetext="[månednavn]"`
- Piltaster for keyboard-navigasjon (← forrige måned, → neste måned)

**Fil:** `src/components/planner/LeaveHorizonLine.tsx` (ny fil, erstatter `LeaveHorizonBanner.tsx`)

---

## PlannerCalendar — layoutendringer

| Nå | Nytt |
|---|---|
| `<LeaveHorizonBanner>` øverst | `<PlanStatusBar>` øverst |
| `<StatsBar>` etter kalender | `<LeaveHorizonLine>` under PlanStatusBar |
| — | `<StatsBar>` fjernes |

`LeaveHorizonBanner.tsx` og `StatsBar.tsx` slettes etter migrering.

---

## Hva som bevares

- Gap-beregningslogikken i `StatsBar` (inkl. `workDays`-fix fra 2026-02-26) flyttes til `PlanStatusBar`
- Fargeblokk-logikken i `LeaveHorizonBanner` (mor/far/gap-prosenter) flyttes til `LeaveHorizonLine`
- Alle eksisterende props som `PlannerCalendar` sender inn, rekonfigureres til de to nye komponentene

---

## Ikke i scope

- MiniMonthStrip (A/B-test bak PostHog feature flag) — uendret
- NavHeader (pil-navigasjon + månedsnavn) — uendret
- Fargeforklaringen (legend) — uendret
- Kalender-scrolling/swipe-logikk — uendret

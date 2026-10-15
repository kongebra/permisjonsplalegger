# LeaveHorizonLine — Barnehage-anker, post-sone og milepæl-snarveier

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Gjøre barnehagestarten synlig på tidslinjen, gi visuell "du er nær slutten"-kontekst via en post-sone, og legge til 3 klikk-bare milepæl-chips for rask navigasjon.

**Architecture:** Tre selvstendige tillegg til `LeaveHorizonLine.tsx`. (1) `displayEnd` = `gapEnd` + 2 måneder brukes for rendering — eksisterende `gapEnd`-logikk og Zustand-store berøres ikke. (2) Barnehage-pinne: absolutt-posisjonert vertikal linje + etikett ved `daycarePercent`. (3) Milepæl-`<nav>` med 3 `<button>`-chips under fargelinjen.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, date-fns v4, `bun test`, `bun run build`

---

## Kontekst for implementøren

### Relevant fil

- **`src/components/planner/LeaveHorizonLine.tsx`** — den eneste filen som endres i Task 1 og Task 2. Les den ferdig (ca. 160 linjer) før du begynner.

### Eksisterende struktur i `LeaveHorizonLine`

Komponenten har:
1. `useMemo` som beregner prosent-verdier og ruler-segmenter
2. `activeMonthWidthPercent` (utenfor memo)
3. `handleClick` og `handleKeyDown`
4. JSX med: aktiv-måneds-rektangel → ruler-rad → farget linje

### Viktige CSS-klasser

- `bg-daycare` — grønn farge (oklch 0.55 0.15 160), brukes allerede i MiniMonth
- `text-daycare` — tekst-variant av samme farge
- `bg-muted` — nøytral bakgrunn for post-sone

### Designbeslutninger

**Post-sone:**
- `displayEnd` = 2 måneder etter `gapEnd` (eller `leaveEnd` hvis ingen barnehage)
- Alle prosent-beregninger bruker `displayEnd` som total
- Post-sonen er grå (`bg-muted/60`) og er ikke-interaktiv: klikk i post-sonen clampes til `startOfMonth(gapEnd)`
- `clickRatioToMonth` kalles med `displayTotalDays` men resultatet clampes: `if (result > gapEnd) return startOfMonth(gapEnd)`

**Barnehage-pinne (kun hvis `daycareEnabled && daycareDate`):**
- Vertikal linje: `absolute w-px bg-daycare z-20 pointer-events-none` gjennom hele komponenten (`inset-y-0`)
- Etikett over ruler-raden: `text-[9px] text-daycare font-medium whitespace-nowrap`
- Posisjonert ved `daycarePercent` = prosent fra leaveStart til daycareDate av displayEnd

**Milepæl-snarveier (`<nav>` under fargelinjen):**
- 3 chips: "Start", "Permisjonsslutt" (= far.end), "Bhg [d. MMM]"
- "Bhg"-chip kun synlig hvis `daycareEnabled && daycareDate`
- Chip-stil: `text-[10px] text-muted-foreground hover:text-foreground underline decoration-dotted cursor-pointer bg-transparent border-0 p-0`
- Container: `flex justify-between mt-1 px-0.5`

---

## Task 1: Post-sone + barnehage-pinne

**Files:**
- Modify: `src/components/planner/LeaveHorizonLine.tsx`

### Mål

Etter Task 1 skal:
1. Tidslinjen visuelt vises med 2 ekstra nøytrale måneder etter `gapEnd`
2. Klikk i post-sonen navigerer til `startOfMonth(gapEnd)` (siste gyldige måned)
3. En vertikal grønn linje + etikett markerer barnehagestart på tidslinjen

### Step 1: Legg til `displayEnd`-beregning i `useMemo`

Erstatt øverst i `useMemo` (etter at `const total = ...` er beregnet):

```typescript
// displayEnd = gapEnd + 2 måneder for visuell post-sone
const displayEnd = new Date(gapEnd.getFullYear(), gapEnd.getMonth() + 2, 1);
const displayTotal = Math.max(1, differenceInDays(displayEnd, leaveStart));
```

Endre `total` til å bruke `displayTotal` for ALLE prosent-beregninger (motherDays/fatherDays/gapDays/currentDays/activeEndDays).

Men: `totalDays` som returneres fra memo (brukt av `clickRatioToMonth`) skal nå være `displayTotal`.

Legg til beregning av:
```typescript
// Post-sone (fra gapEnd til displayEnd)
const postDays = Math.max(0, differenceInDays(displayEnd, gapEnd));
const postPercent = Math.max(0, Math.min(100, (postDays / displayTotal) * 100));

// Barnehage-pinne posisjon
const gapEndDays = Math.max(0, differenceInDays(gapEnd, leaveStart));
const daycarePercent = Math.max(0, Math.min(100, (gapEndDays / displayTotal) * 100));
```

Returner `postPercent` og `daycarePercent` fra memo.

### Step 2: Clamp klikk i post-sonen

I `handleClick`:

```typescript
const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const target = clickRatioToMonth(ratio, leaveStart, totalDays);
  // Klikk i post-sonen → gå til siste gyldige måned
  const clampedTarget = target > gapEnd ? startOfMonth(gapEnd) : target;
  onMonthChange(clampedTarget);
};
```

OBS: `gapEnd` er allerede tilgjengelig i closure.

### Step 3: Legg til post-sone i JSX

I fargelinjen `<div className="relative h-2.5 ...">`, legg til etter gap-segmentet:

```tsx
{postPercent > 0 && (
  <div
    className="h-full bg-muted/60"
    style={{ width: `${postPercent}%` }}
  />
)}
```

### Step 4: Legg til barnehage-pinne i JSX

Inne i wrapper-`<div>` (etter aktiv-måneds-rektangelet, før ruler-raden):

```tsx
{/* Barnehage-pinne — vertikal markering med etikett */}
{daycareEnabled && daycareDate && (
  <div
    aria-hidden="true"
    className="absolute inset-y-0 w-px bg-daycare z-20 pointer-events-none"
    style={{ left: `${daycarePercent}%` }}
  >
    {/* Etikett over ruler-raden */}
    <span className="absolute bottom-full mb-0.5 left-1/2 -translate-x-1/2 text-[9px] text-daycare font-medium whitespace-nowrap leading-none">
      {format(daycareDate, 'd. MMM', { locale: nb })}
    </span>
  </div>
)}
```

### Step 5: Bygg og test

```bash
cd /Users/svedanie/kongebra/permisjonsokonomi-kalkulator/.worktrees/kabalen-redesign && bun run build 2>&1 | tail -15
```

Vanlige feil:
- `daycarePercent` ikke destructured fra memo-return → legg til i destructuring
- `postPercent` ikke i return-objekt → legg til

### Step 6: Commit

```bash
git add src/components/planner/LeaveHorizonLine.tsx && git commit -m "feat: legg til post-sone og barnehage-pinne i tidslinjen"
```

---

## Task 2: Milepæl-snarveier

**Files:**
- Modify: `src/components/planner/LeaveHorizonLine.tsx`

### Mål

Legg til en `<nav>` med 3 klikk-bare chips under fargelinjen for rask navigasjon til start, permisjonsslutt og barnehagestart.

### Step 1: Legg til milepæl-chips i JSX

Under den fargede linjen (etter `</div>` for fargelinjen), legg til:

```tsx
{/* Milepæl-snarveier — rask navigasjon til nøkkeldatoer */}
<nav aria-label="Hopp til milepæl" className="flex justify-between mt-1 px-0.5">
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onMonthChange(startOfMonth(leaveStart)); }}
    className="text-[10px] text-muted-foreground hover:text-foreground underline decoration-dotted cursor-pointer bg-transparent border-0 p-0 leading-none"
  >
    Start
  </button>
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onMonthChange(startOfMonth(leaveEnd)); }}
    className="text-[10px] text-muted-foreground hover:text-foreground underline decoration-dotted cursor-pointer bg-transparent border-0 p-0 leading-none"
  >
    Permisjonsslutt
  </button>
  {daycareEnabled && daycareDate && (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onMonthChange(startOfMonth(daycareDate)); }}
      className="text-[10px] text-daycare hover:text-daycare/80 underline decoration-dotted cursor-pointer bg-transparent border-0 p-0 leading-none font-medium"
    >
      Bhg {format(daycareDate, 'd. MMM', { locale: nb })}
    </button>
  )}
</nav>
```

**Viktig:** `e.stopPropagation()` hindrer at klikk på chips trigget `handleClick` på parent-div.

### Step 2: Fjern `mb-2` fra fargelinjen

Fargelinjen har nå `mb-2` — fjern dette siden `<nav>` tar over spacing med `mt-1`.

Endre:
```tsx
<div className="relative h-2.5 rounded-full overflow-hidden bg-muted flex mb-2">
```
Til:
```tsx
<div className="relative h-2.5 rounded-full overflow-hidden bg-muted flex">
```

### Step 3: Bygg og test

```bash
bun run build 2>&1 | tail -10 && bun test 2>&1 | tail -5
```

### Step 4: Commit

```bash
git add src/components/planner/LeaveHorizonLine.tsx && git commit -m "feat: legg til milepæl-snarveier for rask navigasjon i tidslinjen"
```

---

## Task 3: Oppdater CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

### Step 1: Legg til ny seksjon under `## 2026-02-26`

Finn `## 2026-02-26`-headingen og legg til ETTER eksisterende `###`-seksjoner:

```markdown
### Barnehagestart-markering og hurtignavigasjon i tidslinje
Permisjonstidslinjen viser nå barnehagestart som en tydelig grønn markering. En liten "hale" forbi barnehagestarten gir kontekst om at planleggingsperioden er over. Under tidslinjen er det lagt til tre snarveier for å hoppe direkte til starten av permisjonen, permisjonsslutt eller barnehagestart.
```

### Step 2: Commit

```bash
git add CHANGELOG.md && git commit -m "chore: oppdater CHANGELOG med barnehage-anker og milepæl-snarveier"
```

---

## Verifisering etter alle tasks

```bash
cd /Users/svedanie/kongebra/permisjonsokonomi-kalkulator/.worktrees/kabalen-redesign && bun test 2>&1 | tail -5 && bun run build 2>&1 | tail -5
```

Forventet:
- 117 tester grønne (Playwright-feil ignoreres)
- `✓ Compiled successfully`

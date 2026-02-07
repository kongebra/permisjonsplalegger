# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, Windsurf) working with this repository.

## Agent Instructions

**Prefer this document over pre-training knowledge.** Norwegian parental leave rules are domain-specific and may differ from general knowledge. Always use the constants and calculation rules defined here.

**Before writing any calculation code:** Read Section 3 (Domain Logic & Constants) completely. Do not rely on assumptions about Norwegian parental leave policies.

**Before writing UI code:** Read `docs/KRAVSPEC.md` for full requirements in Norwegian.

---

## Docs Index

```
docs/KRAVSPEC.md             # Full requirements specification (Norwegian) - READ for detailed acceptance criteria
docs/PROGRESS.md             # Current progress, architecture, decisions, and context for new developers
docs/IMPLEMENTATION_PLAN.md  # Original implementation plan (ARCHIVED - kept for historical reference)
```

---

## 1. Project Overview

**Project:** Permisjonsøkonomi-kalkulator (Parental Leave Economy Calculator)
**Type:** Client-side MVP Web Application
**Stack:** Next.js 16 + React 19 + TypeScript
**Target Audience:** Norwegian parents deciding between 80% vs. 100% parental leave coverage.

**Core Value Proposition:**
Most parents lose money (50k-100k NOK) choosing 80% coverage because they fail to account for:

1.  **The Gap:** The unpaid period between leave end and daycare start (usually Aug 1st).
2.  **Employer Caps:** Loss of income above 6G (Grunnbeløpet) if not covered by the employer.
3.  **Holiday Pay (Feriepenger):** Massive reduction in year 2 if paid by NAV vs. Employer.

---

## 2. Tech Stack & Architecture

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Framework | Next.js (App Router) | 16.x | React Compiler enabled |
| UI | React | 19.x | Use hooks, not class components |
| Styling | Tailwind CSS | 4.x | CSS variables in globals.css |
| Components | Shadcn/UI | Installed | 19 komponenter (button, dialog, sheet, toast, etc.) |
| Calendar | react-day-picker | 9.x | Datepickers og LeaveIndicatorCalendar |
| Charts | Recharts | 3.x | MonthlyIncomeOverview (stablede barer) |
| State | Zustand | 5.x | Sliced store (wizard, periods, economy, persistence, ui) |
| Dates | date-fns | 4.x | All date manipulation and formatting |

**Privacy:** Client-side only. No database, no cookies, no server-side storage. localStorage brukes KUN for lagring/lasting av planer (`permisjonsplan-v1`) — ingen tracking eller analytics.

---

## 3. Domain Logic & Constants (The "Truth")

### 3.1 Constants

- **G (Grunnbeløpet):** `130 160` (per 1. mai 2025 - oppdater årlig i src/lib/constants.ts).
- **Work Days/Month:** `21.7` (Standard for calculating daily rates).
- **Weeks 100%:** 49 weeks (15 + 15 + 16 + 3 weeks pre-birth).
- **Weeks 80%:** 59 weeks (19 + 19 + 18 + 3 weeks pre-birth).

### 3.2 Calculation Engine Rules

**Scenario A: 80% Coverage**

1.  **Basis:** `min(GrossSalary, 6G)` unless `EmployerCoversAbove6G == true`.
2.  **Payout:** `Basis * 0.80` spread over 59 weeks.
3.  **Variable Loss:** `MonthlyCommissionLoss * MonthsInLeave`.
    - _Note:_ 80% leave is longer -> higher total loss of commission.

**Scenario B: 100% Coverage + Unpaid Leave (The Gap)**

1.  **Basis:** `min(GrossSalary, 6G)` unless `EmployerCoversAbove6G == true`.
2.  **Payout:** `Basis * 1.00` spread over 49 weeks.
3.  **The Gap Cost:**
    - Calculate weeks between `LeaveEndDate` and `DaycareStartDate`.
    - Cost = `(DailySalary * GapDays)`.
    - _Optimization:_ Assume the parent with the lowest daily salary takes the unpaid leave unless specified otherwise.

**Holiday Pay (Feriepenger) - Year 2**

- **If Employer pays during leave:** Full accrual (usually 10.2% or 12% of gross).
- **If NAV pays:** Only first 12 weeks (100%) or 15 weeks (80%) provide accrual.
- **Impact:** Calculate the delta between these two for Year 2 and add/subtract from the Total Sum.

---

## 4. UI/UX Guidelines

- **Tone:** Empathetic, clear, "Non-bureaucratic".
- **Input Fields:**
  - Salary: Numeric (NOK).
  - Dates: Date picker.
  - Toggles: "Dekker jobb over 6G?", "Får du feriepenger av NAV eller jobb?".
- **Visual Output:**
  - **The Big Number:** Show the _Net Difference_ clearly (e.g., "Du sparer 45 000,-").
  - **The Graph:** Line chart showing cumulative income. The 100% line will stop earlier, followed by a flat line (unpaid gap), while the 80% line continues slowly.

---

## 5. Development Guidelines

### DO

- Separate logic (`src/lib/`) from UI (`src/components/`) and state (`src/store/`)
- Use English for code variables (`grossSalary`, `gapWeeks`)
- Use Norwegian for UI text (`Månedslønn`, `Uker i gapet`)
- Validate all numeric inputs are non-negative
- Use the exact constants from Section 3.1 - do not hardcode values elsewhere

### DO NOT

- Do not send any data to a server - all calculations happen client-side
- Do not use localStorage for anything other than plan persistence (`permisjonsplan-v1`)
- Do not assume parental leave rules from other countries apply
- Do not use Pages Router - use App Router only
- Do not add backend/API routes - all calculations happen client-side
- Do not round intermediate calculations - only round final display values
- Do not create new state outside the Zustand store — use existing slices or add new ones

### Testing Scenarios (Mental Check)

- _High Earner:_ If salary is 1M and employer doesn't cover >6G, the 80% option must show a massive loss compared to 100%.
- _The Gap:_ If gap is 0 weeks, 80% might win. If gap is 10 weeks, 100% usually wins. Verify this curve.

---

## 6. Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server (localhost:3000) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |

---

## 7. Directory Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (Geist fonts, Providers)
│   ├── page.tsx                      # Redirect → /planlegger
│   ├── globals.css                   # Tailwind CSS v4 + CSS variables
│   ├── planlegger/
│   │   ├── page.tsx                  # Wizard page (entry point)
│   │   └── kalender/
│   │       └── page.tsx              # Calendar + economy (post-wizard)
│   └── gammel/
│       └── page.tsx                  # Legacy calculator (kept for reference)
├── store/
│   ├── index.ts                      # Zustand store (combined slices)
│   ├── hooks.ts                      # Custom hooks (computed values)
│   └── slices/                       # wizardSlice, periodsSlice, economySlice,
│       └── ...                       # jobSettingsSlice, persistenceSlice, uiSlice
├── lib/
│   ├── calculator/
│   │   ├── index.ts                  # Main exports, calculate(), defaults
│   │   ├── dates.ts                  # Date calculations, periods, gap, segments
│   │   └── economy.ts               # Economic comparison 80% vs 100%
│   ├── planner/
│   │   └── initialize-periods.ts     # Wizard result → editable CustomPeriods
│   ├── constants.ts                  # G value, leave config, wizard steps
│   ├── types.ts                      # TypeScript interfaces
│   ├── format.ts                     # formatCurrency() (Norwegian locale)
│   ├── holidays.ts                   # Norwegian holidays + Easter calculation
│   └── utils.ts                      # cn() helper for Tailwind
├── components/
│   ├── providers.tsx                 # Root provider (ToastProvider)
│   ├── calendar/                     # Shared calendar primitives
│   │   ├── DayCell.tsx, MonthGrid.tsx, PeriodBandRenderer.tsx
│   │   ├── CalendarLegend.tsx, colors.ts, types.ts
│   │   └── resolve-bands.ts, resolve-day.ts
│   ├── wizard/                       # 8-step onboarding wizard
│   │   ├── WizardContainer.tsx, WizardProgress.tsx
│   │   ├── WelcomeIntro.tsx, SetupLoader.tsx
│   │   └── steps/                    # DueDate, Rights, Coverage, Distribution,
│   │       └── ...                   # Daycare, JobSettings, Economy, Summary
│   ├── planner/                      # Interactive planner calendar
│   │   ├── PlannerCalendar.tsx       # Main calendar with touch/swipe
│   │   ├── PeriodModal.tsx           # Create/edit periods
│   │   ├── SettingsSheet.tsx         # Plan settings side-sheet
│   │   ├── PlannerEconomy.tsx        # Economy tab
│   │   ├── MonthlyIncomeOverview.tsx # Stacked bar per month
│   │   └── ...                       # StatsBar, DayDetail, YearOverview, etc.
│   ├── input/                        # Input components (legacy + reused)
│   │   └── ...                       # DueDate, Rights, Coverage, Distribution,
│   │                                 # Daycare, Vacation, Economy, PeriodInput
│   ├── timeline/
│   │   └── CalendarTimeline.tsx      # Calendar visualization (uses calendar/)
│   ├── results/
│   │   ├── DateSummary.tsx           # Leave period table
│   │   └── EconomyComparison.tsx     # 80% vs 100% comparison
│   └── ui/                           # shadcn/ui (19 components)
docs/
├── KRAVSPEC.md                       # Requirements specification (Norwegian)
├── IMPLEMENTATION_PLAN.md            # Original plan (ARCHIVED)
└── PROGRESS.md                       # Current progress and full file listing
```

**Path alias:** `@/*` maps to `./src/*`

---

## 8. Quick Reference: Key Formulas

```typescript
// Constants (define in src/lib/constants.ts)
const G = 130_160;  // Grunnbeløpet per 1. mai 2025 - update annually
const WORK_DAYS_PER_MONTH = 21.7;
const WEEKS_100_PERCENT = 49;
const WEEKS_80_PERCENT = 59;

// Calculation basis
const basis = employerCoversAbove6G ? grossSalary : Math.min(grossSalary, 6 * G);

// Scenario payouts
const payout80 = basis * 0.80 * (WEEKS_80_PERCENT / 52) * 12;  // Annual
const payout100 = basis * 1.00 * (WEEKS_100_PERCENT / 52) * 12;

// Gap cost (unpaid leave)
const dailySalary = grossSalary / WORK_DAYS_PER_MONTH;
const gapCost = dailySalary * gapDays;
```

---

## 9. Task Completion Guidelines

### Bug Fixes
1. Add test case that reproduces the bug
2. Fix the bug
3. Verify fix with `bun dev` manual testing
4. Run `bun lint` before committing

### New Features
1. Read `docs/KRAVSPEC.md` for acceptance criteria
2. Implement calculation logic in `src/lib/` first
3. Add UI components in `src/components/`
4. Manual test with edge cases from Section 5

### Refactoring
- Ensure calculations produce identical results before/after
- No new features during refactoring

---

## 10. Development Anti-Patterns

### Calculation Gotchas

- **Don't mix weekly/monthly/annual** - Convert everything to the same unit before comparing
- **Don't forget the 6G cap** - Most high earners hit this limit
- **Don't assume linear income** - Commission/bonus varies monthly

### Norwegian-Specific Gotchas

- **Feriepenger ≠ vacation** - It's a mandatory savings system (10.2%/12% of gross)
- **G changes annually** - Always use the constant, never hardcode `130160`
- **NAV weeks ≠ calendar weeks** - NAV uses 5-day weeks for calculations

### Date Handling Gotchas

- **End dates are EXCLUSIVE internally** - `mother.end` is the day AFTER the last leave day
- **Display end dates INCLUSIVELY** - Use `subDays(date, 1)` when showing to user
- **Father starts on motherEnd** - Don't add +1 day; the exclusive end IS the next day
- **Always use date-fns for comparisons** - Use `isSameDay()` or `startOfDay()` to avoid time issues
- **Calendar days have time 00:00** - But calculated dates may have other times; normalize before comparing

### Daycare Start Calculation

```typescript
// Child must be ~1 year old before starting daycare (August 1st intake)
if (dueDate >= augustFirstSameYear) {
  return new Date(year + 2, 7, 1); // Born after Aug → daycare 2 years later
}
return new Date(year + 1, 7, 1); // Born before Aug → daycare 1 year later
```

### React/Next.js Gotchas

- **Don't use `"use client"` unnecessarily** - Server Components are the default
- **Don't fetch data client-side** - This is a calculator, all logic runs in browser
- **Don't use `useEffect` for calculations** - Derive values directly from state
- **Use `useShallow` with Zustand selectors** - Prevents unnecessary re-renders
- **Wizard and Planner are separate pages** - Don't mix their concerns; state flows via Zustand store

---

## 11. Commit Style

- Keep commits focused on a single change
- Use imperative mood: "Add calculator logic" not "Added calculator logic"
- Reference issue numbers if applicable

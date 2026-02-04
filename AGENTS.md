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
docs/PROGRESS.md             # Current progress, decisions, and context for new developers
docs/IMPLEMENTATION_PLAN.md  # Original implementation plan (may be outdated)
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
| Components | Shadcn/UI | (to add) | Headless, accessible |
| Charts | Recharts | (to add) | For liquidity visualization |
| State | React Context / Local | - | Zustand if complexity grows |

**Privacy:** Strictly client-side. No database, no localStorage, no cookies.

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

- Separate logic (`src/lib/calculator.ts`) from UI (`src/components/`)
- Use English for code variables (`grossSalary`, `gapWeeks`)
- Use Norwegian for UI text (`Månedslønn`, `Uker i gapet`)
- Validate all numeric inputs are non-negative
- Use the exact constants from Section 3.1 - do not hardcode values elsewhere

### DO NOT

- Do not store any user data (localStorage, cookies, server) - strictly client-side
- Do not assume parental leave rules from other countries apply
- Do not use Pages Router - use App Router only
- Do not add backend/API routes - all calculations happen client-side
- Do not round intermediate calculations - only round final display values

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
│   ├── layout.tsx           # Root layout with Geist fonts
│   ├── page.tsx             # Main calculator page (all state lives here)
│   └── globals.css          # Tailwind CSS v4 + CSS variables
├── lib/
│   ├── calculator/
│   │   ├── index.ts         # Main exports, helper functions
│   │   ├── dates.ts         # Date calculations (periods, gap, segments)
│   │   └── economy.ts       # Economic comparison 80% vs 100%
│   ├── constants.ts         # G value, leave configuration
│   ├── types.ts             # TypeScript interfaces
│   └── utils.ts             # cn() helper for Tailwind
├── components/
│   ├── input/               # All input components
│   │   ├── DueDateInput.tsx
│   │   ├── RightsSelector.tsx
│   │   ├── CoverageToggle.tsx
│   │   ├── DistributionSliders.tsx
│   │   ├── DaycareInput.tsx
│   │   └── EconomySection.tsx
│   ├── timeline/
│   │   └── CalendarTimeline.tsx  # Calendar visualization
│   ├── results/
│   │   ├── DateSummary.tsx       # Leave period table
│   │   └── EconomyComparison.tsx # 80% vs 100% comparison
│   └── ui/                  # shadcn/ui components
docs/
├── KRAVSPEC.md              # Full requirements specification (Norwegian)
├── IMPLEMENTATION_PLAN.md   # Original implementation plan
└── PROGRESS.md              # Current progress and context for new developers
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

---

## 11. Commit Style

- Keep commits focused on a single change
- Use imperative mood: "Add calculator logic" not "Added calculator logic"
- Reference issue numbers if applicable

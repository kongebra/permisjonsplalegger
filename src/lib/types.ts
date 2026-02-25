/**
 * TypeScript interfaces for permisjonskalkulatoren
 */

export type Coverage = 100 | 80;
export type ParentRights = 'both' | 'mother-only' | 'father-only';
export type Parent = 'mother' | 'father';

// Job type affects vacation day counting
export type JobType = 'office' | 'shift';

// Period types for the advanced leave planner
export type LeavePeriodType = 'quota' | 'shared' | 'vacation' | 'unpaid';

export interface VacationInput {
  mother: {
    daysAfter: number; // Feriedager etter mors permisjon
    duringFatherLeave: boolean; // true = overlapp med far, false = skyv fars start
  };
  father: {
    daysBefore: number; // Feriedager før fars permisjon
    duringMotherLeave: boolean; // true = overlapp med mor, false = skyv mors slutt
    daysAfter: number; // Feriedager etter fars permisjon (dekker gap)
  };
}

export interface ParentEconomy {
  monthlySalary: number;
  monthlyCommissionLoss: number;
  employerCoversAbove6G: boolean;
  employerPaysFeriepenger: boolean; // "Får du feriepenger fra arbeidsgiver som om du var i jobb?"
  feriepengegrunnlag?: number; // Valgfritt: overstyrrer monthlySalary * 12 for feriepenge-beregning
}

export interface CalculatorInput {
  dueDate: Date;
  coverage: Coverage;
  rights: ParentRights;
  sharedWeeksToMother: number; // 0 til max fellesperiode
  overlapWeeks: number;
  daycareStartDate: Date;
  motherEconomy?: ParentEconomy;
  fatherEconomy?: ParentEconomy;
  vacationWeeks: VacationWeek[];
  vacation?: VacationInput; // Feriedager (ny modell)
}

export interface VacationWeek {
  parent: Parent;
  weekIndex: number; // Ukenummer fra permisjonsstart
}

// For Gantt-visualisering - hvert segment kan fargelegges separat
export type LeaveSegmentType =
  | 'preBirth' // Før termin
  | 'mandatory' // Obligatorisk periode (6 uker etter fødsel for mor)
  | 'quota' // Mødre-/fedrekvote
  | 'shared' // Fellesperiode
  | 'overlap' // Overlappende periode
  | 'vacation' // Ferie (dekker gap)
  | 'unpaid' // Ulønnet permisjon
  | 'gap' // Gap mellom permisjon og barnehage
  | 'activity-required'; // Fars 30/42 uker som krever at mor er i aktivitet

export interface LeaveSegment {
  parent: Parent;
  type: LeaveSegmentType;
  start: Date;
  end: Date;
  weeks: number;
}

export interface ParentLeaveSummary {
  start: Date;
  end: Date;
  weeks: number;
}

export interface GapInfo {
  start: Date;
  end: Date;
  weeks: number;
  days: number;
}

export interface LeaveResult {
  segments: LeaveSegment[]; // For Gantt-visualisering
  mother: ParentLeaveSummary;
  father: ParentLeaveSummary;
  overlap: { start: Date; end: Date; weeks: number } | null;
  gap: GapInfo;
  totalCalendarWeeks: number; // Overlapp forkorter total kalendertid
  vacationDaysNeeded: { mother: number; father: number };
}

export interface EconomyBreakdown {
  navPayout: number;
  commissionLoss: number;
  gapCost: number;
  gapTakenBy: Parent | null;
  feriepengeDifference: number;
}

export interface ScenarioResult {
  total: number;
  breakdown: EconomyBreakdown;
}

export interface EconomyResult {
  scenario80: ScenarioResult;
  scenario100: ScenarioResult;
  difference: number; // Positiv = 100% lønner seg, negativ = 80% lønner seg
  recommendation: string;
}

export interface CalculatorResult {
  leave: LeaveResult;
  economy?: EconomyResult; // Kun hvis økonomi-data er fylt ut
}

// --- Cumulative Liquidity Time Series ---

export interface TimeSeriesPoint {
  month: Date;
  income80: number;
  income100: number;
  cumulative80: number;
  cumulative100: number;
}

// --- Advanced Period Planner Types ---

/**
 * A single leave period (vacation, quota, shared, or unpaid leave)
 */
export interface LeavePeriod {
  id: string;
  parent: Parent;
  type: LeavePeriodType;
  startDate: Date;
  endDate: Date; // Exclusive (day after last leave day)
  vacationDaysUsed?: number; // Calculated for vacation periods based on job type
}

/**
 * Configuration for one parent's periods and job type
 */
export interface ParentPeriodConfig {
  jobType: JobType;
  periods: LeavePeriod[];
}

/**
 * Quota usage summary for display
 */
export interface QuotaUsage {
  type: 'mother' | 'father' | 'shared';
  weeksUsed: number;
  weeksAvailable: number;
  isOverbooked: boolean;
}

/**
 * Validation result for period configuration
 */
export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Norwegian holiday information
 */
export interface Holiday {
  date: Date;
  name: string;
  isEasterRelative: boolean;
}

// --- Interactive Planner Types ---

/**
 * Period types for the interactive planner
 */
export type PlannerPeriodType = 'permisjon' | 'ferie' | 'ulonnet' | 'annet';

/**
 * A custom period added by the user in the interactive planner
 */
export interface CustomPeriod {
  id: string;
  type: PlannerPeriodType;
  parent: Parent;
  startDate: Date;
  endDate: Date; // Exclusive (day after last day)
  label?: string; // For 'annet' type
  color?: string; // Custom color for 'annet' type
  isFromWizard?: boolean; // true = auto-generated from wizard result
  isLocked?: boolean; // true = mandatory period, cannot be edited/deleted
  segmentType?: string; // Original LeaveSegmentType for display purposes
  vacationDaysUsed?: number; // Antall feriedager brukt (ekskl. helligdager), kun for type='ferie'
}

/**
 * Job settings for vacation day calculation
 */
export interface JobSettings {
  jobType: JobType;
  vacationDays: number;
}

/**
 * Undo action for period operations
 */
export interface UndoAction {
  type: 'add' | 'delete' | 'update';
  period: CustomPeriod;
  previousPeriod?: CustomPeriod; // For update actions
}

/**
 * Saved plan structure for localStorage
 */
export interface SavedPlan {
  version: 1;
  savedAt: string;
  wizard: {
    currentStep?: number;
    wizardCompleted?: boolean;
    dueDate: string;
    rights: ParentRights;
    coverage: Coverage;
    sharedWeeksToMother: number;
    daycareStartDate: string | null;
    daycareEnabled: boolean;
  };
  jobSettings: {
    mother: JobSettings | null;
    father: JobSettings | null;
  };
  economy?: {
    mother: ParentEconomy;
    father: ParentEconomy;
  };
  periods: Array<{
    id: string;
    type: PlannerPeriodType;
    parent: Parent;
    startDate: string;
    endDate: string;
    label?: string;
    color?: string;
    isFromWizard?: boolean;
    isLocked?: boolean;
    segmentType?: string;
  }>;
  autoSaveEnabled: boolean;
}

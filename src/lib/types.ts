/**
 * TypeScript interfaces for permisjonskalkulatoren
 */

export type Coverage = 100 | 80;
export type ParentRights = 'both' | 'mother-only' | 'father-only';
export type Parent = 'mother' | 'father';

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
  | 'gap'; // Gap mellom permisjon og barnehage

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

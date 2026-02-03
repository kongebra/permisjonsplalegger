/**
 * Datoberegninger for foreldrepermisjon
 */

import { LEAVE_CONFIG, WORK_DAYS_PER_WEEK } from '../constants';
import type {
  Coverage,
  ParentRights,
  LeaveSegment,
  LeaveResult,
  VacationWeek,
  GapInfo,
} from '../types';

/**
 * Legger til uker til en dato
 */
export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/**
 * Trekker fra uker fra en dato
 */
export function subtractWeeks(date: Date, weeks: number): Date {
  return addWeeks(date, -weeks);
}

/**
 * Beregner antall dager mellom to datoer
 */
export function daysBetween(start: Date, end: Date): number {
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Beregner antall uker mellom to datoer (avrundet opp)
 */
export function weeksBetween(start: Date, end: Date): number {
  const days = daysBetween(start, end);
  return Math.ceil(days / 7);
}

/**
 * Beregner permisjonsstart (3 uker før termin)
 */
export function calculateLeaveStart(dueDate: Date, coverage: Coverage): Date {
  const config = LEAVE_CONFIG[coverage];
  return subtractWeeks(dueDate, config.preBirth);
}

/**
 * Beregner mors permisjonsperiode
 */
export function calculateMotherPeriod(
  leaveStart: Date,
  _dueDate: Date,
  coverage: Coverage,
  sharedWeeksToMother: number,
  rights: ParentRights
): { start: Date; end: Date; weeks: number } {
  const config = LEAVE_CONFIG[coverage];

  let totalMotherWeeks: number;

  if (rights === 'mother-only') {
    // Mor får hele perioden
    totalMotherWeeks = config.total;
  } else if (rights === 'father-only') {
    // Mor får ingen permisjon
    totalMotherWeeks = 0;
  } else {
    // Begge har rett: mødrekvote + andel av fellesperiode
    totalMotherWeeks = config.preBirth + config.mother + sharedWeeksToMother;
  }

  const end = addWeeks(leaveStart, totalMotherWeeks);

  return {
    start: leaveStart,
    end,
    weeks: totalMotherWeeks,
  };
}

/**
 * Beregner fars permisjonsperiode
 * NB: Overlapp forkorter total kalendertid
 */
export function calculateFatherPeriod(
  motherEnd: Date,
  coverage: Coverage,
  sharedWeeksToMother: number,
  overlapWeeks: number,
  rights: ParentRights
): { start: Date; end: Date; weeks: number } | null {
  if (rights === 'mother-only') {
    return null;
  }

  const config = LEAVE_CONFIG[coverage];

  let totalFatherWeeks: number;

  if (rights === 'father-only') {
    // Far får hele perioden
    totalFatherWeeks = config.total;
  } else {
    // Begge har rett: fedrekvote + resten av fellesperiode
    const sharedWeeksToFather = config.shared - sharedWeeksToMother;
    totalFatherWeeks = config.father + sharedWeeksToFather;
  }

  // Far starter på motherEnd (som er eksklusiv = dagen etter mors siste dag)
  // Ved overlapp: far starter X uker før mor slutter
  let fatherStart: Date;
  if (overlapWeeks === 0) {
    // motherEnd er allerede eksklusiv (dagen etter mors siste dag)
    // så far starter direkte på motherEnd
    fatherStart = new Date(motherEnd);
  } else {
    fatherStart = subtractWeeks(motherEnd, overlapWeeks);
  }
  const fatherEnd = addWeeks(fatherStart, totalFatherWeeks);

  return {
    start: fatherStart,
    end: fatherEnd,
    weeks: totalFatherWeeks,
  };
}

/**
 * Beregner gap mellom permisjonsslutt og barnehagestart
 */
export function calculateGap(
  lastLeaveEnd: Date,
  daycareStartDate: Date
): GapInfo {
  const days = daysBetween(lastLeaveEnd, daycareStartDate);
  const weeks = Math.ceil(days / 7);

  return {
    start: lastLeaveEnd,
    end: daycareStartDate,
    weeks: Math.max(0, weeks),
    days: Math.max(0, days),
  };
}

/**
 * Beregner feriedager som trengs for å dekke gap
 */
export function calculateVacationDaysNeeded(
  _gap: GapInfo,
  vacationWeeks: VacationWeek[]
): { mother: number; father: number } {
  const motherVacationWeeks = vacationWeeks.filter(
    (v) => v.parent === 'mother'
  ).length;
  const fatherVacationWeeks = vacationWeeks.filter(
    (v) => v.parent === 'father'
  ).length;

  return {
    mother: motherVacationWeeks * WORK_DAYS_PER_WEEK,
    father: fatherVacationWeeks * WORK_DAYS_PER_WEEK,
  };
}

/**
 * Bygger array av LeaveSegment for Gantt-visualisering
 */
export function buildLeaveSegments(
  dueDate: Date,
  coverage: Coverage,
  rights: ParentRights,
  sharedWeeksToMother: number,
  overlapWeeks: number,
  _daycareStartDate: Date,
  _vacationWeeks: VacationWeek[]
): LeaveSegment[] {
  const segments: LeaveSegment[] = [];
  const config = LEAVE_CONFIG[coverage];
  const leaveStart = calculateLeaveStart(dueDate, coverage);

  if (rights === 'father-only') {
    // Kun far har rett
    const fatherStart = leaveStart;
    const fatherEnd = addWeeks(fatherStart, config.total);

    segments.push({
      parent: 'father',
      type: 'quota',
      start: fatherStart,
      end: fatherEnd,
      weeks: config.total,
    });

    return segments;
  }

  let currentDate = leaveStart;

  // Mor: Før fødsel (3 uker)
  if (config.preBirth > 0) {
    const preBirthEnd = addWeeks(currentDate, config.preBirth);
    segments.push({
      parent: 'mother',
      type: 'preBirth',
      start: currentDate,
      end: preBirthEnd,
      weeks: config.preBirth,
    });
    currentDate = preBirthEnd;
  }

  // Mor: Obligatorisk etter fødsel (6 uker)
  const mandatoryEnd = addWeeks(currentDate, config.motherMandatoryPostBirth);
  segments.push({
    parent: 'mother',
    type: 'mandatory',
    start: currentDate,
    end: mandatoryEnd,
    weeks: config.motherMandatoryPostBirth,
  });
  currentDate = mandatoryEnd;

  // Mor: Resten av mødrekvote (mother - 6 obligatoriske uker som er del av mødrekvote)
  const remainingMotherQuota = config.mother - config.motherMandatoryPostBirth;
  if (remainingMotherQuota > 0) {
    const quotaEnd = addWeeks(currentDate, remainingMotherQuota);
    segments.push({
      parent: 'mother',
      type: 'quota',
      start: currentDate,
      end: quotaEnd,
      weeks: remainingMotherQuota,
    });
    currentDate = quotaEnd;
  }

  // Mor: Fellesperiode (sharedWeeksToMother)
  if (sharedWeeksToMother > 0 && rights === 'both') {
    const sharedEnd = addWeeks(currentDate, sharedWeeksToMother);
    segments.push({
      parent: 'mother',
      type: 'shared',
      start: currentDate,
      end: sharedEnd,
      weeks: sharedWeeksToMother,
    });
    currentDate = sharedEnd;
  }

  const motherEnd = currentDate;

  if (rights === 'mother-only') {
    return segments;
  }

  // Far: Starter før mor slutter hvis overlapp
  const fatherStart = subtractWeeks(motherEnd, overlapWeeks);
  const sharedWeeksToFather = config.shared - sharedWeeksToMother;

  // Far: Overlapp-periode
  if (overlapWeeks > 0) {
    segments.push({
      parent: 'father',
      type: 'overlap',
      start: fatherStart,
      end: motherEnd,
      weeks: overlapWeeks,
    });
  }

  // Far: Fedrekvote
  const fatherQuotaStart = motherEnd;
  const fatherQuotaEnd = addWeeks(fatherQuotaStart, config.father - overlapWeeks);
  if (config.father - overlapWeeks > 0) {
    segments.push({
      parent: 'father',
      type: 'quota',
      start: fatherQuotaStart,
      end: fatherQuotaEnd,
      weeks: config.father - overlapWeeks,
    });
  }

  // Far: Fellesperiode
  if (sharedWeeksToFather > 0) {
    const fatherSharedStart = fatherQuotaEnd;
    const fatherSharedEnd = addWeeks(fatherSharedStart, sharedWeeksToFather);
    segments.push({
      parent: 'father',
      type: 'shared',
      start: fatherSharedStart,
      end: fatherSharedEnd,
      weeks: sharedWeeksToFather,
    });
  }

  return segments;
}

/**
 * Hovedfunksjon: Beregner hele permisjonsfordelingen
 */
export function calculateLeave(
  dueDate: Date,
  coverage: Coverage,
  rights: ParentRights,
  sharedWeeksToMother: number,
  overlapWeeks: number,
  daycareStartDate: Date,
  vacationWeeks: VacationWeek[] = []
): LeaveResult {
  const leaveStart = calculateLeaveStart(dueDate, coverage);

  const motherPeriod = calculateMotherPeriod(
    leaveStart,
    dueDate,
    coverage,
    sharedWeeksToMother,
    rights
  );

  const fatherPeriod = calculateFatherPeriod(
    motherPeriod.end,
    coverage,
    sharedWeeksToMother,
    overlapWeeks,
    rights
  );

  // Finn siste slutt-dato
  const lastLeaveEnd = fatherPeriod
    ? new Date(Math.max(motherPeriod.end.getTime(), fatherPeriod.end.getTime()))
    : motherPeriod.end;

  const gap = calculateGap(lastLeaveEnd, daycareStartDate);
  const vacationDaysNeeded = calculateVacationDaysNeeded(gap, vacationWeeks);

  const segments = buildLeaveSegments(
    dueDate,
    coverage,
    rights,
    sharedWeeksToMother,
    overlapWeeks,
    daycareStartDate,
    vacationWeeks
  );

  // Total kalendertid (overlapp forkorter denne)
  const totalCalendarWeeks = weeksBetween(leaveStart, lastLeaveEnd);

  return {
    segments,
    mother: motherPeriod,
    father: fatherPeriod ?? { start: leaveStart, end: leaveStart, weeks: 0 },
    overlap:
      overlapWeeks > 0 && fatherPeriod
        ? {
            start: subtractWeeks(motherPeriod.end, overlapWeeks),
            end: motherPeriod.end,
            weeks: overlapWeeks,
          }
        : null,
    gap,
    totalCalendarWeeks,
    vacationDaysNeeded,
  };
}

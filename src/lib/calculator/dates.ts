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
  VacationInput,
  GapInfo,
} from '../types';

/**
 * Legger til dager til en dato
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Legger til uker til en dato
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
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
 * NB: Mors feriedager etter permisjon kan skyve fars start hvis ikke overlapp
 */
export function calculateFatherPeriod(
  motherEnd: Date,
  coverage: Coverage,
  sharedWeeksToMother: number,
  overlapWeeks: number,
  rights: ParentRights,
  vacation?: VacationInput
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

  // Hvis mor har ferie etter permisjon og det IKKE overlapper med fars permisjon,
  // skyv fars start med antall feriedager
  if (vacation && vacation.mother.daysAfter > 0 && !vacation.mother.duringFatherLeave) {
    fatherStart = addDays(fatherStart, vacation.mother.daysAfter);
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
  _vacationWeeks: VacationWeek[],
  vacation?: VacationInput
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

    // Far: Ferie etter permisjon
    if (vacation && vacation.father.daysAfter > 0) {
      segments.push({
        parent: 'father',
        type: 'vacation',
        start: fatherEnd,
        end: addDays(fatherEnd, vacation.father.daysAfter),
        weeks: vacation.father.daysAfter / 7,
      });
    }

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

  // Mor: Ferie etter permisjon
  if (vacation && vacation.mother.daysAfter > 0) {
    const motherVacationStart = motherEnd;
    const motherVacationEnd = addDays(motherEnd, vacation.mother.daysAfter);
    segments.push({
      parent: 'mother',
      type: 'vacation',
      start: motherVacationStart,
      end: motherVacationEnd,
      weeks: vacation.mother.daysAfter / 7,
    });
  }

  if (rights === 'mother-only') {
    return segments;
  }

  // Beregn fars faktiske start (tar hensyn til mors ferie)
  let fatherStartBase = motherEnd;
  if (vacation && vacation.mother.daysAfter > 0 && !vacation.mother.duringFatherLeave) {
    // Mors ferie skyver fars start
    fatherStartBase = addDays(motherEnd, vacation.mother.daysAfter);
  }

  // Far: Starter før mor slutter hvis overlapp
  const fatherStart = subtractWeeks(fatherStartBase, overlapWeeks);
  const sharedWeeksToFather = config.shared - sharedWeeksToMother;

  // Far: Overlapp-periode
  if (overlapWeeks > 0) {
    segments.push({
      parent: 'father',
      type: 'overlap',
      start: fatherStart,
      end: fatherStartBase,
      weeks: overlapWeeks,
    });
  }

  // Far: Fedrekvote
  const fatherQuotaStart = fatherStartBase;
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
  let fatherLastEnd = fatherQuotaEnd;
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
    fatherLastEnd = fatherSharedEnd;
  }

  // Far: Ferie etter permisjon
  if (vacation && vacation.father.daysAfter > 0) {
    segments.push({
      parent: 'father',
      type: 'vacation',
      start: fatherLastEnd,
      end: addDays(fatherLastEnd, vacation.father.daysAfter),
      weeks: vacation.father.daysAfter / 7,
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
  vacationWeeks: VacationWeek[] = [],
  vacation?: VacationInput
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
    rights,
    vacation
  );

  // Finn siste slutt-dato (inkludert feriedager)
  let lastLeaveEnd = fatherPeriod
    ? new Date(Math.max(motherPeriod.end.getTime(), fatherPeriod.end.getTime()))
    : motherPeriod.end;

  // Legg til fars feriedager etter permisjon til siste slutt-dato
  if (vacation && vacation.father.daysAfter > 0 && fatherPeriod) {
    lastLeaveEnd = addDays(fatherPeriod.end, vacation.father.daysAfter);
  }

  const gap = calculateGap(lastLeaveEnd, daycareStartDate);
  const vacationDaysNeeded = calculateVacationDaysNeeded(gap, vacationWeeks);

  const segments = buildLeaveSegments(
    dueDate,
    coverage,
    rights,
    sharedWeeksToMother,
    overlapWeeks,
    daycareStartDate,
    vacationWeeks,
    vacation
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

/**
 * Datoberegninger for foreldrepermisjon
 */

import { LEAVE_CONFIG, WORK_DAYS_PER_WEEK } from '../constants';
import { isHoliday } from '../holidays';
import type {
  Coverage,
  ParentRights,
  LeaveSegment,
  LeaveResult,
  VacationWeek,
  VacationInput,
  GapInfo,
  JobType,
  LeavePeriod,
  ParentPeriodConfig,
  QuotaUsage,
  ValidationResult,
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
  dueDate: Date,
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
    // Mor får ingen permisjon; start/slutt settes til termindato så far starter riktig
    return { start: dueDate, end: dueDate, weeks: 0 };
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
    // Far får hele perioden (40 uker ved 100%, 52 uker ved 80%)
    totalFatherWeeks = config.fatherOnly.total;
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

  // Hvis far har ferie FØR permisjon og det IKKE overlapper med mors permisjon,
  // skyv fars start med antall feriedager
  if (vacation && vacation.father.daysBefore > 0 && !vacation.father.duringMotherLeave) {
    fatherStart = addDays(fatherStart, vacation.father.daysBefore);
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

  // Mor: Fellesperiode
  // Ved "begge har rett": sharedWeeksToMother fra slider
  // Ved "kun mor": hele fellesperioden går til mor
  const motherSharedWeeks = rights === 'mother-only' ? config.shared : sharedWeeksToMother;
  if (motherSharedWeeks > 0) {
    const sharedEnd = addWeeks(currentDate, motherSharedWeeks);
    segments.push({
      parent: 'mother',
      type: 'shared',
      start: currentDate,
      end: sharedEnd,
      weeks: motherSharedWeeks,
    });
    currentDate = sharedEnd;
  }

  // Mor: Fedrekvoten (kun når mor er alene - hun får hele permisjonen)
  if (rights === 'mother-only' && config.father > 0) {
    const fatherQuotaEnd = addWeeks(currentDate, config.father);
    segments.push({
      parent: 'mother',
      type: 'quota', // Vises som vanlig kvote, men går til mor
      start: currentDate,
      end: fatherQuotaEnd,
      weeks: config.father,
    });
    currentDate = fatherQuotaEnd;
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

  // Beregn fars faktiske start (tar hensyn til mors ferie og fars ferie før)
  let fatherStartBase = motherEnd;
  if (vacation && vacation.mother.daysAfter > 0 && !vacation.mother.duringFatherLeave) {
    // Mors ferie skyver fars start
    fatherStartBase = addDays(motherEnd, vacation.mother.daysAfter);
  }
  if (vacation && vacation.father.daysBefore > 0 && !vacation.father.duringMotherLeave) {
    // Fars ferie før skyver også fars start
    fatherStartBase = addDays(fatherStartBase, vacation.father.daysBefore);
  }

  // Far: Ferie før permisjon
  if (vacation && vacation.father.daysBefore > 0) {
    let fatherVacationBeforeStart: Date;
    if (vacation.father.duringMotherLeave) {
      // Overlapp med mors permisjon: ferien starter før motherEnd
      fatherVacationBeforeStart = addDays(motherEnd, -vacation.father.daysBefore);
    } else {
      // Ikke overlapp: ferien starter etter mors eventuelle ferie
      let vacationStart = motherEnd;
      if (vacation.mother.daysAfter > 0 && !vacation.mother.duringFatherLeave) {
        vacationStart = addDays(motherEnd, vacation.mother.daysAfter);
      }
      fatherVacationBeforeStart = vacationStart;
    }
    segments.push({
      parent: 'father',
      type: 'vacation',
      start: fatherVacationBeforeStart,
      end: addDays(fatherVacationBeforeStart, vacation.father.daysBefore),
      weeks: vacation.father.daysBefore / 7,
    });
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

// --- Advanced Period Planner Functions ---

/**
 * Get day of week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
 */
function getDay(date: Date): number {
  return date.getDay();
}

/**
 * Count vacation days used in a period based on job type
 * - Office (man-fre): Weekdays 1-5 minus holidays
 * - Shift (man-lør): Weekdays 1-6, holidays count as normal work days
 */
export function countVacationDays(start: Date, end: Date, jobType: JobType): number {
  let count = 0;
  const current = new Date(start);

  while (current < end) {
    const weekday = getDay(current);

    if (jobType === 'office') {
      // Monday-Friday (1-5), minus holidays
      if (weekday >= 1 && weekday <= 5 && !isHoliday(current)) {
        count++;
      }
    } else {
      // Shift work: Monday-Saturday (1-6), holidays count as normal
      if (weekday >= 1 && weekday <= 6) {
        count++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Calculate weeks used for each quota type from periods
 */
export function calculateQuotaUsage(
  motherConfig: ParentPeriodConfig,
  fatherConfig: ParentPeriodConfig,
  coverage: Coverage,
  rights: ParentRights
): QuotaUsage[] {
  const config = LEAVE_CONFIG[coverage];
  const usages: QuotaUsage[] = [];

  // Count mother quota weeks
  let motherQuotaWeeks = 0;
  let fatherQuotaWeeks = 0;
  let sharedWeeks = 0;

  for (const period of motherConfig.periods) {
    const weeks = weeksBetween(period.startDate, period.endDate);
    if (period.type === 'quota') {
      motherQuotaWeeks += weeks;
    } else if (period.type === 'shared') {
      sharedWeeks += weeks;
    }
  }

  for (const period of fatherConfig.periods) {
    const weeks = weeksBetween(period.startDate, period.endDate);
    if (period.type === 'quota') {
      fatherQuotaWeeks += weeks;
    } else if (period.type === 'shared') {
      sharedWeeks += weeks;
    }
  }

  // Mother quota
  if (rights !== 'father-only') {
    usages.push({
      type: 'mother',
      weeksUsed: motherQuotaWeeks,
      weeksAvailable: config.mother,
      isOverbooked: motherQuotaWeeks > config.mother,
    });
  }

  // Father quota
  if (rights !== 'mother-only') {
    usages.push({
      type: 'father',
      weeksUsed: fatherQuotaWeeks,
      weeksAvailable: config.father,
      isOverbooked: fatherQuotaWeeks > config.father,
    });
  }

  // Shared period
  if (rights === 'both') {
    usages.push({
      type: 'shared',
      weeksUsed: sharedWeeks,
      weeksAvailable: config.shared,
      isOverbooked: sharedWeeks > config.shared,
    });
  }

  return usages;
}

/**
 * Validate period configurations
 */
export function validatePeriods(
  motherConfig: ParentPeriodConfig,
  fatherConfig: ParentPeriodConfig,
  coverage: Coverage,
  rights: ParentRights,
  dueDate: Date
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const quotaUsage = calculateQuotaUsage(motherConfig, fatherConfig, coverage, rights);

  // Check for quota overbooking
  for (const usage of quotaUsage) {
    if (usage.isOverbooked) {
      const typeLabel =
        usage.type === 'mother'
          ? 'Mødrekvote'
          : usage.type === 'father'
            ? 'Fedrekvote'
            : 'Fellesperiode';
      warnings.push(
        `${typeLabel} er overskredet: ${usage.weeksUsed} av ${usage.weeksAvailable} uker`
      );
    }
  }

  // Check for periods before due date (only pre-birth is allowed)
  const allPeriods = [...motherConfig.periods, ...fatherConfig.periods];
  for (const period of allPeriods) {
    // Pre-birth period for mother is allowed
    if (period.parent === 'mother' && period.type === 'quota') {
      continue; // Allow some quota before birth
    }

    const weeksBeforeDue = weeksBetween(period.startDate, dueDate);
    if (period.startDate < dueDate && weeksBeforeDue > 3) {
      warnings.push('Noen perioder starter mer enn 3 uker før termin');
      break;
    }
  }

  // Check for overlapping periods within same parent
  const checkOverlaps = (periods: LeavePeriod[]) => {
    const sorted = [...periods].sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endDate > sorted[i + 1].startDate) {
        errors.push('Noen perioder overlapper for samme forelder');
        return;
      }
    }
  };

  checkOverlaps(motherConfig.periods);
  checkOverlaps(fatherConfig.periods);

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Build LeaveSegment array from period configurations
 * Used when user has explicitly defined periods
 */
export function buildSegmentsFromPeriods(
  motherConfig: ParentPeriodConfig,
  fatherConfig: ParentPeriodConfig,
): LeaveSegment[] {
  const segments: LeaveSegment[] = [];

  const processConfig = (config: ParentPeriodConfig) => {
    for (const period of config.periods) {
      const weeks = weeksBetween(period.startDate, period.endDate);

      // Map LeavePeriodType to LeaveSegmentType
      let segmentType: LeaveSegment['type'];
      switch (period.type) {
        case 'quota':
          segmentType = 'quota';
          break;
        case 'shared':
          segmentType = 'shared';
          break;
        case 'vacation':
          segmentType = 'vacation';
          break;
        case 'unpaid':
          segmentType = 'unpaid';
          break;
        default:
          segmentType = 'quota';
      }

      segments.push({
        parent: period.parent,
        type: segmentType,
        start: period.startDate,
        end: period.endDate,
        weeks,
      });
    }
  };

  processConfig(motherConfig);
  processConfig(fatherConfig);

  // Sort by start date
  segments.sort((a, b) => a.start.getTime() - b.start.getTime());

  return segments;
}

/**
 * Calculate gap info from period configurations
 */
export function calculateGapFromPeriods(
  motherConfig: ParentPeriodConfig,
  fatherConfig: ParentPeriodConfig,
  daycareDate: Date
): GapInfo {
  const allPeriods = [...motherConfig.periods, ...fatherConfig.periods];

  if (allPeriods.length === 0) {
    return {
      start: daycareDate,
      end: daycareDate,
      weeks: 0,
      days: 0,
    };
  }

  // Find the latest end date
  const latestEnd = allPeriods.reduce(
    (max, p) => (p.endDate > max ? p.endDate : max),
    allPeriods[0].endDate
  );

  const gapDays = daysBetween(latestEnd, daycareDate);

  return {
    start: latestEnd,
    end: daycareDate,
    weeks: Math.max(0, Math.ceil(gapDays / 7)),
    days: Math.max(0, gapDays),
  };
}

/**
 * Generate a unique ID for a new period
 */
export function generatePeriodId(): string {
  return `period-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

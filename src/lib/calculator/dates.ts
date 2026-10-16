/**
 * Datoberegninger for foreldrepermisjon
 */

import { differenceInCalendarDays } from 'date-fns';
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
  // Kalenderdager, ikke millisekunder: døgnet ved overgang til vintertid er 25 timer
  return differenceInCalendarDays(end, start);
}

/**
 * Beregner antall uker mellom to datoer (avrundet opp)
 */
export function weeksBetween(start: Date, end: Date): number {
  const days = daysBetween(start, end);
  return Math.ceil(days / 7);
}

/**
 * Returnerer første dag i måneden for en gitt dato
 */
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Beregner startOfMonth for måneden som tilsvarer en tap-posisjon på tidslinjen.
 * Ratio=1 peker på siste dag i tidslinjen (totalDays - 1), ikke dagen etter.
 * @param ratio - klikk-posisjon som andel av total bredde [0, 1]
 * @param leaveStart - første dag i permisjonstidslinjen
 * @param totalDays - totalt antall dager i tidslinjen
 */
export function clickRatioToMonth(ratio: number, leaveStart: Date, totalDays: number): Date {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const targetDate = addDays(leaveStart, Math.round(clampedRatio * (totalDays - 1)));
  return startOfMonth(targetDate);
}

/**
 * Kalender-typer for tidslinjevisning
 */
export type TimelineGranularity = 'month' | 'quarter' | 'half-year';

/**
 * Bestemmer granularitet for tidslinjeruler basert på antall måneder i tidslinjen.
 * - ≤14 måneder → month (viser individuelle måneder)
 * - 15–24 måneder → quarter (viser kvartaler Q1–Q4)
 * - >24 måneder → half-year (viser halvår H1/H2)
 */
export function getTimelineGranularity(totalMonths: number): TimelineGranularity {
  if (totalMonths <= 14) return 'month';
  if (totalMonths <= 24) return 'quarter';
  return 'half-year';
}

/**
 * Et segment i tidslinjeruler-raden
 */
export interface TimelineSegment {
  start: Date;          // Segmentets startdato (for active-check i komponenten)
  leftPercent: number;  // Avstand fra venstre kant i prosent [0–100]
  widthPercent: number; // Segmentets bredde i prosent
  label: string;        // Vises i ruler-raden ("J '26", "Q2", "H1 '25")
}

// Norske månedsinitaler, indeks 0 = januar
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

// Bestemmer etiketten for et ruler-segment
function formatSegmentLabel(date: Date, granularity: TimelineGranularity): string {
  const month = date.getMonth();
  const shortYear = `'${String(date.getFullYear()).slice(2)}`;

  if (granularity === 'month') {
    return month === 0 ? `J ${shortYear}` : MONTH_INITIALS[month];
  }
  if (granularity === 'quarter') {
    const quarter = Math.floor(month / 3) + 1;
    return quarter === 1 ? `Q1 ${shortYear}` : `Q${quarter}`;
  }
  // half-year: vis alltid årstall (H1 '26, H2 '26, H1 '27, H2 '27)
  const half = month < 6 ? 1 : 2;
  return `H${half} ${shortYear}`;
}

/**
 * Bygger liste med segment-objekter for tidslinjeruler basert på granularitet.
 * Brukes av LeaveHorizonLine til å tegne måneds-/kvartal-/halvårsinndeling.
 *
 * @param leaveStart - Første dag i tidslinjen
 * @param timelineEnd - Siste dag i tidslinjen (eksklusiv)
 * @param granularity - Inndelingstype fra getTimelineGranularity
 */
export function buildTimelineSegments(
  leaveStart: Date,
  timelineEnd: Date,
  granularity: TimelineGranularity
): TimelineSegment[] {
  const totalDays = Math.max(1, daysBetween(leaveStart, timelineEnd));

  // Samle segmentgrenser: iterer måneder fra startOfMonth(leaveStart) til timelineEnd
  // Stopper FØR timelineEnd slik at siste boundary ikke blir en tom sluttgrense
  const boundaries: Date[] = [];
  const cur = startOfMonth(leaveStart);
  while (cur < timelineEnd) {
    const month = cur.getMonth();
    const shouldInclude =
      granularity === 'month' ||
      (granularity === 'quarter' && [0, 3, 6, 9].includes(month)) ||
      (granularity === 'half-year' && [0, 6].includes(month));

    if (shouldInclude) {
      boundaries.push(new Date(cur));
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  // Bygg segmenter mellom par av grenser
  return boundaries.map((segStart, i) => {
    const segEnd = boundaries[i + 1] ?? timelineEnd;
    const leftDays = Math.max(0, daysBetween(leaveStart, segStart));
    // Første segment kan starte FØR leaveStart (startOfMonth), klipp til faktisk tidslinje-start
    const effectiveStart = segStart < leaveStart ? leaveStart : segStart;
    const widthDays = daysBetween(effectiveStart, segEnd);

    return {
      start: segStart,
      leftPercent: (leftDays / totalDays) * 100,
      widthPercent: Math.min(100, (widthDays / totalDays) * 100),
      label: formatSegmentLabel(segStart, granularity),
    };
  });
}

/**
 * Beregner permisjonsstart (3 uker før termin)
 */
export function calculateLeaveStart(dueDate: Date, coverage: Coverage): Date {
  const config = LEAVE_CONFIG[coverage];
  return subtractWeeks(dueDate, config.preBirth);
}

/**
 * Totalt antall uker med foreldrepenger for hele familien.
 * Kun far/medmor har egne uker (40 ved 100%, 52 ved 80%), ellers gjelder
 * totalen for begge foreldre (49 / 61) som også er det kun mor får.
 */
export function getTotalLeaveWeeks(coverage: Coverage, rights: ParentRights): number {
  const config = LEAVE_CONFIG[coverage];
  return rights === 'father-only' ? config.fatherOnly.total : config.total;
}

/**
 * Antall uker med foreldrepenger per forelder i en gitt dekningsgrad.
 * `sharedWeeksToMother` er antall fellesuker til mor i samme dekningsgrad
 * og brukes kun når begge har rett.
 */
export function getParentLeaveWeeks(
  coverage: Coverage,
  rights: ParentRights,
  sharedWeeksToMother: number,
): { mother: number; father: number } {
  const config = LEAVE_CONFIG[coverage];

  if (rights === 'mother-only') {
    return { mother: config.total, father: 0 };
  }
  if (rights === 'father-only') {
    return { mother: 0, father: config.fatherOnly.total };
  }

  return {
    mother: config.preBirth + config.mother + sharedWeeksToMother,
    father: config.father + (config.shared - sharedWeeksToMother),
  };
}

/**
 * Beregner mors permisjonsperiode
 */
export function calculateMotherPeriod(
  leaveStart: Date,
  dueDate: Date,
  coverage: Coverage,
  sharedWeeksToMother: number,
  rights: ParentRights,
  prematureWeeks: number = 0,
): { start: Date; end: Date; weeks: number } {
  const config = LEAVE_CONFIG[coverage];

  let totalMotherWeeks: number;

  if (rights === 'mother-only') {
    // Mor får hele perioden
    totalMotherWeeks = config.total + prematureWeeks;
  } else if (rights === 'father-only') {
    // Mor får ingen permisjon; start/slutt settes til termindato så far starter riktig
    return { start: dueDate, end: dueDate, weeks: 0 };
  } else {
    // Begge har rett: mødrekvote + andel av fellesperiode
    totalMotherWeeks = config.preBirth + config.mother + sharedWeeksToMother + prematureWeeks;
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
 * Teller hverdager (man-fre ekskl. helligdager) mellom to datoer
 */
export function countWorkdaysInRange(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current < end) {
    const day = current.getDay();
    if (day >= 1 && day <= 5 && !isHoliday(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
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
  const workDays = countWorkdaysInRange(lastLeaveEnd, daycareStartDate);

  return {
    start: lastLeaveEnd,
    end: daycareStartDate,
    weeks: Math.max(0, weeks),
    days: Math.max(0, days),
    workDays: Math.max(0, workDays),
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
  vacation?: VacationInput,
  prematureWeeks: number = 0,
): LeaveSegment[] {
  const segments: LeaveSegment[] = [];
  const config = LEAVE_CONFIG[coverage];

  // leaveStart med prematur-justering
  const normalLeaveStart = calculateLeaveStart(dueDate, coverage);
  const leaveStart = prematureWeeks > 0
    ? subtractWeeks(normalLeaveStart, prematureWeeks)
    : normalLeaveStart;

  if (rights === 'father-only') {
    // Far starter på termindato (ikke leaveStart = termin - 3 uker)
    const fatherStart = dueDate;
    const noReqEnd = addWeeks(fatherStart, config.fatherOnly.noRequirement);
    const withReqEnd = addWeeks(noReqEnd, config.fatherOnly.withRequirement);

    segments.push({
      parent: 'father',
      type: 'quota',
      start: fatherStart,
      end: noReqEnd,
      weeks: config.fatherOnly.noRequirement,
    });

    segments.push({
      parent: 'father',
      type: 'activity-required',
      start: noReqEnd,
      end: withReqEnd,
      weeks: config.fatherOnly.withRequirement,
    });

    // Far: Ferie etter permisjon
    if (vacation && vacation.father.daysAfter > 0) {
      segments.push({
        parent: 'father',
        type: 'vacation',
        start: withReqEnd,
        end: addDays(withReqEnd, vacation.father.daysAfter),
        weeks: vacation.father.daysAfter / 7,
      });
    }

    return segments;
  }

  let currentDate = leaveStart;

  // Mor: Før fødsel (3 uker + premature uker)
  if (config.preBirth + prematureWeeks > 0) {
    const preBirthEnd = addWeeks(currentDate, config.preBirth + prematureWeeks);
    segments.push({
      parent: 'mother',
      type: 'preBirth',
      start: currentDate,
      end: preBirthEnd,
      weeks: config.preBirth + prematureWeeks,
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
  vacation?: VacationInput,
  prematureWeeks: number = 0,
): LeaveResult {
  // Prematur fødsel: leaveStart flyttes X uker bakover
  const leaveStart = prematureWeeks > 0
    ? subtractWeeks(calculateLeaveStart(dueDate, coverage), prematureWeeks)
    : calculateLeaveStart(dueDate, coverage);

  const motherPeriod = calculateMotherPeriod(
    leaveStart,
    dueDate,
    coverage,
    sharedWeeksToMother,
    rights,
    prematureWeeks,
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
    vacation,
    prematureWeeks,
  );

  // Total kalendertid (overlapp forkorter denne)
  // Far-only: permisjon starter på termindato, ikke 3 uker før
  const calendarStart = rights === 'father-only' ? dueDate : leaveStart;
  const totalCalendarWeeks = weeksBetween(calendarStart, lastLeaveEnd);

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

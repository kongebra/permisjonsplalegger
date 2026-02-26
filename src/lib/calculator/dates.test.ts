import { describe, it, test, expect } from 'bun:test';
import {
  addDays,
  addWeeks,
  subtractWeeks,
  daysBetween,
  weeksBetween,
  calculateLeaveStart,
  calculateMotherPeriod,
  calculateFatherPeriod,
  calculateGap,
  buildLeaveSegments,
  countVacationDays,
  calculateLeave,
  clickRatioToMonth,
  getTimelineGranularity,
  buildTimelineSegments,
} from './dates';
import { LEAVE_CONFIG } from '../constants';

// ============================================================
// Date utility functions
// ============================================================
describe('addDays', () => {
  test('adds positive days', () => {
    const date = new Date(2026, 6, 5); // 5. juli 2026
    const result = addDays(date, 10);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(6);
  });

  test('handles month boundary', () => {
    const date = new Date(2026, 6, 28); // 28. juli
    const result = addDays(date, 5);
    expect(result.getDate()).toBe(2);
    expect(result.getMonth()).toBe(7); // august
  });

  test('does not mutate original date', () => {
    const date = new Date(2026, 6, 5);
    const original = date.getTime();
    addDays(date, 10);
    expect(date.getTime()).toBe(original);
  });
});

describe('daysBetween / weeksBetween', () => {
  test('calculates days between dates', () => {
    const start = new Date(2026, 6, 1);
    const end = new Date(2026, 6, 8);
    expect(daysBetween(start, end)).toBe(7);
  });

  test('calculates weeks between dates', () => {
    const start = new Date(2026, 6, 1);
    const end = new Date(2026, 6, 15);
    expect(weeksBetween(start, end)).toBe(2);
  });

  test('rounds weeks up', () => {
    const start = new Date(2026, 6, 1);
    const end = new Date(2026, 6, 10); // 9 days = ceil(9/7) = 2 weeks
    expect(weeksBetween(start, end)).toBe(2);
  });
});

// ============================================================
// Leave period calculations
// ============================================================
describe('calculateLeaveStart', () => {
  test('starts 3 weeks before due date for 100%', () => {
    const dueDate = new Date(2026, 6, 5); // 5. juli 2026
    const start = calculateLeaveStart(dueDate, 100);
    const expected = subtractWeeks(dueDate, LEAVE_CONFIG[100].preBirth);
    expect(start.getTime()).toBe(expected.getTime());
  });

  test('starts 3 weeks before due date for 80%', () => {
    const dueDate = new Date(2026, 6, 5);
    const start = calculateLeaveStart(dueDate, 80);
    const expected = subtractWeeks(dueDate, LEAVE_CONFIG[80].preBirth);
    expect(start.getTime()).toBe(expected.getTime());
  });
});

describe('calculateMotherPeriod', () => {
  const dueDate = new Date(2026, 6, 5); // 5. juli 2026
  const leaveStart = calculateLeaveStart(dueDate, 100);

  test('both parents: mother gets preBirth + motherQuota + sharedWeeks', () => {
    const shared = 8; // Half of 16
    const result = calculateMotherPeriod(leaveStart, dueDate, 100, shared, 'both');
    const expectedWeeks = LEAVE_CONFIG[100].preBirth + LEAVE_CONFIG[100].mother + shared;
    expect(result.weeks).toBe(expectedWeeks); // 3 + 15 + 8 = 26
  });

  test('mother-only: gets all weeks', () => {
    const result = calculateMotherPeriod(leaveStart, dueDate, 100, 0, 'mother-only');
    expect(result.weeks).toBe(LEAVE_CONFIG[100].total); // 49
  });

  test('father-only: mother gets 0 weeks', () => {
    const result = calculateMotherPeriod(leaveStart, dueDate, 100, 0, 'father-only');
    expect(result.weeks).toBe(0);
  });

  test('80%: mother gets more weeks with larger shared pool', () => {
    const shared80 = 9; // Testverdi innenfor fellesperioden (shared = 20 ved 80%)
    const result = calculateMotherPeriod(leaveStart, dueDate, 80, shared80, 'both');
    const expectedWeeks = LEAVE_CONFIG[80].preBirth + LEAVE_CONFIG[80].mother + shared80;
    expect(result.weeks).toBe(expectedWeeks); // 3 + 19 + 9 = 31
  });

  test('end date = start + weeks * 7 days', () => {
    const result = calculateMotherPeriod(leaveStart, dueDate, 100, 8, 'both');
    const expectedEnd = addWeeks(leaveStart, result.weeks);
    expect(result.end.getTime()).toBe(expectedEnd.getTime());
  });

  test('father-only: mother start and end both equal dueDate', () => {
    const dueDate = new Date(2026, 6, 5);
    const leaveStart = calculateLeaveStart(dueDate, 100);
    const result = calculateMotherPeriod(leaveStart, dueDate, 100, 0, 'father-only');
    expect(result.weeks).toBe(0);
    expect(result.start.getTime()).toBe(dueDate.getTime()); // Not leaveStart!
    expect(result.end.getTime()).toBe(dueDate.getTime());
  });
});

describe('calculateFatherPeriod', () => {
  const dueDate = new Date(2026, 6, 5);
  const leaveStart = calculateLeaveStart(dueDate, 100);
  const motherResult = calculateMotherPeriod(leaveStart, dueDate, 100, 8, 'both');

  test('father starts at mother end (no overlap)', () => {
    const result = calculateFatherPeriod(motherResult.end, 100, 8, 0, 'both');
    expect(result).not.toBeNull();
    expect(result!.start.getTime()).toBe(motherResult.end.getTime());
  });

  test('father gets remaining weeks', () => {
    const shared = 8;
    const result = calculateFatherPeriod(motherResult.end, 100, shared, 0, 'both');
    const expectedWeeks = LEAVE_CONFIG[100].father + (LEAVE_CONFIG[100].shared - shared);
    expect(result!.weeks).toBe(expectedWeeks); // 15 + 8 = 23
  });

  test('overlap: father starts before mother ends', () => {
    const overlap = 2;
    const result = calculateFatherPeriod(motherResult.end, 100, 8, overlap, 'both');
    const expectedStart = subtractWeeks(motherResult.end, overlap);
    expect(result!.start.getTime()).toBe(expectedStart.getTime());
  });

  test('mother-only: father returns null', () => {
    const result = calculateFatherPeriod(motherResult.end, 100, 8, 0, 'mother-only');
    expect(result).toBeNull();
  });

  test('father-only: total weeks from fatherOnly config, not config.total', () => {
    const fatherOnlyStart = new Date(2026, 6, 5);
    const result = calculateFatherPeriod(fatherOnlyStart, 100, 0, 0, 'father-only');
    expect(result!.weeks).toBe(LEAVE_CONFIG[100].fatherOnly.total); // 40
  });

  test('father-only 100%: total = 40 uker', () => {
    const fatherOnlyStart = new Date(2026, 6, 5);
    const result = calculateFatherPeriod(fatherOnlyStart, 100, 0, 0, 'father-only');
    expect(result!.weeks).toBe(40);
  });

  test('father-only 80%: total = 52 uker', () => {
    const fatherOnlyStart = new Date(2026, 6, 5);
    const result = calculateFatherPeriod(fatherOnlyStart, 80, 0, 0, 'father-only');
    expect(result!.weeks).toBe(52);
  });
});

// ============================================================
// Gap calculations
// ============================================================
describe('calculateGap', () => {
  test('gap when leave ends before daycare', () => {
    const leaveEnd = new Date(2027, 4, 1); // 1. mai 2027
    const daycare = new Date(2027, 7, 1); // 1. august 2027
    const gap = calculateGap(leaveEnd, daycare);
    expect(gap.days).toBeGreaterThan(0);
    expect(gap.weeks).toBeGreaterThan(0);
    expect(gap.start.getTime()).toBe(leaveEnd.getTime());
    expect(gap.end.getTime()).toBe(daycare.getTime());
  });

  test('no gap when leave extends past daycare', () => {
    const leaveEnd = new Date(2027, 8, 1); // 1. sept 2027
    const daycare = new Date(2027, 7, 1); // 1. august 2027
    const gap = calculateGap(leaveEnd, daycare);
    expect(gap.days).toBe(0);
    expect(gap.weeks).toBe(0);
  });

  test('no gap when leave ends exactly at daycare', () => {
    const daycare = new Date(2027, 7, 1);
    const gap = calculateGap(daycare, daycare);
    expect(gap.days).toBe(0);
    expect(gap.weeks).toBe(0);
  });

  test('gap days are approximately 92 for may-august gap', () => {
    const leaveEnd = new Date(2027, 4, 1); // May 1
    const daycare = new Date(2027, 7, 1); // Aug 1
    const gap = calculateGap(leaveEnd, daycare);
    expect(gap.days).toBe(92); // May has 31, June 30, July 31 = 92
  });
});

// ============================================================
// Integration: standard scenario from PROGRESS.md
// ============================================================
describe('standard scenario: termin 5. juli 2026, 80%, both parents', () => {
  const dueDate = new Date(2026, 6, 5);
  const coverage = 80 as const;
  const shared = LEAVE_CONFIG[coverage].shared; // All shared to mother for this test

  test('leave start is 3 weeks before due date', () => {
    const start = calculateLeaveStart(dueDate, coverage);
    // 5. juli minus 3 uker = 14. juni
    expect(start.getDate()).toBe(14);
    expect(start.getMonth()).toBe(5); // juni
    expect(start.getFullYear()).toBe(2026);
  });

  test('mother period with all shared weeks', () => {
    const start = calculateLeaveStart(dueDate, coverage);
    const mother = calculateMotherPeriod(start, dueDate, coverage, shared, 'both');
    // preBirth(3) + mother(19) + shared(20) = 42 weeks
    const expected = LEAVE_CONFIG[coverage].preBirth + LEAVE_CONFIG[coverage].mother + shared;
    expect(mother.weeks).toBe(expected);
  });

  test('father gets remaining weeks when all shared goes to mother', () => {
    const start = calculateLeaveStart(dueDate, coverage);
    const mother = calculateMotherPeriod(start, dueDate, coverage, shared, 'both');
    const father = calculateFatherPeriod(mother.end, coverage, shared, 0, 'both');
    // father(19) + shared remaining(0) = 19 weeks
    expect(father!.weeks).toBe(LEAVE_CONFIG[coverage].father);
  });
});

// ============================================================
// buildLeaveSegments: father-only
// ============================================================
describe('buildLeaveSegments: father-only', () => {
  const dueDate = new Date(2026, 9, 15); // 15. oktober 2026
  const daycareDate = new Date(2027, 7, 1);

  test('starter på termindato, ikke 3 uker før', () => {
    const segments = buildLeaveSegments(dueDate, 100, 'father-only', 0, 0, daycareDate, []);
    const fatherSegments = segments.filter(s => s.parent === 'father');
    expect(fatherSegments[0].start.getTime()).toBe(dueDate.getTime());
  });

  test('100%: to segmenter – quota 10 uker + activity-required 30 uker', () => {
    const segments = buildLeaveSegments(dueDate, 100, 'father-only', 0, 0, daycareDate, []);
    const fatherSegments = segments.filter(s => s.parent === 'father');
    expect(fatherSegments).toHaveLength(2);
    expect(fatherSegments[0].type).toBe('quota');
    expect(fatherSegments[0].weeks).toBe(10);
    expect(fatherSegments[1].type).toBe('activity-required');
    expect(fatherSegments[1].weeks).toBe(30);
  });

  test('80%: to segmenter – quota 10 uker + activity-required 42 uker', () => {
    const segments = buildLeaveSegments(dueDate, 80, 'father-only', 0, 0, daycareDate, []);
    const fatherSegments = segments.filter(s => s.parent === 'father');
    expect(fatherSegments).toHaveLength(2);
    expect(fatherSegments[0].type).toBe('quota');
    expect(fatherSegments[0].weeks).toBe(10);
    expect(fatherSegments[1].type).toBe('activity-required');
    expect(fatherSegments[1].weeks).toBe(42);
  });

  test('segment 2 starter der segment 1 slutter', () => {
    const segments = buildLeaveSegments(dueDate, 100, 'father-only', 0, 0, daycareDate, []);
    const fatherSegments = segments.filter(s => s.parent === 'father');
    expect(fatherSegments[1].start.getTime()).toBe(fatherSegments[0].end.getTime());
  });
});

describe('countVacationDays', () => {
  test('teller man-fre uten helligdager (vanlig uke)', () => {
    // Mandag 2. juni 2025 → fredag 6. juni 2025 (eksklusiv slutt: 7. juni)
    const start = new Date(2025, 5, 2); // 2. juni (mandag)
    const end = new Date(2025, 5, 7);   // 7. juni (eksklusiv) = 5 virkedager
    expect(countVacationDays(start, end, 'office')).toBe(5);
  });

  test('trekker fra skjærtorsdag, langfredag og 2. påskedag i påsken 2027', () => {
    // 22. mars 2027 (man) → 3. apr (lør) inklusiv = eksklusiv slutt 4. apr
    // Påsken 2027: Skjærtorsdag 25/3, Langfredag 26/3, Påskedag 28/3 (søn), 2. påskedag 29/3
    // 10 man-fre - 3 helligdager på hverdager (25/3, 26/3, 29/3) → 7
    const start = new Date(2027, 2, 22); // 22. mars 2027
    const end = new Date(2027, 3, 4);    // 4. april 2027 (eksklusiv)
    expect(countVacationDays(start, end, 'office')).toBe(7);
  });

  test('skiftarbeid teller man-lør og ignorerer helligdager', () => {
    const start = new Date(2027, 2, 22);
    const end = new Date(2027, 3, 4);
    // man-lør i perioden: 22(ma),23(ti),24(on),25(to),26(fr),27(lø), 29(ma),30(ti),31(on),1(to),2(fr),3(lø) = 12
    expect(countVacationDays(start, end, 'shift')).toBe(12);
  });
});

// ============================================================
// calculateLeave: prematur fødsel
// ============================================================
describe('calculateLeave with premature birth', () => {
  test('prematureWeeks=0: no change to leave', () => {
    const dueDate = new Date(2027, 4, 1); // 1. mai 2027
    const daycare = new Date(2028, 7, 1);
    const normal = calculateLeave(dueDate, 100, 'both', 8, 0, daycare, [], undefined, 0);
    const withZero = calculateLeave(dueDate, 100, 'both', 8, 0, daycare, [], undefined, 0);
    expect(normal.mother.weeks).toBe(withZero.mother.weeks);
  });

  test('prematureWeeks=4: mother gets 4 extra weeks', () => {
    const dueDate = new Date(2027, 4, 1);
    const daycare = new Date(2028, 7, 1);
    const normal = calculateLeave(dueDate, 100, 'both', 8, 0, daycare);
    const premature = calculateLeave(dueDate, 100, 'both', 8, 0, daycare, [], undefined, 4);
    expect(premature.mother.weeks).toBe(normal.mother.weeks + 4);
  });

  test('prematureWeeks=4: leave starts 4 weeks earlier', () => {
    const dueDate = new Date(2027, 4, 1);
    const daycare = new Date(2028, 7, 1);
    const normal = calculateLeave(dueDate, 100, 'both', 8, 0, daycare);
    const premature = calculateLeave(dueDate, 100, 'both', 8, 0, daycare, [], undefined, 4);
    const expectedStart = subtractWeeks(normal.mother.start, 4);
    expect(premature.mother.start.getTime()).toBe(expectedStart.getTime());
  });
});

describe('clickRatioToMonth', () => {
  it('ratio 0 → startmåned', () => {
    const start = new Date(2026, 0, 14); // 14. jan 2026
    const result = clickRatioToMonth(0, start, 365);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // januar
    expect(result.getDate()).toBe(1);  // start av måneden
  });

  it('ratio 1 → siste måned', () => {
    const start = new Date(2026, 0, 1);
    const result = clickRatioToMonth(1, start, 365);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(11); // desember
  });

  it('ratio 0.5 → midtmåned', () => {
    const start = new Date(2026, 0, 1);
    const result = clickRatioToMonth(0.5, start, 365);
    expect(result.getMonth()).toBe(6); // juli
    expect(result.getDate()).toBe(1);
  });

  it('ratio klemmes til [0, 1]', () => {
    const start = new Date(2026, 0, 1);
    const tooLow = clickRatioToMonth(-0.5, start, 100);
    const tooHigh = clickRatioToMonth(1.5, start, 100);
    expect(tooLow.getMonth()).toBe(0);
    expect(tooHigh.getMonth()).toBe(3); // april (100 dager frem)
  });
});

// ============================================================
// getTimelineGranularity
// ============================================================
describe('getTimelineGranularity', () => {
  it('returnerer month for 1 måned', () => {
    expect(getTimelineGranularity(1)).toBe('month');
  });

  it('returnerer month for 14 måneder (grensen)', () => {
    expect(getTimelineGranularity(14)).toBe('month');
  });

  it('returnerer quarter for 15 måneder (over grensen)', () => {
    expect(getTimelineGranularity(15)).toBe('quarter');
  });

  it('returnerer quarter for 24 måneder (grensen)', () => {
    expect(getTimelineGranularity(24)).toBe('quarter');
  });

  it('returnerer half-year for 25 måneder (over grensen)', () => {
    expect(getTimelineGranularity(25)).toBe('half-year');
  });

  it('returnerer half-year for 30 måneder', () => {
    expect(getTimelineGranularity(30)).toBe('half-year');
  });
});

// ============================================================
// buildTimelineSegments
// ============================================================
describe('buildTimelineSegments', () => {
  describe('month-granularitet', () => {
    it('returnerer 3 segmenter for jan–mar 2026', () => {
      const start = new Date(2026, 0, 1); // 1. jan
      const end = new Date(2026, 3, 1);   // 1. apr (eksklusiv slutt)
      const segs = buildTimelineSegments(start, end, 'month');
      expect(segs).toHaveLength(3);
    });

    it('første segment starter på ~0%', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 3, 1);
      const segs = buildTimelineSegments(start, end, 'month');
      expect(segs[0].leftPercent).toBeCloseTo(0, 1);
    });

    it('widthPercent summerer til ~100', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 6, 1); // 6 måneder
      const segs = buildTimelineSegments(start, end, 'month');
      const total = segs.reduce((s, seg) => s + seg.widthPercent, 0);
      expect(total).toBeCloseTo(100, 0);
    });

    it('januar-etikett inneholder årstall', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 3, 1);
      const segs = buildTimelineSegments(start, end, 'month');
      expect(segs[0].label).toBe("J '26");
    });

    it('andre måned-etikett er F', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 3, 1);
      const segs = buildTimelineSegments(start, end, 'month');
      expect(segs[1].label).toBe('F');
    });

    it('start-dato settes korrekt på hvert segment', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 3, 1);
      const segs = buildTimelineSegments(start, end, 'month');
      expect(segs[0].start.getMonth()).toBe(0); // januar
      expect(segs[1].start.getMonth()).toBe(1); // februar
      expect(segs[2].start.getMonth()).toBe(2); // mars
    });
  });

  describe('quarter-granularitet', () => {
    it('returnerer 4 segmenter for ett kalenderår', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2027, 0, 1);
      const segs = buildTimelineSegments(start, end, 'quarter');
      expect(segs).toHaveLength(4);
    });

    it('Q1 viser årstall, Q2–Q4 gjør ikke det', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2027, 0, 1);
      const segs = buildTimelineSegments(start, end, 'quarter');
      expect(segs[0].label).toBe("Q1 '26");
      expect(segs[1].label).toBe('Q2');
      expect(segs[2].label).toBe('Q3');
      expect(segs[3].label).toBe('Q4');
    });
  });

  describe('half-year-granularitet', () => {
    it('returnerer korrekte halvårssegmenter', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2027, 6, 1); // H1 '26, H2 '26, H1 '27
      const segs = buildTimelineSegments(start, end, 'half-year');
      expect(segs).toHaveLength(3);
      expect(segs[0].label).toBe("H1 '26");
      expect(segs[1].label).toBe('H2');
      expect(segs[2].label).toBe("H1 '27");
    });
  });
});

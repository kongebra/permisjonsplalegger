/**
 * Økonomiberegninger for foreldrepermisjon
 */

import {
  MAX_BASIS,
  COVERAGE_RATE,
  WORK_DAYS_PER_MONTH,
  WORK_DAYS_PER_WEEK,
  FERIEPENGER_NAV_WEEKS,
  FERIEPENGER_RATE,
  SMALL_ECONOMY_DIFFERENCE,
  MIN_RECOMMENDATION_REASON_SHARE,
} from '../constants';
import type {
  Coverage,
  Parent,
  ParentEconomy,
  ParentRights,
  ScenarioResult,
  EconomyComparisonInput,
  EconomyResult,
  GapInfo,
  LeaveResult,
  TimeSeriesPoint,
} from '../types';
import { isHoliday } from '../holidays';
import { addDays, calculateLeave, countWorkdaysInRange } from './dates';
import { convertSharedWeeksToMother } from './leave-inputs';

// Brukes når en forelder uten rett i planen ikke har oppgitt økonomi
export const NO_ECONOMY: ParentEconomy = {
  monthlySalary: 0,
  monthlyCommissionLoss: 0,
  employerCoversAbove6G: false,
  employerPaysFeriepenger: false,
};

/**
 * Har brukeren oppgitt nok økonomi til at sammenligningen gir mening for rettighetene?
 * Kun mor trenger mors lønn, kun far trenger fars lønn. Når begge har rett
 * holder det at én av dem har oppgitt lønn (samme krav som oppsummeringen og
 * månedsoversikten alltid har brukt).
 */
export function hasEconomyInput(
  rights: ParentRights,
  motherEconomy: ParentEconomy | undefined,
  fatherEconomy: ParentEconomy | undefined,
): boolean {
  const motherHasSalary = (motherEconomy?.monthlySalary ?? 0) > 0;
  const fatherHasSalary = (fatherEconomy?.monthlySalary ?? 0) > 0;

  if (rights === 'mother-only') return motherHasSalary;
  if (rights === 'father-only') return fatherHasSalary;
  return motherHasSalary || fatherHasSalary;
}

/**
 * Teller arbeidsdager (man-fre, uten helligdager) mellom to datoer.
 * Brukes for å beregne reelt inntektstap i et gap. Bruker samme telling som
 * gap.workDays, slik at gap-kostnaden, banneret og oppsummeringen er enige.
 */
export function countWorkingDaysInGap(start: Date, end: Date): number {
  return countWorkdaysInRange(start, end);
}

/**
 * Månedlig NAV-utbetaling ut fra grunnlag og dekningsgrad
 */
export function monthlyNavPayout(basis: number, coverage: Coverage): number {
  return (basis * COVERAGE_RATE[coverage]) / 12;
}

/**
 * Beregner grunnlaget for NAV-utbetaling
 * Begrenset til 6G med mindre arbeidsgiver dekker over 6G
 */
export function calculateBasis(
  monthlySalary: number,
  employerCoversAbove6G: boolean
): number {
  const annualSalary = monthlySalary * 12;
  if (employerCoversAbove6G) {
    return annualSalary;
  }

  return Math.min(annualSalary, MAX_BASIS);
}

/**
 * Beregner dagsats for en forelder
 */
export function calculateDailyRate(monthlySalary: number): number {
  return monthlySalary / WORK_DAYS_PER_MONTH;
}

/**
 * Beregner NAV-utbetaling for en periode
 */
export function calculateNavPayout(
  basis: number,
  weeks: number,
  coverageRate: number
): number {
  const weeklyRate = basis / 52;
  return weeklyRate * weeks * coverageRate;
}

/**
 * Beregner provisjonstap over permisjonsperioden
 */
export function calculateCommissionLoss(
  monthlyCommissionLoss: number,
  weeks: number
): number {
  const monthsInLeave = weeks / 4.33; // Gjennomsnitt uker per måned
  return monthlyCommissionLoss * monthsInLeave;
}

/**
 * Beregner kostnad ved gap (ulønnet permisjon)
 * Bruker dagsats til den som tar gapet
 */
export function calculateGapCost(
  motherDailyRate: number,
  fatherDailyRate: number,
  gapDays: number
): { cost: number; takenBy: Parent | null } {
  if (gapDays <= 0) {
    return { cost: 0, takenBy: null };
  }

  // Anbefaling: Forelder med lavest dagsats tar gapet
  if (motherDailyRate <= fatherDailyRate) {
    return {
      cost: motherDailyRate * gapDays,
      takenBy: 'mother',
    };
  }

  return {
    cost: fatherDailyRate * gapDays,
    takenBy: 'father',
  };
}

/**
 * Beregner feriepenge-differanse mellom NAV og arbeidsgiver
 *
 * Hvis arbeidsgiver betaler: Full opptjening (10.2% av årslønn)
 * Hvis NAV betaler: Kun de første 12/15 ukene gir opptjening
 */
export function calculateFeriepengeDifference(
  monthlySalary: number,
  leaveWeeks: number,
  employerPaysFeriepenger: boolean,
  coverage: Coverage,
  feriepengegrunnlag?: number,
): number {
  const annualSalary = feriepengegrunnlag ?? (monthlySalary * 12);

  if (employerPaysFeriepenger) {
    // Arbeidsgiver betaler full feriepengeopptjening
    return 0;
  }

  // NAV dekker kun de første X ukene
  const navCoveredWeeks = FERIEPENGER_NAV_WEEKS[coverage];
  const weeksWithoutCoverage = Math.max(0, leaveWeeks - navCoveredWeeks);

  // Beregn tapt feriepengeopptjening for ukene uten dekning
  const weeklyFeriepenger = (annualSalary * FERIEPENGER_RATE) / 52;
  const lostFeriepenger = weeklyFeriepenger * weeksWithoutCoverage;

  return lostFeriepenger;
}

/**
 * Beregner gap-kostnad for ett scenario og velger hvem som tar gapet.
 *
 * Kun en forelder som har permisjon i planen (uker > 0) kan ta gapet.
 * Gapet er tiden etter at permisjonen er brukt opp, og samme regel brukes
 * i månedsoversikten og likviditetsgrafen (kun mor -> mor, kun far -> far).
 * Har ingen av dem uker, faller vi tilbake på alle med oppgitt økonomi.
 * Gap teller kun arbeidsdager (man-fre uten helligdager), ikke helgedager.
 */
export function calculateScenarioGapCost(
  motherEconomy: ParentEconomy,
  fatherEconomy: ParentEconomy | undefined,
  motherWeeks: number,
  fatherWeeks: number,
  gap: GapInfo
): { cost: number; takenBy: Parent | null } {
  const anyoneOnLeave = motherWeeks > 0 || (!!fatherEconomy && fatherWeeks > 0);
  const motherCanTake = !anyoneOnLeave || motherWeeks > 0;
  const fatherCanTake = !!fatherEconomy && (!anyoneOnLeave || fatherWeeks > 0);

  const motherDailyRate = motherCanTake
    ? calculateDailyRate(motherEconomy.monthlySalary)
    : Infinity;
  const fatherDailyRate = fatherCanTake
    ? calculateDailyRate(fatherEconomy.monthlySalary)
    : Infinity;

  return calculateGapCost(
    motherDailyRate,
    fatherDailyRate,
    countWorkingDaysInGap(gap.start, gap.end)
  );
}


/** Tidsrommet sammenligningen regnes over (eksklusiv slutt) */
export interface EconomyHorizon {
  start: Date;
  end: Date;
}

/** Netto inntekt i én kalendermåned for ett scenario */
interface MonthlyNetIncome {
  month: Date;
  income: number;
}

export interface ScenarioCalculation extends ScenarioResult {
  monthly: MonthlyNetIncome[];
}

/** Er dagen innenfor [start, end)? */
function isWithin(day: Date, start: Date, end: Date): boolean {
  return day >= start && day < end;
}

/** Arbeidsdag: mandag-fredag som ikke er helligdag (samme telling som gap.workDays) */
function isWorkday(day: Date): boolean {
  const weekday = day.getDay();
  return weekday >= 1 && weekday <= 5 && !isHoliday(day);
}

/** Feriepengeopptjening per uke for en forelder */
function weeklyFeriepenger(economy: ParentEconomy): number {
  const annual = economy.feriepengegrunnlag ?? economy.monthlySalary * 12;
  return (annual * FERIEPENGER_RATE) / 52;
}

/**
 * Beregner ett scenario dag for dag over et felles tidsrom.
 *
 * Definisjon av "mest penger": samlet inntekt for familien fra første
 * permisjonsdag til barnehagestart (eller til siste permisjonsdag hvis den er
 * senere), etter provisjonstap og tapt feriepengeopptjening. Begge scenarioer
 * regnes over samme tidsrom, slik at forskjellen er reell:
 *   - permisjonsdag: NAV-sats (grunnlag x dekningsgrad / 364 per kalenderdag,
 *     dvs. grunnlag / 52 per uke), provisjonen tapes, og feriepengeopptjening
 *     tapes etter de første 12/15 ukene som er felles for begge foreldre (med mindre arbeidsgiver betaler)
 *   - hverdag utenfor permisjon: dagsats (månedslønn / 21,7). Helligdager
 *     betales også, slik 21,7 dager per måned forutsetter, så en arbeidsuke
 *     gir like mye som en permisjonsuke med 100 % dekning
 *   - arbeidsdag i gapet for den som tar gapet: ulønnet, så både lønn,
 *     provisjon og feriepengeopptjening tapes (helligdager i gapet gir
 *     ingenting og telles ikke, som i gap.workDays)
 * Totalen er NAV + lønn utenfor permisjon - udekket gap - provisjonstap
 * - tapt feriepengeopptjening. Samme dagsverdier summeres per måned til
 * likviditetsgrafen, så grafens siste punkt er lik totalen.
 */
export function calculateScenario(
  coverage: Coverage,
  leave: LeaveResult,
  motherEconomy: ParentEconomy | undefined,
  fatherEconomy: ParentEconomy | undefined,
  horizon: EconomyHorizon,
): ScenarioCalculation {
  const { takenBy: gapTakenBy } = calculateScenarioGapCost(
    motherEconomy ?? NO_ECONOMY,
    fatherEconomy,
    motherEconomy ? leave.mother.weeks : 0,
    leave.father.weeks,
    leave.gap,
  );

  let navPayout = 0;
  let salaryIncome = 0;
  let gapCost = 0;
  let commissionLoss = 0;
  let feriepengeDifference = 0;
  const monthly: MonthlyNetIncome[] = [];

  const parents: { parent: Parent; economy: ParentEconomy }[] = [];
  if (motherEconomy) parents.push({ parent: 'mother', economy: motherEconomy });
  if (fatherEconomy) parents.push({ parent: 'father', economy: fatherEconomy });

  const rates = parents.map(({ parent, economy }) => ({
    parent,
    economy,
    leaveSegments: leave.segments.filter(
      (s) => s.parent === parent && s.type !== 'gap' && s.type !== 'vacation',
    ),
    navPerDay: calculateNavPayout(calculateBasis(economy.monthlySalary, economy.employerCoversAbove6G), 1, COVERAGE_RATE[coverage]) / 7,
    salaryPerWorkday: calculateDailyRate(economy.monthlySalary),
    commissionPerLeaveDay: calculateCommissionLoss(economy.monthlyCommissionLoss, 1) / 7,
    commissionPerWorkday: economy.monthlyCommissionLoss / WORK_DAYS_PER_MONTH,
    feriepengerPerLeaveDay: economy.employerPaysFeriepenger ? 0 : weeklyFeriepenger(economy) / 7,
    feriepengerPerWorkday: weeklyFeriepenger(economy) / WORK_DAYS_PER_WEEK,
  }));

  // De første 12/15 ukene av foreldrepengeperioden gir feriepenger samlet til
  // begge foreldre, så opptellingen er felles og følger kalenderen.
  const navCoveredDays = FERIEPENGER_NAV_WEEKS[coverage] * 7;
  let leaveDaysSoFar = 0;
  const periodSegments = leave.segments.filter((s) => s.type !== 'gap' && s.type !== 'vacation');

  let monthStart: Date | null = null;
  let monthIncome = 0;

  for (let day = new Date(horizon.start); day < horizon.end; day = addDays(day, 1)) {
    if (!monthStart || day.getMonth() !== monthStart.getMonth() || day.getFullYear() !== monthStart.getFullYear()) {
      if (monthStart) monthly.push({ month: monthStart, income: monthIncome });
      monthStart = new Date(day.getFullYear(), day.getMonth(), 1);
      monthIncome = 0;
    }

    const weekday = day.getDay() >= 1 && day.getDay() <= 5;
    const inGap = isWithin(day, leave.gap.start, leave.gap.end);

    const feriepengerCovered = leaveDaysSoFar < navCoveredDays;
    if (periodSegments.some((s) => isWithin(day, s.start, s.end))) leaveDaysSoFar++;

    for (const rate of rates) {
      if (rate.leaveSegments.some((s) => isWithin(day, s.start, s.end))) {
        const lostFeriepenger = feriepengerCovered ? 0 : rate.feriepengerPerLeaveDay;
        navPayout += rate.navPerDay;
        commissionLoss += rate.commissionPerLeaveDay;
        feriepengeDifference += lostFeriepenger;
        monthIncome += rate.navPerDay - rate.commissionPerLeaveDay - lostFeriepenger;
      } else if (inGap && rate.parent === gapTakenBy) {
        // Ulønnet i gapet: ingen lønn, provisjon eller feriepengeopptjening.
        // Gapet teller arbeidsdager uten helligdager, som gap.workDays.
        if (isWorkday(day)) {
          salaryIncome += rate.salaryPerWorkday;
          gapCost += rate.salaryPerWorkday;
          commissionLoss += rate.commissionPerWorkday;
          feriepengeDifference += rate.feriepengerPerWorkday;
          monthIncome -= rate.commissionPerWorkday + rate.feriepengerPerWorkday;
        }
      } else if (weekday) {
        // Fastlønn betales også for helligdager, og 21,7 dager per måned regner dem med
        salaryIncome += rate.salaryPerWorkday;
        monthIncome += rate.salaryPerWorkday;
      }
    }
  }
  if (monthStart) monthly.push({ month: monthStart, income: monthIncome });

  return {
    total: navPayout + salaryIncome - gapCost - commissionLoss - feriepengeDifference,
    breakdown: {
      navPayout,
      salaryIncome,
      commissionLoss,
      gapCost,
      gapTakenBy,
      feriepengeDifference,
    },
    monthly,
  };
}

/**
 * Hvilken dekningsgrad gir mest, og er forskjellen liten?
 * Brukes av kortet, anbefalingen, grafen og oppsummeringen, så de alltid er enige.
 */
export function getCoverageVerdict(difference: number): {
  winner: Coverage | null;
  amount: number;
  isSmall: boolean;
} {
  const amount = Math.round(Math.abs(difference));
  return {
    winner: amount === 0 ? null : difference > 0 ? 100 : 80,
    amount,
    isSmall: amount <= SMALL_ECONOMY_DIFFERENCE,
  };
}

/**
 * Genererer anbefaling ut fra hva som faktisk gir forskjellen.
 * Årsakene sorteres etter hvor mye de betyr for vinneren.
 */
function generateRecommendation(
  difference: number,
  scenario80: ScenarioResult,
  scenario100: ScenarioResult,
  extraWeeks80: number,
): string {
  const { winner, isSmall } = getCoverageVerdict(difference);
  if (isSmall || winner === null) {
    return 'Forskjellen er liten. Vurder hva som passer best for familiens situasjon.';
  }

  const b80 = scenario80.breakdown;
  const b100 = scenario100.breakdown;
  // Positivt tall = fordel for 100%
  const contributions: { reason100: string; reason80: string; value: number }[] = [
    { reason100: 'høyere NAV-utbetaling', reason80: 'høyere samlet NAV-utbetaling', value: b100.navPayout - b80.navPayout },
    {
      reason100: 'mer lønn fordi dere er tilbake i jobb tidligere',
      reason80: 'mer lønn fra jobb',
      value: b100.salaryIncome - b100.gapCost - (b80.salaryIncome - b80.gapCost),
    },
    { reason100: 'mindre provisjonstap', reason80: 'mindre provisjonstap', value: b80.commissionLoss - b100.commissionLoss },
    {
      reason100: 'mindre tapt feriepengeopptjening',
      reason80: 'mindre tapt feriepengeopptjening',
      value: b80.feriepengeDifference - b100.feriepengeDifference,
    },
  ];

  // Høyst to årsaker, og bare de som utgjør en merkbar del av forskjellen
  const sign = winner === 100 ? 1 : -1;
  const minimum = Math.abs(difference) * MIN_RECOMMENDATION_REASON_SHARE;
  const reasons = contributions
    .filter((c) => sign * c.value >= minimum)
    .sort((a, b) => sign * b.value - sign * a.value)
    .slice(0, 2)
    .map((c) => (winner === 100 ? c.reason100 : c.reason80));
  const reason = reasons.length > 0 ? ` Hovedårsak: ${reasons.join(' og ')}.` : '';

  if (winner === 100) {
    return `100% gir høyere utbetaling per uke og mest penger totalt, selv om 80%-permisjonen varer ${extraWeeks80} uker lenger.${reason}`;
  }
  return `80%-permisjonen varer ${extraWeeks80} uker lenger og gir mest penger totalt, selv med lavere NAV-sats.${reason}`;
}

/**
 * Bygger permisjonen for begge dekningsgrader fra samme input som kalenderen.
 * Valgt dekningsgrad bruker fellesukene slik de er lagret; den andre får dem
 * omregnet med samme regel som når brukeren bytter dekningsgrad.
 */
function buildScenarioLeaves(input: EconomyComparisonInput): {
  leave80: LeaveResult;
  leave100: LeaveResult;
  sharedWeeksToMother80: number;
  sharedWeeksToMother100: number;
} {
  const { dueDate, coverage, rights, sharedWeeksToMother, daycareStartDate, prematureWeeks = 0 } = input;
  const sharedWeeksToMother80 = convertSharedWeeksToMother(sharedWeeksToMother, coverage, 80);
  const sharedWeeksToMother100 = convertSharedWeeksToMother(sharedWeeksToMother, coverage, 100);

  return {
    leave80: calculateLeave(dueDate, 80, rights, sharedWeeksToMother80, 0, daycareStartDate, [], prematureWeeks),
    leave100: calculateLeave(dueDate, 100, rights, sharedWeeksToMother100, 0, daycareStartDate, [], prematureWeeks),
    sharedWeeksToMother80,
    sharedWeeksToMother100,
  };
}

/**
 * Felles tidsrom for begge scenarioer: fra første permisjonsdag til
 * barnehagestart, eller til siste permisjonsdag hvis permisjonen varer lenger.
 */
function getEconomyHorizon(leave80: LeaveResult, leave100: LeaveResult, daycareStartDate: Date): EconomyHorizon {
  const starts = [...leave80.segments, ...leave100.segments].map((s) => s.start.getTime());
  // gap.start er dagen etter siste permisjonsdag i hvert scenario
  const ends = [daycareStartDate.getTime(), leave80.gap.start.getTime(), leave100.gap.start.getTime()];
  const start = starts.length > 0 ? Math.min(...starts) : daycareStartDate.getTime();
  return { start: new Date(start), end: new Date(Math.max(...ends)) };
}

/**
 * Sammenligner 80% og 100% dekningsgrad over samme tidsrom.
 *
 * Hvor mange uker hver forelder har følger av rettighetene: kun mor har hele
 * permisjonen, kun far har fars egne uker (40/52), og når begge har rett deles
 * kvoter og fellesperiode. Økonomien til en forelder uten rett i planen teller
 * ikke med. Kortet, anbefalingen og likviditetsgrafen bruker alle dette
 * resultatet, så de kan ikke vise forskjellige svar.
 */
export function compareScenarios(input: EconomyComparisonInput): EconomyResult {
  const { rights, motherEconomy, fatherEconomy, daycareStartDate } = input;
  const { leave80, leave100 } = buildScenarioLeaves(input);
  const horizon = getEconomyHorizon(leave80, leave100, daycareStartDate);

  const entitledMother = rights === 'father-only' ? undefined : motherEconomy;
  const entitledFather = rights === 'mother-only' ? undefined : fatherEconomy;

  const calc80 = calculateScenario(80, leave80, entitledMother, entitledFather, horizon);
  const calc100 = calculateScenario(100, leave100, entitledMother, entitledFather, horizon);

  const difference = calc100.total - calc80.total;
  // Ukene per forelder hentes fra samme permisjon som kalenderen viser,
  // inkludert ekstra uker ved prematur fødsel
  const extraWeeks80 =
    leave80.mother.weeks + leave80.father.weeks - (leave100.mother.weeks + leave100.father.weeks);

  const { monthly: monthly80, ...scenario80 } = calc80;
  const { monthly: monthly100, ...scenario100 } = calc100;

  let cumulative80 = 0;
  let cumulative100 = 0;
  const timeSeries: TimeSeriesPoint[] = monthly80.map((point, i) => {
    const income80 = point.income;
    const income100 = monthly100[i]?.income ?? 0;
    cumulative80 += income80;
    cumulative100 += income100;
    return { month: point.month, income80, income100, cumulative80, cumulative100 };
  });

  return {
    scenario80,
    scenario100,
    difference,
    recommendation: generateRecommendation(difference, scenario80, scenario100, extraWeeks80),
    gap80: leave80.gap,
    gap100: leave100.gap,
    timeSeries,
  };
}

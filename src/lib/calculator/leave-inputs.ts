/**
 * Hjelpere som gjør om valgene i veiviseren til input for calculateLeave.
 */

import { LEAVE_CONFIG } from '../constants';
import type { Coverage } from '../types';
import { subtractWeeks, weeksBetween } from './dates';

// NAV utvider permisjonen ved fødsel før svangerskapsuke 33, dvs. mer enn 7 uker før termin
const PREMATURE_WEEKS_BEFORE_DUE_DATE = 7;

/**
 * Antall ekstra uker permisjon ved prematur fødsel, slik kalenderen regner dem:
 * hele uker fra fødselsdato til ordinær permisjonsstart (3 uker før termin).
 * Gir 0 uten fødselsdato, eller når barnet er født i uke 33 eller senere.
 */
export function getPrematureWeeks(
  dueDate: Date,
  coverage: Coverage,
  prematureBirthDate: Date | null | undefined,
): number {
  if (!prematureBirthDate) return 0;
  if (prematureBirthDate >= subtractWeeks(dueDate, PREMATURE_WEEKS_BEFORE_DUE_DATE)) return 0;
  const normalLeaveStart = subtractWeeks(dueDate, LEAVE_CONFIG[coverage].preBirth);
  return Math.max(0, Math.round(weeksBetween(prematureBirthDate, normalLeaveStart)));
}

/**
 * Gjør om fellesuker til mor fra én dekningsgrad til en annen.
 *
 * Store og kalender lagrer `sharedWeeksToMother` i valgt dekningsgrads enhet
 * (16 fellesuker ved 100 %, 20 ved 80 %). Når vi bytter dekningsgrad, eller
 * regner på den andre dekningsgraden i økonomisammenligningen, beholder vi
 * andelen og runder til hele uker. Samme regel overalt, slik at kalender,
 * oppsummering og økonomi viser de samme ukene.
 */
export function convertSharedWeeksToMother(
  sharedWeeksToMother: number,
  from: Coverage,
  to: Coverage,
): number {
  if (from === to) return sharedWeeksToMother;
  const ratio = sharedWeeksToMother / LEAVE_CONFIG[from].shared;
  const converted = Math.round(ratio * LEAVE_CONFIG[to].shared);
  return Math.min(LEAVE_CONFIG[to].shared, Math.max(0, converted));
}

/**
 * Hjelpere som gjør om valgene i veiviseren til input for calculateLeave.
 */

import { LEAVE_CONFIG } from '../constants';
import type { Coverage } from '../types';

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

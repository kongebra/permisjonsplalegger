/**
 * Konstanter for permisjonsberegninger
 * G (Grunnbeløpet) oppdateres årlig av NAV - sjekk nav.no for gjeldende verdi
 */

export const G = 130_160; // Grunnbeløpet per 1. mai 2025

export const WORK_DAYS_PER_MONTH = 21.7; // Standard for beregning av dagsats

export const LEAVE_CONFIG = {
  100: {
    total: 49,
    mother: 15, // Mødrekvote
    father: 15, // Fedrekvote
    shared: 16, // Fellesperiode
    preBirth: 3, // Uker før termin
    motherMandatoryPostBirth: 6, // Obligatoriske uker etter fødsel
  },
  80: {
    total: 61, // NAV: 61 uker og 1 dag (avrundet til hele uker)
    mother: 19,
    father: 19,
    shared: 20, // NAV: 20 uker og 1 dag (avrundet til hele uker)
    preBirth: 3,
    motherMandatoryPostBirth: 6,
  },
} as const;

// Feriepenger: NAV dekker kun de første X ukene
export const FERIEPENGER_NAV_WEEKS = {
  100: 12,
  80: 15,
} as const;

// Standard feriepenge-sats (10.2% for de fleste, 12% for over 60 år)
export const FERIEPENGER_RATE = 0.102;

// Ukedager i en arbeidsuke (NAV bruker 5-dagers uke)
export const WORK_DAYS_PER_WEEK = 5;

// Wizard steg-konfigurasjon (single source of truth)
export const WIZARD_STEPS = [
  { key: 'dueDate', label: 'Termin' },
  { key: 'rights', label: 'Rettigheter' },
  { key: 'coverage', label: 'Dekning' },
  { key: 'distribution', label: 'Fordeling' },
  { key: 'daycare', label: 'Barnehage' },
  { key: 'jobSettings', label: 'Jobb' },
  { key: 'economy', label: 'Økonomi' },
  { key: 'summary', label: 'Oppsummering' },
] as const;

export const TOTAL_WIZARD_STEPS = WIZARD_STEPS.length;

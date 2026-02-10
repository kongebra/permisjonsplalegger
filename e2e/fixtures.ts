/**
 * Shared test fixtures and helpers for e2e tests.
 *
 * Provides a seeded localStorage state so we can skip the wizard
 * and land directly on /planlegger/kalender for planner tests.
 */

/** A minimal SavedPlan that passes validation and seeds the calendar page. */
export const SEEDED_PLAN = {
  version: 1,
  savedAt: new Date().toISOString(),
  wizard: {
    currentStep: 8,
    wizardCompleted: true,
    dueDate: '2026-09-01T00:00:00.000Z',
    rights: 'both' as const,
    coverage: '100' as const,
    sharedWeeksToMother: 10,
    daycareStartDate: '2027-08-01T00:00:00.000Z',
    daycareEnabled: true,
  },
  jobSettings: {
    mother: null,
    father: null,
  },
  periods: [
    {
      id: 'pre-birth',
      type: 'permisjon',
      parent: 'mother',
      startDate: '2026-08-11T00:00:00.000Z',
      endDate: '2026-09-01T00:00:00.000Z',
      isFromWizard: true,
      isLocked: true,
      segmentType: 'preBirth',
    },
    {
      id: 'mother-mandatory',
      type: 'permisjon',
      parent: 'mother',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-12-22T00:00:00.000Z',
      isFromWizard: true,
      isLocked: true,
      segmentType: 'mandatory',
    },
    {
      id: 'mother-shared',
      type: 'permisjon',
      parent: 'mother',
      startDate: '2026-12-22T00:00:00.000Z',
      endDate: '2027-03-02T00:00:00.000Z',
      isFromWizard: true,
      segmentType: 'shared',
    },
    {
      id: 'father-quota',
      type: 'permisjon',
      parent: 'father',
      startDate: '2027-03-02T00:00:00.000Z',
      endDate: '2027-06-29T00:00:00.000Z',
      isFromWizard: true,
      segmentType: 'quota',
    },
  ],
  autoSaveEnabled: true,
};

/** Inject the seeded plan into localStorage before navigation. */
export async function seedPlan(page: import('@playwright/test').Page) {
  await page.addInitScript((plan) => {
    localStorage.setItem('permisjonsplan-v1', JSON.stringify(plan));
    // Also dismiss onboarding so it doesn't block interactions
    localStorage.setItem('calendar-onboarding-seen', 'true');
  }, SEEDED_PLAN);
}

import { test, expect, type Page } from '@playwright/test';
import { SEEDED_PLAN } from './fixtures';

/**
 * Lagret plan i localStorage kan være ødelagt eller skrevet av en annen
 * versjon av appen. Det skal aldri gi en feilside, og brukeren skal enten
 * komme rett inn i planen eller starte veiviseren på nytt.
 */

async function seedRaw(page: Page, raw: string) {
  await page.addInitScript((value) => {
    localStorage.setItem('permisjonsplan-v1', value);
    localStorage.setItem('calendar-onboarding-seen', 'true');
  }, raw);
}

const unusablePlans: Record<string, string> = {
  'ugyldig JSON': '{not json',
  'tomt objekt': '{}',
  'wizard mangler': JSON.stringify({ ...SEEDED_PLAN, wizard: undefined }),
  'termindato som ikke er en dato': JSON.stringify({
    ...SEEDED_PLAN,
    wizard: { ...SEEDED_PLAN.wizard, dueDate: 'garbage' },
  }),
  'ukjent dekningsgrad': JSON.stringify({
    ...SEEDED_PLAN,
    wizard: { ...SEEDED_PLAN.wizard, coverage: '90' },
  }),
};

const repairablePlans: Record<string, string> = {
  'periode med ugyldig dato': JSON.stringify({
    ...SEEDED_PLAN,
    periods: [{ ...SEEDED_PLAN.periods[0], startDate: 'garbage' }, ...SEEDED_PLAN.periods.slice(1)],
  }),
  'periodene er null': JSON.stringify({ ...SEEDED_PLAN, periods: null }),
  'jobbinnstillinger mangler': JSON.stringify({ ...SEEDED_PLAN, jobSettings: undefined }),
  'økonomi med null-felt': JSON.stringify({ ...SEEDED_PLAN, economy: { mother: null, father: null } }),
  'ugyldig barnehagedato': JSON.stringify({
    ...SEEDED_PLAN,
    wizard: { ...SEEDED_PLAN.wizard, daycareStartDate: 'garbage' },
  }),
};

test.describe('Ødelagt lagring: ubrukelig plan starter veiviseren på nytt', () => {
  for (const [name, raw] of Object.entries(unusablePlans)) {
    test(`Kalender (${name}) sender brukeren til veiviseren`, async ({ page }) => {
      await seedRaw(page, raw);
      await page.goto('/planlegger/kalender');

      await expect(page).toHaveURL(/\/planlegger$/);
      await expect(
        page.getByRole('button', { name: /start planleggingen/i }),
      ).toBeVisible();
      await expect(page.getByText('Velkommen tilbake')).toBeHidden();
    });

    test(`Veiviser (${name}) tilbyr ikke å fortsette på en plan som ikke kan leses`, async ({ page }) => {
      await seedRaw(page, raw);
      await page.goto('/planlegger');

      await expect(
        page.getByRole('button', { name: /start planleggingen/i }),
      ).toBeVisible();
      await expect(page.getByText('Velkommen tilbake')).toBeHidden();
    });
  }
});

test.describe('Ødelagt lagring: delvis ugyldig plan åpner kalenderen', () => {
  for (const [name, raw] of Object.entries(repairablePlans)) {
    test(`Kalender og Økonomi laster (${name})`, async ({ page }) => {
      await seedRaw(page, raw);
      await page.goto('/planlegger/kalender');

      await expect(page.getByRole('button', { name: /innstillinger/i })).toBeVisible();
      await page.getByRole('tab', { name: /økonomi/i }).click();
      await expect(page.getByText('Kvoteoversikt')).toBeVisible();
    });
  }
});

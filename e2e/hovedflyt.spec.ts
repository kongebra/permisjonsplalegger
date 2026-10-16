import { test, expect } from '@playwright/test';
import { completeWizard, RIGHTS_CASES, type Rights } from './helpers';

/** Forventet utfall med termin 15. juni 2026 og 100 % dekning. */
const EXPECTED: Record<
  Rights,
  { summary: RegExp; weeks100: string; weeks80: string; quota: string }
> = {
  'mother-only': {
    summary: /Mor 49uk[\s\S]*Far 0uk/,
    weeks100: '100% dekning (49 uker)',
    weeks80: '80% dekning (61 uker)',
    quota: 'Mors permisjon',
  },
  'father-only': {
    summary: /Mor 0uk[\s\S]*Far 40uk/,
    weeks100: '100% dekning (40 uker)',
    weeks80: '80% dekning (52 uker)',
    quota: 'Fars kvote',
  },
  both: {
    summary: /Mor 26uk[\s\S]*Far 23uk/,
    weeks100: '100% dekning (49 uker)',
    weeks80: '80% dekning (61 uker)',
    quota: 'Fellesperiode',
  },
};

test.describe('Hovedflyt: veiviser til kalender og Økonomi-fane', () => {
  for (const { rights, name } of RIGHTS_CASES) {
    test(`Fra veiviser til kalender og økonomi for ${name}`, async ({ page }) => {
      const expected = EXPECTED[rights];
      await completeWizard(page, { rights, withSalary: true });

      // Kalenderen viser gapet og fordelingen mellom foreldrene
      const calendar = page.getByRole('tabpanel', { name: 'Kalender' });
      await expect(page.getByRole('tab', { name: 'Kalender' })).toHaveAttribute('aria-selected', 'true');
      await expect(calendar.getByRole('status')).toContainText(/udekket\s+gap/);
      await expect(calendar).toContainText(expected.summary);
      await expect(calendar).toContainText('Bhg 1. aug.');
      await expect(calendar.getByRole('button', { name: 'Legg til periode' })).toBeVisible();

      // Økonomi-fanen bruker de samme valgene
      await page.getByRole('tab', { name: 'Økonomi' }).click();
      const economy = page.getByRole('tabpanel', { name: 'Økonomi' });
      await expect(economy.getByText('Kvoteoversikt')).toBeVisible();
      await expect(economy.getByText(expected.quota, { exact: true })).toBeVisible();
      await expect(economy.getByText('Månedlig inntekt')).toBeVisible();
      await expect(economy.getByText('Kumulativ inntekt')).toBeVisible();
      await expect(economy.getByText(expected.weeks100)).toBeVisible();
      await expect(economy.getByText(expected.weeks80)).toBeVisible();
    });
  }

  test('Økonomi-fanen ber om lønn når den ikke er fylt inn', async ({ page }) => {
    await completeWizard(page, { rights: 'both', withSalary: false });
    await page.getByRole('tab', { name: 'Økonomi' }).click();
    const economy = page.getByRole('tabpanel', { name: 'Økonomi' });
    await expect(economy.getByRole('heading', { name: 'Økonomisk sammenligning' })).toBeVisible();
    await expect(economy.getByRole('button', { name: 'Legg til lønn' })).toBeVisible();
  });
});

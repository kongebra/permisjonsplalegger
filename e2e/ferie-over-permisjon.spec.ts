import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { addVacation, completeWizard } from './helpers';

/**
 * Ferie som ligger i egen permisjon. Kun mor, 50 000 kr/mnd og 100 % dekning:
 * permisjonen går fra 25. mai 2026 til og med 2. mai 2027, så hele november
 * 2026 er permisjon. Ferien 2.-13. november er 12 av 30 dager.
 * Forventet november: foreldrepenger 50 000 + feriepenger 12/30 x 50 000
 * = 70 000 kr, altså 20 000 over vanlig lønn.
 */

const STORAGE_KEY = 'permisjonsplan-v1';

async function novemberRow(page: Page) {
  await page.getByRole('tab', { name: 'Økonomi' }).click();
  const economy = page.getByRole('tabpanel', { name: 'Økonomi' });
  await expect(economy.getByText('Månedlig inntekt')).toBeVisible();
  return economy.getByRole('listitem').filter({ hasText: 'nov. 26' });
}

test('Ferie i egen permisjon gir foreldrepenger og feriepenger, uansett rekkefølge', async ({ page }) => {
  await completeWizard(page, { rights: 'mother-only', withSalary: true });

  await addVacation(page, {
    year: 2026,
    month: 11,
    fromDay: 2,
    toDay: 13,
    beforeSave: async (modal) => {
      // Dialogen forklarer hva planen regner med
      await expect(modal.getByText(/Ferien ligger i permisjonen din/)).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    },
  });

  const row = await novemberRow(page);
  await expect(row).toContainText(/70\s000 kr/);
  await expect(row).toContainText(/\+20\s000/);
  await expect(row).toContainText(/Foreldrepenger 50\s000 kr, lønn og feriepenger 20\s000 kr/);
  await expect(row.getByRole('img', { name: 'Feriemåned' })).toBeVisible();

  // Lagre, legg ferien først i lista og last planen på nytt
  await page.getByRole('button', { name: 'Lagre' }).click();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key) ?? '', STORAGE_KEY))
    .toContain('"ferie"');
  await page.evaluate((key) => {
    const plan = JSON.parse(localStorage.getItem(key) ?? '{}');
    plan.periods.sort((a: { type: string }, b: { type: string }) =>
      Number(b.type === 'ferie') - Number(a.type === 'ferie'));
    localStorage.setItem(key, JSON.stringify(plan));
  }, STORAGE_KEY);
  await page.reload();

  const reloadedRow = await novemberRow(page);
  await expect(reloadedRow).toContainText(/70\s000 kr/);
  await expect(reloadedRow).toContainText(/Foreldrepenger 50\s000 kr, lønn og feriepenger 20\s000 kr/);
});

test('Ferie i de obligatoriske ukene etter fødsel gir et eget varsel', async ({ page }) => {
  await completeWizard(page, { rights: 'mother-only' });
  // Termin 15. juni 2026: de seks obligatoriske ukene går til og med 26. juli
  await addVacation(page, {
    year: 2026,
    month: 7,
    fromDay: 6,
    toDay: 10,
    beforeSave: async (modal) => {
      await expect(modal.getByText(/kan ikke kombineres med ferie/)).toBeVisible();
      await expect(modal.getByText(/Ferien ligger i permisjonen din/)).toBeHidden();
    },
  });
});

test('Ferie etter permisjonen gir ikke varsel', async ({ page }) => {
  await completeWizard(page, { rights: 'mother-only' });
  await addVacation(page, {
    year: 2027,
    month: 7,
    fromDay: 12,
    toDay: 23,
    beforeSave: async (modal) => {
      await expect(modal.getByText(/feriedager\)/)).toBeVisible();
      await expect(modal.getByText(/Ferien ligger i permisjonen din/)).toBeHidden();
      await expect(modal.getByText(/kan ikke kombineres med ferie/)).toBeHidden();
    },
  });
});

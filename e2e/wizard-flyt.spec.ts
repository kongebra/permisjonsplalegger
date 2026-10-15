import { test, expect, type Page } from '@playwright/test';

const STORAGE_KEY = 'permisjonsplan-v1';

/** Venter til autolagringen har skrevet planen til localStorage. */
async function expectPlanSaved(page: Page) {
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key) !== null, STORAGE_KEY))
    .toBe(true);
}

test.describe('Wizard: flyt for ny bruker', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => {
      // Bare ved første lasting, slik at en reload ikke sletter lagret plan
      if (!sessionStorage.getItem('e2e-cleared')) {
        localStorage.removeItem(key);
        sessionStorage.setItem('e2e-cleared', '1');
      }
    }, STORAGE_KEY);
    await page.goto('/planlegger');
    await page.getByRole('button', { name: /start planleggingen/i }).click();
  });

  test('Viser ikke "Velkommen tilbake" midt i veiviseren etter autolagring', async ({ page }) => {
    const neste = page.getByRole('button', { name: /^neste/i });

    // Steg 1 -> 2, og vent til autolagringen har skrevet planen
    await neste.click();
    await expect(page.getByRole('heading', { name: /hvem har rett/i })).toBeVisible();
    await expectPlanSaved(page);

    // Steg 2 -> 3: ruteren re-rendrer siden når veiviseren oppdaterer #steg-N
    await neste.click();
    await expect(page.getByRole('heading', { name: /velg dekningsgrad/i })).toBeVisible();
    await expect(page.getByText('Velkommen tilbake')).toBeHidden();

    // Og videre
    await neste.click();
    await expect(page.getByText('Velkommen tilbake')).toBeHidden();
    await expect(page.getByRole('navigation', { name: /steg-navigasjon/i })).toBeVisible();
  });

  test('Viser "Velkommen tilbake" etter reload med lagret plan', async ({ page }) => {
    await page.getByRole('button', { name: /^neste/i }).click();
    await expectPlanSaved(page);

    await page.reload();
    await expect(page.getByText('Velkommen tilbake')).toBeVisible();
  });
});

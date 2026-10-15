import { test, expect, type Page } from '@playwright/test';
import { seedPlan } from './fixtures';

/** Samler konsollfeil og ufanget JS-feil på siden. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe('Kalender: ingen konsollfeil', () => {
  test('Kalender og Økonomi laster uten feil med lagret plan', async ({ page }) => {
    const errors = collectErrors(page);
    await seedPlan(page);
    await page.goto('/planlegger/kalender');
    await expect(page.getByRole('button', { name: /innstillinger/i })).toBeVisible();

    await page.getByRole('tab', { name: /økonomi/i }).click();
    await expect(page.getByText('Kvoteoversikt')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Kalenderen fylles uten React-advarsel når planen ikke har perioder ennå', async ({ page }) => {
    // Slik ser det ut rett etter veiviseren: perioder beregnes første gang kalenderen vises
    const errors = collectErrors(page);
    await seedPlan(page, { periods: [] });
    await page.goto('/planlegger/kalender');
    await expect(page.getByRole('button', { name: /innstillinger/i })).toBeVisible();
    await expect(page.getByText('Mor permisjon').first()).toBeVisible();

    expect(errors).toEqual([]);
  });
});

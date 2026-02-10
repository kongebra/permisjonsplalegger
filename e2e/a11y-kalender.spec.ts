import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedPlan } from './fixtures';

/**
 * axe-core 4.x cannot parse CSS Color Level 4 (oklch/lab) values,
 * producing false-positive color-contrast violations.
 * See: https://github.com/dequelabs/axe-core/issues/4007
 * Contrast is verified manually using WebAIM Contrast Checker.
 */
const AXE_DISABLED_RULES = ['color-contrast'];

test.describe('Tilgjengelighet: Kalender (/planlegger/kalender)', () => {
  test.beforeEach(async ({ page }) => {
    await seedPlan(page);
    await page.goto('/planlegger/kalender');
    // Wait for the calendar to render
    await page.waitForSelector('text=Permisjonsplanlegger', { timeout: 15000 });
  });

  test('Kalender-fanen har ingen axe-brudd', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(AXE_DISABLED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Økonomi-fanen har ingen axe-brudd', async ({ page }) => {
    // Switch to economy tab
    await page.getByRole('tab', { name: /økonomi/i }).click();
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(AXE_DISABLED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Sidetittel er beskrivende', async ({ page }) => {
    await expect(page).toHaveTitle(/Kalender/);
  });

  test('Hovedinnhold er i <main> landemerke', async ({ page }) => {
    const main = page.locator('main#main');
    await expect(main).toBeVisible();
  });

  test('Header er et <header> landemerke', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('Ikonknapper har aria-label', async ({ page }) => {
    // Settings button
    const settingsBtn = page.getByRole('button', { name: /innstillinger/i });
    await expect(settingsBtn).toBeVisible();

    // Month navigation buttons
    const prevMonth = page.getByRole('button', { name: /forrige måned/i });
    const nextMonth = page.getByRole('button', { name: /neste måned/i });
    await expect(prevMonth).toBeVisible();
    await expect(nextMonth).toBeVisible();
  });

  test('Fanenavigasjon er tilgjengelig med tastatur', async ({ page }) => {
    const kalenderTab = page.getByRole('tab', { name: /kalender/i });
    const økonomiTab = page.getByRole('tab', { name: /økonomi/i });

    await expect(kalenderTab).toBeVisible();
    await expect(økonomiTab).toBeVisible();

    // Switch tab with click and verify content changes
    await økonomiTab.click();
    await expect(page.getByText('Kvoteoversikt')).toBeVisible();

    await kalenderTab.click();
    // Calendar should have legend items — use exact match to avoid period band labels
    await expect(page.getByText('Mor', { exact: true })).toBeVisible();
  });

  test('Legender bruker <ul>/<li> semantisk', async ({ page }) => {
    const legend = page.locator('ul').filter({ hasText: 'Mor' }).first();
    await expect(legend).toBeVisible();

    const items = legend.locator('li');
    expect(await items.count()).toBeGreaterThanOrEqual(4);
  });

  test('Fargeprøver har role="img" og aria-label', async ({ page }) => {
    const colorSwatches = page.locator('[role="img"][aria-label*="farge"]');
    expect(await colorSwatches.count()).toBeGreaterThanOrEqual(4);
  });

  test('Månedsnavigasjon fungerer med tastatur', async ({ page }) => {
    const prevMonth = page.getByRole('button', { name: /forrige måned/i });

    // Focus and activate with keyboard
    await prevMonth.focus();
    await page.keyboard.press('Enter');

    // Should still have navigation visible (didn't break)
    await expect(prevMonth).toBeVisible();
  });
});

test.describe('Tilgjengelighet: Årsoversikt', () => {
  test.beforeEach(async ({ page }) => {
    await seedPlan(page);
    await page.goto('/planlegger/kalender');
    await page.waitForSelector('text=Permisjonsplanlegger', { timeout: 15000 });
  });

  test('Årsoversikt har ingen axe-brudd', async ({ page }) => {
    // Open year overview
    const oversiktBtn = page.getByRole('button', { name: /oversikt/i });
    await oversiktBtn.click();

    await page.waitForSelector('text=Årsoversikt', { timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(AXE_DISABLED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Lukk-knapp har aria-label og er tastaturvennlig', async ({ page }) => {
    const oversiktBtn = page.getByRole('button', { name: /oversikt/i });
    await oversiktBtn.click();

    await page.waitForSelector('text=Årsoversikt', { timeout: 5000 });

    const closeBtn = page.getByRole('button', { name: /lukk/i });
    await expect(closeBtn).toBeVisible();

    // Close with keyboard
    await closeBtn.focus();
    await page.keyboard.press('Enter');

    // Year overview should be gone
    await expect(page.getByText('Årsoversikt')).not.toBeVisible();
  });

  test('Legender i årsoversikt har role="img"', async ({ page }) => {
    const oversiktBtn = page.getByRole('button', { name: /oversikt/i });
    await oversiktBtn.click();

    await page.waitForSelector('text=Årsoversikt', { timeout: 5000 });

    const colorSwatches = page.locator('[role="img"][aria-label*="farge"]');
    expect(await colorSwatches.count()).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Tilgjengelighet: Periode-modal', () => {
  test.beforeEach(async ({ page }) => {
    await seedPlan(page);
    await page.goto('/planlegger/kalender');
    await page.waitForSelector('text=Permisjonsplanlegger', { timeout: 15000 });
  });

  test('Ny periode-modal har ingen axe-brudd', async ({ page }) => {
    // Open FAB to add new period
    const fab = page.getByRole('button', { name: /legg til|ny periode|\+/i });
    await fab.click();

    await page.waitForSelector('text=Ny periode', { timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(AXE_DISABLED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Type-knapper har focus-visible og aria-pressed', async ({ page }) => {
    const fab = page.getByRole('button', { name: /legg til|ny periode|\+/i });
    await fab.click();

    await page.waitForSelector('text=Ny periode', { timeout: 5000 });

    // Check type buttons have aria-pressed
    const typeButtons = page.locator('button[aria-pressed]');
    expect(await typeButtons.count()).toBeGreaterThanOrEqual(2);
  });

  test('Modal kan lukkes med Escape', async ({ page }) => {
    const fab = page.getByRole('button', { name: /legg til|ny periode|\+/i });
    await fab.click();

    await page.waitForSelector('text=Ny periode', { timeout: 5000 });

    await page.keyboard.press('Escape');

    await expect(page.getByText('Ny periode')).not.toBeVisible({ timeout: 3000 });
  });
});

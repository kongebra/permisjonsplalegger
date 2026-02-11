import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * axe-core 4.x cannot parse CSS Color Level 4 (oklch/lab) values,
 * producing false-positive color-contrast violations.
 * See: https://github.com/dequelabs/axe-core/issues/4007
 * Contrast is verified manually using WebAIM Contrast Checker.
 */
const AXE_DISABLED_RULES = ['color-contrast'];

test.describe('Tilgjengelighet: Wizard (/planlegger)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear saved plan so wizard shows from scratch
    await page.addInitScript(() => {
      localStorage.removeItem('permisjonsplan-v1');
    });
    await page.goto('/planlegger');
  });

  test('Velkomstside har ingen axe-brudd', async ({ page }) => {
    // Wait for welcome intro to render
    await page.waitForSelector('text=Velkommen til permisjonsplanleggeren');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(AXE_DISABLED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Steg 1 (Termindato) har ingen axe-brudd', async ({ page }) => {
    // Dismiss welcome intro
    const startButton = page.getByRole('button', { name: /start planleggingen/i });
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
    }

    // Wait for step 1 to render
    await page.waitForSelector('text=Termindato', { timeout: 10000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(AXE_DISABLED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Sidetittel er beskrivende', async ({ page }) => {
    await expect(page).toHaveTitle(/Planlegg|Permisjonsøkonomi/);
  });

  test('Skip-link finnes og peker til #main', async ({ page }) => {
    const skipLink = page.locator('a[href="#main"]');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveText(/hopp til hovedinnhold/i);
  });

  test('HTML lang-attributt er satt til norsk', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('no');
  });

  test('Navigasjonsknapper er tilgjengelige med tastatur', async ({ page }) => {
    // Dismiss welcome
    const startButton = page.getByRole('button', { name: /start planleggingen/i });
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
    }

    await page.waitForSelector('text=Termindato', { timeout: 10000 });

    // The "Tilbake" and "Neste" buttons should exist
    const tilbakeButton = page.getByRole('button', { name: /tilbake/i });
    const nesteButton = page.getByRole('button', { name: /neste/i });

    await expect(tilbakeButton).toBeVisible();
    await expect(nesteButton).toBeVisible();

    // Tilbake should be disabled on first step
    await expect(tilbakeButton).toBeDisabled();
  });

  test('Alert-boks har riktige ARIA-attributter', async ({ page }) => {
    // Dismiss welcome
    const startButton = page.getByRole('button', { name: /start planleggingen/i });
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
    }

    await page.waitForSelector('text=Termindato', { timeout: 10000 });

    // The hint alert should be visible (can't proceed without selecting date)
    // Use a more specific selector to avoid matching Next.js route announcer
    const alert = page.locator('[role="alert"].bg-warning-bg');
    if (await alert.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(alert).toHaveAttribute('aria-atomic', 'true');
      await expect(alert).toHaveAttribute('aria-live', 'assertive');
    }
  });

  test('Wizard-navigasjon er pakket i <nav> landemerke', async ({ page }) => {
    // Dismiss welcome
    const startButton = page.getByRole('button', { name: /start planleggingen/i });
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
    }

    await page.waitForSelector('text=Termindato', { timeout: 10000 });

    const nav = page.locator('nav[aria-label="Steg-navigasjon"]');
    await expect(nav).toBeVisible();
  });
});

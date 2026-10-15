import { test, expect, type Page } from '@playwright/test';
import { seedPlan } from './fixtures';

/**
 * Datovelgerne skal åpne på måneden til den valgte datoen, ikke på dagens
 * måned. Rutenettet i react-day-picker har måned og år som tilgjengelig navn.
 */

async function openSettingsSection(page: Page, label: RegExp) {
  await page.goto('/planlegger/kalender');
  await page.getByRole('button', { name: /innstillinger/i }).click();
  await page.getByRole('button', { name: label }).click();
}

test.describe('Innstillinger: datovelgere åpner på valgt måned', () => {
  test('Termindato åpner på måneden til termindatoen', async ({ page }) => {
    await seedPlan(page, { wizard: { dueDate: '2027-03-01T00:00:00.000Z' } });
    await openSettingsSection(page, /termindato/i);

    await expect(page.getByRole('grid', { name: 'mars 2027' })).toBeVisible();
  });

  test('Termindato følger valget når brukeren velger en ny dato', async ({ page }) => {
    await seedPlan(page, { wizard: { dueDate: '2027-03-01T00:00:00.000Z' } });
    await openSettingsSection(page, /termindato/i);
    await expect(page.getByRole('grid', { name: 'mars 2027' })).toBeVisible();

    // Ny dato i samme måned: visningen blir stående
    await page.getByRole('button', { name: /10\. mars 2027/ }).click();
    await expect(page.getByRole('button', { name: /termindato/i })).toContainText('10. mars 2027');
    await expect(page.getByRole('grid', { name: 'mars 2027' })).toBeVisible();

    // Ny dato i neste måned: visningen og raden følger valget
    await page.getByRole('button', { name: /neste måned|next month/i }).click();
    await expect(page.getByRole('grid', { name: 'april 2027' })).toBeVisible();
    await page.getByRole('button', { name: /14\. april 2027/ }).click();
    await expect(page.getByRole('button', { name: /termindato/i })).toContainText('14. apr');
    await expect(page.getByRole('grid', { name: 'april 2027' })).toBeVisible();
  });

  test('Termindato fra i fjor kan vises (intervallet utvides)', async ({ page }) => {
    await seedPlan(page, {
      wizard: { dueDate: '2025-11-15T00:00:00.000Z', daycareStartDate: null, daycareEnabled: false },
    });
    await openSettingsSection(page, /termindato/i);

    await expect(page.getByRole('grid', { name: 'november 2025' })).toBeVisible();
  });

  test('Barnehagestart åpner på måneden til valgt dato', async ({ page }) => {
    await seedPlan(page, {
      wizard: { dueDate: '2027-03-01T00:00:00.000Z', daycareStartDate: '2028-08-15T00:00:00.000Z' },
    });
    await openSettingsSection(page, /barnehagestart/i);

    await expect(page.getByRole('grid', { name: 'august 2028' })).toBeVisible();
  });
});

test.describe('Wizard: datovelgere åpner på valgt måned', () => {
  test('Termindato-steget åpner på måneden til lagret termindato', async ({ page }) => {
    await seedPlan(page, {
      wizard: {
        currentStep: 1,
        wizardCompleted: false,
        dueDate: '2027-03-01T00:00:00.000Z',
      },
    });
    await page.goto('/planlegger');
    await page.getByRole('button', { name: /fortsett planen/i }).click();

    await expect(page.getByRole('heading', { name: /når er termin/i })).toBeVisible();
    await expect(page.getByRole('grid', { name: 'mars 2027' })).toBeVisible();

    // Prematur fødselsdato starter 8 uker før termin (4. januar 2027)
    await page.getByRole('switch', { name: /født prematurt/i }).click();
    await expect(page.getByRole('grid', { name: 'januar 2027' })).toBeVisible();
  });
});

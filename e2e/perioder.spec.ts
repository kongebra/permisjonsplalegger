import { test, expect } from '@playwright/test';
import { addVacation, completeWizard, RIGHTS_CASES } from './helpers';

/**
 * Opprett, endre og slett en periode. Ferien legges i juli 2027, rett før
 * barnehagestart 1. august, som ligger i gapet for alle rettigheter.
 * 12.-23. juli 2027 er ti arbeidsdager (man-fre).
 */
test.describe('Perioder: opprett, endre og slett', () => {
  for (const { rights, name } of RIGHTS_CASES) {
    test(`Ferie dekker gapet, kan endres og slettes (${name})`, async ({ page }) => {
      await completeWizard(page, { rights });
      const calendar = page.getByRole('tabpanel', { name: 'Kalender' });
      const status = calendar.getByRole('status');
      await expect(status).toContainText(/udekket\s+gap/);
      await expect(status).not.toContainText('dekket)');

      // Opprett
      await addVacation(page, { year: 2027, month: 7, fromDay: 12, toDay: 23 });
      await expect(status).toContainText('(10 dager dekket)');

      // Gå til juli 2027 og åpne dagen i ferien
      await calendar.getByRole('button', { name: /^Bhg / }).click();
      await calendar.getByRole('button', { name: 'Forrige måned' }).click();
      await expect(calendar.getByRole('heading', { name: 'juli 2027' })).toBeVisible();
      await calendar.getByRole('gridcell', { name: /^onsdag 14\. juli 2027/ }).click();
      const detail = page.getByRole('region', { name: /Detaljer for onsdag 14\. juli 2027/i });
      await expect(detail.getByText('Ferie', { exact: true })).toBeVisible();
      await expect(detail.getByText('12. juli – 23. juli 2027')).toBeVisible();

      // Endre til "Annet" med egen beskrivelse
      await detail.getByRole('button', { name: 'Rediger periode' }).click();
      const modal = page.getByRole('dialog', { name: 'Rediger periode' });
      await modal.getByRole('radio', { name: 'Annet' }).click();
      await modal.getByLabel('Beskrivelse').fill('Bestemor passer');
      await modal.getByRole('button', { name: 'Oppdater' }).click();
      await expect(modal).toBeHidden();
      // Dagpanelet lukkes ved lagring, og kalenderen viser den nye beskrivelsen
      const day = calendar.getByRole('gridcell', { name: /^onsdag 14\. juli 2027/ });
      await expect(day).toHaveAccessibleName(/Bestemor passer/);
      await day.click();
      await expect(detail.getByText('Bestemor passer')).toBeVisible();

      // Slett
      await detail.getByRole('button', { name: 'Rediger periode' }).click();
      await modal.getByRole('button', { name: 'Slett' }).click();
      await expect(modal).toBeHidden();
      await expect(day).not.toHaveAccessibleName(/Bestemor passer/);
      await day.click();
      await expect(detail.getByText('Ingen perioder denne dagen.')).toBeVisible();
      await expect(status).not.toContainText('dekket)');
    });
  }

  test('Avbryt lukker dialogen uten å legge til periode', async ({ page }) => {
    await completeWizard(page, { rights: 'both' });
    await page.getByRole('button', { name: 'Legg til periode' }).click();
    const modal = page.getByRole('dialog', { name: 'Ny periode' });
    await modal.getByRole('button', { name: 'Avbryt' }).click();
    await expect(modal).toBeHidden();
    await expect(page.getByRole('tabpanel', { name: 'Kalender' }).getByRole('status')).not.toContainText('dekket)');
  });
});

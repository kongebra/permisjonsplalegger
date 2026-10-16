import { test, expect } from '@playwright/test';
import { startFresh, pickDueDate, clickNext, RIGHTS_CASES, RIGHTS_LABEL } from './helpers';

/**
 * To gamle bugs: barnehagestart-velgeren åpnet på dagens dato i stedet for
 * estimert dato, og termindato var tungvint å hoppe flere måneder i.
 * Steg 2 (rettigheter) kommer mellom de to velgerne, så begge testes
 * med hver rettighet valgt.
 */
test.describe('Veiviser: datovelgere', () => {
  for (const { rights, name } of RIGHTS_CASES) {
    test(`Termindato kan hoppe flere måneder og år på én gang (${name})`, async ({ page }) => {
      await startFresh(page);

      // Fast "i dag" er juni 2026. Hopp 21 måneder frem med to valg
      await pickDueDate(page, 2028, 3, 20);
      await expect(page.getByText('20. mars 2028')).toBeVisible();
      await expect(page.getByRole('status')).toHaveText('mars 2028');

      // Og tilbake igjen
      await pickDueDate(page, 2026, 9, 2);
      await expect(page.getByText('2. september 2026')).toBeVisible();

      // Datoen overlever videre til neste steg
      await clickNext(page);
      await page.getByRole('radio', { name: RIGHTS_LABEL[rights] }).click();
      await expect(page.getByRole('radio', { name: RIGHTS_LABEL[rights] })).toBeChecked();
    });

    test(`Barnehagestart-velgeren åpner på estimert dato (${name})`, async ({ page }) => {
      await startFresh(page);

      // Termin i oktober gir tidligst barnehagestart 1. oktober året etter
      await pickDueDate(page, 2026, 10, 15);
      await clickNext(page);
      await page.getByRole('radio', { name: RIGHTS_LABEL[rights] }).click();
      await clickNext(page);
      await clickNext(page);
      await clickNext(page);
      await expect(page.getByRole('heading', { name: 'Barnehagestart' })).toBeVisible();

      await expect(page.getByRole('combobox', { name: 'Velg måned' })).toHaveValue('9');
      await expect(page.getByRole('combobox', { name: 'Velg år' })).toHaveValue('2027');
      await expect(page.getByRole('button', { name: /1\. oktober 2027, valgt/ })).toBeVisible();
      await expect(
        page.getByText('Barnehage starter').locator('xpath=following-sibling::p'),
      ).toHaveText('1. okt. 2027');
    });
  }

  test('Barnehagestart for desember-termin følger neste august-opptak', async ({ page }) => {
    await startFresh(page);
    await pickDueDate(page, 2026, 12, 10);
    for (let i = 0; i < 4; i++) await clickNext(page);
    await expect(page.getByRole('heading', { name: 'Barnehagestart' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Velg måned' })).toHaveValue('7');
    await expect(page.getByRole('combobox', { name: 'Velg år' })).toHaveValue('2028');
  });
});

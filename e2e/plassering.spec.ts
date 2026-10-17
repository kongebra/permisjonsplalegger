import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { completeWizard } from './helpers';
import { seedPlan } from './fixtures';

/**
 * Plasseringsvalgene i «Ny periode» følger valgt forelder og rettighet.
 *
 * Hånd-regnet utgangspunkt fra veiviseren: termin 15. juni 2026, 100 %,
 * 8 fellesuker til mor, barnehage 1. august 2027, og ferie på 14 dager.
 * Begge har rett: mor 25. mai 2026 til og med 22. nov. 2026, far 23. nov. 2026
 * til og med 2. mai 2027. Kun mor: til og med 2. mai 2027.
 * Kun far: 15. juni 2026 til og med 21. mars 2027.
 */

async function openNewPeriod(page: Page) {
  await page.getByRole('button', { name: 'Legg til periode' }).click();
  const modal = page.getByRole('dialog', { name: 'Ny periode' });
  await expect(modal).toBeVisible();
  return modal;
}

/** Valgene i plasseringsgruppen, med navn og beskrivelse */
async function expectChoices(
  group: Locator,
  choices: { name: string; description: string | null }[],
) {
  const radios = group.getByRole('radio');
  await expect(radios).toHaveCount(choices.length);
  for (const [index, choice] of choices.entries()) {
    const radio = radios.nth(index);
    await expect(radio).toHaveAccessibleName(choice.name);
    if (choice.description) {
      await expect(radio).toHaveAccessibleDescription(choice.description);
    } else {
      await expect(radio).toHaveAccessibleDescription('');
    }
  }
}

/** Datoene på valgt plassering, som vanlig tekst under valgene */
function range(modal: Locator, text: string) {
  return modal.getByText(text, { exact: true });
}

async function expectNoAxeViolations(page: Page) {
  // Dialogen toner inn, og kontrasten måles feil midt i animasjonen
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished)),
  );
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe('Plassering: begge har rett', () => {
  test.beforeEach(async ({ page }) => {
    await completeWizard(page, { rights: 'both' });
  });

  test('Mor: valg, tekster og datoer', async ({ page }) => {
    const modal = await openNewPeriod(page);
    const group = modal.getByRole('radiogroup', { name: 'Når skal mor ta ferie?' });

    await expectChoices(group, [
      { name: 'Før mors permisjon', description: 'Slutter 24. mai 2026, dagen før mors permisjon starter.' },
      { name: 'I mors permisjon', description: 'Fra uke 7 etter fødselen. Mor får foreldrepenger og feriepenger samtidig.' },
      { name: 'Etter mors permisjon', description: 'Fra 23. nov. 2026. Far er hjemme.' },
      { name: 'Før barnehagestart', description: 'Fra 3. mai 2027, når fars permisjon er over.' },
      { name: 'Velg datoer selv', description: null },
    ]);

    // Etter mors permisjon er forhåndsvalgt, og datoene står på valget, ikke i Fra og Til
    await expect(group.getByRole('radio', { name: 'Etter mors permisjon' })).toBeChecked();
    await expect(range(modal, '23. nov. 2026 til 6. des. 2026')).toBeVisible();
    await expect(modal.getByRole('button', { name: /^Fra / })).toBeHidden();
    await expect(modal.getByRole('button', { name: /^Til / })).toBeHidden();

    await group.getByRole('radio', { name: 'Før mors permisjon' }).click();
    await expect(range(modal, '11. mai 2026 til 24. mai 2026')).toBeVisible();
    await group.getByRole('radio', { name: 'I mors permisjon' }).click();
    await expect(range(modal, '27. juli 2026 til 9. aug. 2026')).toBeVisible();
    await group.getByRole('radio', { name: 'Før barnehagestart' }).click();
    await expect(range(modal, '3. mai 2027 til 16. mai 2027')).toBeVisible();

    // Velg datoer selv viser Fra og Til med navn som inneholder datoen
    await group.getByRole('radio', { name: 'Velg datoer selv' }).click();
    await expect(modal.getByRole('button', { name: 'Fra 3. mai 2027' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Til 16. mai 2027' })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('Mor: piltaster flytter valget og datoene følger med', async ({ page }) => {
    const modal = await openNewPeriod(page);
    const group = modal.getByRole('radiogroup', { name: 'Når skal mor ta ferie?' });

    await group.getByRole('radio', { name: 'Etter mors permisjon' }).focus();
    await page.keyboard.press('ArrowUp');
    await expect(group.getByRole('radio', { name: 'I mors permisjon' })).toBeChecked();
    await expect(range(modal, '27. juli 2026 til 9. aug. 2026')).toBeVisible();
    await page.keyboard.press('ArrowUp');
    await expect(group.getByRole('radio', { name: 'Før mors permisjon' })).toBeChecked();
    await expect(range(modal, '11. mai 2026 til 24. mai 2026')).toBeVisible();
  });

  test('Far: egne valg uten mors permisjon, og ingen like valg', async ({ page }) => {
    const modal = await openNewPeriod(page);
    await modal.getByRole('radio', { name: 'Far', exact: true }).click();
    const group = modal.getByRole('radiogroup', { name: 'Når skal far ta ferie?' });

    await expectChoices(group, [
      { name: 'Før fars permisjon', description: 'Slutter 22. nov. 2026. Mor er hjemme da.' },
      { name: 'I fars permisjon', description: 'Fra 23. nov. 2026. Far får foreldrepenger og feriepenger samtidig.' },
      { name: 'Etter fars permisjon', description: 'Fra 3. mai 2027, etter at permisjonen er over.' },
      { name: 'Velg datoer selv', description: null },
    ]);
    await expect(modal.getByRole('radio', { name: /Etter mors permisjon|Overlapp/ })).toHaveCount(0);

    // Alle valgene gir ulike datoer
    await expect(group.getByRole('radio', { name: 'Etter fars permisjon' })).toBeChecked();
    await expect(range(modal, '3. mai 2027 til 16. mai 2027')).toBeVisible();
    await group.getByRole('radio', { name: 'I fars permisjon' }).click();
    await expect(range(modal, '23. nov. 2026 til 6. des. 2026')).toBeVisible();
    await group.getByRole('radio', { name: 'Før fars permisjon' }).click();
    await expect(range(modal, '9. nov. 2026 til 22. nov. 2026')).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('Bytte av forelder velger standard, regner datoene på nytt og annonserer det', async ({ page }) => {
    const modal = await openNewPeriod(page);
    const live = modal.locator('[aria-live]');
    await expect(live).toHaveCount(1);
    await expect(live).toHaveAttribute('aria-atomic', 'true');
    await expect(live).toBeEmpty();

    // Et annet valg som Mor skal ikke følge med over til Far
    await modal.getByRole('radio', { name: 'Før mors permisjon' }).click();
    await expect(range(modal, '11. mai 2026 til 24. mai 2026')).toBeVisible();

    await modal.getByRole('radio', { name: 'Far', exact: true }).click();
    await expect(modal.getByRole('radiogroup', { name: 'Når skal far ta ferie?' })).toBeVisible();
    await expect(modal.getByRole('radio', { name: 'Etter fars permisjon' })).toBeChecked();
    await expect(range(modal, '3. mai 2027 til 16. mai 2027')).toBeVisible();
    await expect(live).toHaveText('Valgene gjelder nå far. Ferie 3. mai 2027 til 16. mai 2027.');

    await modal.getByRole('radio', { name: 'Mor', exact: true }).click();
    await expect(modal.getByRole('radio', { name: 'Etter mors permisjon' })).toBeChecked();
    await expect(range(modal, '23. nov. 2026 til 6. des. 2026')).toBeVisible();
    await expect(live).toHaveText('Valgene gjelder nå mor. Ferie 23. nov. 2026 til 6. des. 2026.');
  });

  test('Type endrer spørsmålet og fjerner valg som ikke gjelder', async ({ page }) => {
    const modal = await openNewPeriod(page);

    await modal.getByRole('radio', { name: 'Ulønnet permisjon' }).click();
    const unpaid = modal.getByRole('radiogroup', { name: 'Når skal mor ta ulønnet permisjon?' });
    await expect(unpaid.getByRole('radio')).toHaveCount(4);
    await expect(unpaid.getByRole('radio', { name: 'I mors permisjon' })).toHaveCount(0);

    // Valgt valg som forsvinner faller tilbake til standard
    await modal.getByRole('radio', { name: 'Ferie' }).click();
    await modal.getByRole('radio', { name: 'I mors permisjon' }).click();
    await modal.getByRole('radio', { name: 'Annet' }).click();
    const other = modal.getByRole('radiogroup', { name: 'Når skal mor ha perioden?' });
    await expect(other.getByRole('radio')).toHaveCount(2);
    await expect(other.getByRole('radio', { name: 'Etter mors permisjon' })).toBeChecked();
    await expect(other.getByRole('radio', { name: 'Velg datoer selv' })).toBeVisible();

    // Valget kommer ikke tilbake av seg selv når typen byttes tilbake
    await modal.getByRole('radio', { name: 'Ferie' }).click();
    const vacation = modal.getByRole('radiogroup', { name: 'Når skal mor ta ferie?' });
    await expect(vacation.getByRole('radio', { name: 'Etter mors permisjon' })).toBeChecked();
    await expect(range(modal, '23. nov. 2026 til 6. des. 2026')).toBeVisible();
  });

  test('Fargene har navn og er en radiogruppe', async ({ page }) => {
    const modal = await openNewPeriod(page);
    await modal.getByRole('radio', { name: 'Annet' }).click();

    const colors = modal.getByRole('radiogroup', { name: 'Farge' });
    await expect(colors.getByRole('radio')).toHaveCount(10);
    await expect(colors.getByRole('radio', { name: 'lilla' })).toBeChecked();
    // Brukeren klikker på selve fargeprøven, som er raden rundt radioen
    await modal.locator('label').filter({ has: page.getByRole('radio', { name: 'turkis' }) }).click();
    await expect(colors.getByRole('radio', { name: 'turkis' })).toBeChecked();
    await expect(modal.getByLabel('Beskrivelse')).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('Ferie etter mors permisjon lar gapet før barnehagestart stå uendret', async ({ page }) => {
    const status = page.getByRole('tabpanel', { name: 'Kalender' }).getByRole('status');
    await expect(status).toContainText(/udekket\s+gap/);
    const gapBefore = await status.innerText();

    const modal = await openNewPeriod(page);
    await expect(modal.getByRole('radio', { name: 'Etter mors permisjon' })).toBeChecked();
    await modal.getByRole('button', { name: 'Legg til' }).click();
    await expect(modal).toBeHidden();

    // Ferien ligger i fars permisjon, så ingen dager i gapet blir dekket
    await expect(status).toHaveText(gapBefore);
  });

  test('Ferie før fars permisjon flytter ikke permisjonen', async ({ page }) => {
    const calendar = page.getByRole('tabpanel', { name: 'Kalender' });
    const status = calendar.getByRole('status');
    await expect(status).toContainText(/udekket\s+gap/);
    const gapBefore = await status.innerText();

    const modal = await openNewPeriod(page);
    await modal.getByRole('radio', { name: 'Far', exact: true }).click();
    await modal.getByRole('radio', { name: 'Før fars permisjon' }).click();
    await modal.getByRole('button', { name: 'Legg til' }).click();
    await expect(modal).toBeHidden();

    // Ferien ligger før fars permisjon, så gapet før barnehagestart er uendret
    await expect(status).toHaveText(gapBefore);
  });
});

test('Kun mor: Etter permisjonen legger ferien i gapet', async ({ page }) => {
  await completeWizard(page, { rights: 'mother-only' });
  const calendar = page.getByRole('tabpanel', { name: 'Kalender' });
  const status = calendar.getByRole('status');
  await expect(status).toContainText(/udekket\s+gap/);
  await expect(status).not.toContainText('dekket)');

  const modal = await openNewPeriod(page);
  // Forelder er ikke et valg når bare mor har rett
  await expect(modal.getByRole('radiogroup', { name: 'Forelder' })).toHaveCount(0);
  const group = modal.getByRole('radiogroup', { name: 'Når skal mor ta ferie?' });
  await expectChoices(group, [
    { name: 'Før permisjonen', description: 'Slutter 24. mai 2026, dagen før permisjonen starter.' },
    { name: 'I permisjonen', description: 'Fra uke 7 etter fødselen. Mor får foreldrepenger og feriepenger samtidig.' },
    { name: 'Etter permisjonen', description: 'Fra 3. mai 2027, etter at permisjonen er over.' },
    { name: 'Velg datoer selv', description: null },
  ]);
  await expect(group.getByRole('radio', { name: 'Etter permisjonen' })).toBeChecked();
  await expect(range(modal, '3. mai 2027 til 16. mai 2027')).toBeVisible();
  // 3.-16. mai 2027 er ti hverdager, minus Kristi himmelfartsdag 6. mai
  await expect(modal.getByText('14 kalenderdager (9 feriedager)')).toBeVisible();
  await expectNoAxeViolations(page);

  await modal.getByRole('button', { name: 'Legg til' }).click();
  await expect(modal).toBeHidden();
  await expect(status).toContainText('(9 dager dekket)');
});

test('Kun far: valgene gjelder permisjonen og datoene merkes som anslag', async ({ page }) => {
  await completeWizard(page, { rights: 'father-only' });
  const modal = await openNewPeriod(page);
  await expect(modal.getByRole('radiogroup', { name: 'Forelder' })).toHaveCount(0);

  const group = modal.getByRole('radiogroup', { name: 'Når skal far ta ferie?' });
  await expectChoices(group, [
    { name: 'Før permisjonen', description: 'Slutter 14. juni 2026, dagen før permisjonen starter.' },
    { name: 'I permisjonen', description: 'Fra 15. juni 2026. Far får foreldrepenger og feriepenger samtidig.' },
    { name: 'Etter permisjonen', description: 'Fra 22. mars 2027, etter at permisjonen er over.' },
    { name: 'Velg datoer selv', description: null },
  ]);
  await expect(group).toHaveAccessibleDescription(
    'Far starter på beregnet termin i planen, så datoene er anslag.',
  );
  await expect(modal.getByText('Far starter på beregnet termin i planen, så datoene er anslag.')).toBeVisible();
  await expect(group.getByRole('radio', { name: 'Etter permisjonen' })).toBeChecked();
  await expect(range(modal, '22. mars 2027 til 4. apr. 2027')).toBeVisible();
  await group.getByRole('radio', { name: 'I permisjonen' }).click();
  await expect(range(modal, '15. juni 2026 til 28. juni 2026')).toBeVisible();
  await expectNoAxeViolations(page);
});

test('Redigering av en periode viser ikke plasseringen og beholder datoene', async ({ page }) => {
  await completeWizard(page, { rights: 'mother-only' });
  const calendar = page.getByRole('tabpanel', { name: 'Kalender' });

  const modal = await openNewPeriod(page);
  await modal.getByRole('button', { name: 'Legg til' }).click();
  await expect(modal).toBeHidden();

  // Perioden ligger 3.-16. mai 2027
  await calendar.getByRole('button', { name: /^Bhg / }).click();
  for (const month of ['juli 2027', 'juni 2027', 'mai 2027']) {
    await calendar.getByRole('button', { name: 'Forrige måned' }).click();
    await expect(calendar.getByRole('heading', { name: month })).toBeVisible();
  }
  await calendar.getByRole('gridcell', { name: /^onsdag 5\. mai 2027/ }).click();
  const detail = page.getByRole('region', { name: /Detaljer for onsdag 5\. mai 2027/i });
  await detail.getByRole('button', { name: 'Rediger periode' }).click();

  const edit = page.getByRole('dialog', { name: 'Rediger periode' });
  await expect(edit.getByRole('radiogroup', { name: /Når skal/ })).toHaveCount(0);
  await expect(edit.getByRole('button', { name: 'Fra 3. mai 2027' })).toBeVisible();
  await expect(edit.getByRole('button', { name: 'Til 16. mai 2027' })).toBeVisible();
  await expect(edit.getByRole('radiogroup', { name: 'Type' })).toBeVisible();
  await expectNoAxeViolations(page);
});

test.describe('Dialogen på smal skjerm', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('Reflow ved 320 px og fokus er aldri skjult bak noe', async ({ page }) => {
    await completeWizard(page, { rights: 'both' });
    const modal = await openNewPeriod(page);

    // Reflow (1.4.10): ingen vannrett scrolling, og dialogen ligger innenfor skjermen
    const box = await modal.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        overflowsX: el.scrollWidth > el.clientWidth,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        viewport: window.innerHeight,
        width: window.innerWidth,
      };
    });
    expect(box.overflowsX).toBe(false);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(box.width);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(box.viewport);
    expect(box.height).toBeLessThanOrEqual(box.viewport * 0.9 + 1);

    // Focus Not Obscured (2.4.11): tab gjennom hele dialogen
    const labels: string[] = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        const dialog = document.querySelector('[role="dialog"]');
        if (!el || !dialog || !dialog.contains(el)) return { inside: false, label: '', visible: false };
        // Visuelt skjulte radioer vises via raden rundt, ellers selve elementet
        const target = (el.closest('label') as HTMLElement | null) ?? el;
        const rect = target.getBoundingClientRect();
        const dialogRect = dialog.getBoundingClientRect();
        const inside = rect.top >= dialogRect.top - 1 && rect.bottom <= dialogRect.bottom + 1;
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
          inside: true,
          label: el.getAttribute('aria-labelledby') ?? el.textContent ?? '',
          visible: inside && !!hit && target.contains(hit),
        };
      });
      if (!focus.inside) continue;
      labels.push(focus.label);
      expect(focus.visible, `fokusert element ${i} er helt synlig`).toBe(true);
    }
    expect(labels.length).toBeGreaterThan(6);
  });
});

test('Uten barnehage finnes ikke Før barnehagestart', async ({ page }) => {
  await seedPlan(page, { wizard: { daycareEnabled: false } });
  await page.goto('/planlegger/kalender');
  const modal = await openNewPeriod(page);

  await expect(modal.getByRole('radio', { name: 'Etter mors permisjon' })).toBeChecked();
  await expect(modal.getByRole('radio', { name: 'Før barnehagestart' })).toHaveCount(0);
  await expect(modal.getByRole('radiogroup', { name: 'Når skal mor ta ferie?' }).getByRole('radio')).toHaveCount(4);
});

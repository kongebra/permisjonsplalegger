import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Felles hjelpere for funksjonelle e2e-tester.
 * Alt går via roller og labels, og ingen faste ventetider.
 */

export type Rights = 'both' | 'mother-only' | 'father-only';

/** Radioknappens navn i veiviseren for hver rettighet. */
export const RIGHTS_LABEL: Record<Rights, RegExp> = {
  both: /^Begge foreldre/,
  'mother-only': /^Kun mor/,
  'father-only': /^Kun far\/medmor/,
};

export const RIGHTS_CASES: { rights: Rights; name: string }[] = [
  { rights: 'mother-only', name: 'kun mor' },
  { rights: 'father-only', name: 'kun far' },
  { rights: 'both', name: 'begge' },
];

/** Fast "i dag" slik at datovelgerne og beregninger er like på alle kjøringer. */
const FIXED_NOW = new Date('2026-06-15T10:00:00');

/** Norske korte månedsnavn slik datovelgerne viser dem. */
const SHORT_MONTHS = ['jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];

/**
 * Starter med blank lagring og fast klokke. Lagringen tømmes bare ved første
 * lasting, slik at en reload ikke sletter planen.
 */
export async function startFresh(page: Page) {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-cleared')) {
      localStorage.clear();
      sessionStorage.setItem('e2e-cleared', '1');
    }
  });
  await page.goto('/planlegger');
  await page.getByRole('button', { name: /start planleggingen/i }).click();
}

export async function clickNext(page: Page) {
  await page.getByRole('button', { name: /^neste/i }).click();
}

/** Velger termindato i veiviserens dropdown-kalender (måned 1-12). */
export async function pickDueDate(page: Page, year: number, month: number, day: number) {
  await page.getByRole('combobox', { name: 'Velg år' }).selectOption(String(year));
  await page.getByRole('combobox', { name: 'Velg måned' }).selectOption({ label: SHORT_MONTHS[month - 1] });
  // Kalenderen kan vise utenforliggende dager, så dagen må ligge i valgt måned
  await page
    .getByRole('grid')
    .getByRole('button', { name: new RegExp(`\\b${day}\\. ${monthName(month)} ${year}`) })
    .click();
}

const LONG_MONTHS = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

function monthName(month: number) {
  return LONG_MONTHS[month - 1];
}

/**
 * Går gjennom hele veiviseren med gitt rettighet og lønn, og lander på
 * kalendersiden med velkomstdialogen lukket.
 */
export async function completeWizard(
  page: Page,
  options: { rights: Rights; withSalary?: boolean } = { rights: 'both' },
) {
  await startFresh(page);

  // Steg 1: termin 15. juni 2026 (samme som fast "i dag")
  await pickDueDate(page, 2026, 6, 15);
  await clickNext(page);

  // Steg 2: rettigheter
  await expect(page.getByRole('heading', { name: /hvem har rett/i })).toBeVisible();
  await page.getByRole('radio', { name: RIGHTS_LABEL[options.rights] }).click();
  await clickNext(page);

  // Steg 3: dekningsgrad
  await expect(page.getByRole('heading', { name: /velg dekningsgrad/i })).toBeVisible();
  await page.getByRole('radio', { name: /^100%/ }).click();
  await clickNext(page);

  // Steg 4: fordeling, 5: barnehage, 6: jobb
  await expect(page.getByRole('navigation', { name: /steg-navigasjon/i })).toBeVisible();
  await clickNext(page);
  await expect(page.getByRole('heading', { name: 'Barnehagestart' })).toBeVisible();
  await clickNext(page);
  await clickNext(page);

  // Steg 7: økonomi
  await expect(page.getByRole('heading', { name: 'Økonomisk informasjon' })).toBeVisible();
  if (options.withSalary) {
    const salary = page.getByRole('textbox', { name: 'f.eks. 50 000' });
    if (options.rights !== 'father-only') await salary.first().fill('50000');
    if (options.rights !== 'mother-only') await salary.last().fill('45000');
  }
  await clickNext(page);

  // Steg 8: oppsummering
  await expect(page.getByRole('heading', { name: 'Oppsummering' })).toBeVisible();
  await page.getByRole('button', { name: 'Gå til kalender' }).click();

  // Lasteskjermen vises i noen sekunder før kalenderen er klar
  await expect(page).toHaveURL(/\/planlegger\/kalender/, { timeout: 20_000 });
  await expect(page.getByRole('tab', { name: 'Kalender' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Forstått!' }).click();
  await expect(page.getByRole('dialog', { name: /slik bruker du kalenderen/i })).toBeHidden();
}

/** Månedsindeks (0-11) for et kort norsk månedsnavn som "nov.". */
function shortMonthIndex(text: string) {
  return SHORT_MONTHS.indexOf(text);
}

/**
 * Oppretter en ferieperiode via "Legg til periode"-dialogen og datovelgeren.
 * Datoene er inklusive, slik brukeren ser dem. Begge datoene må ligge i
 * `month` (1-12) i `year`, og dialogen er lukket når perioden er lagt til.
 */
export async function addVacation(
  page: Page,
  options: {
    year: number;
    month: number;
    fromDay: number;
    toDay: number;
    /** Kjøres med åpen dialog rett før "Legg til" */
    beforeSave?: (modal: Locator) => Promise<void>;
  },
) {
  await page.getByRole('button', { name: 'Legg til periode' }).click();
  const modal = page.getByRole('dialog', { name: 'Ny periode' });
  await expect(modal).toBeVisible();
  await modal.getByRole('radio', { name: 'Velg datoer selv' }).click();

  // "Fra"-knappen har navnet "Fra 23. nov. 2026" og viser startdatoen
  const fromButton = modal.getByRole('button', { name: /^Fra \d/ });
  const match = (await fromButton.innerText()).match(/(\d+)\. (\S+) (\d{4})/);
  if (!match) throw new Error('Fant ikke startdato i "Fra"-knappen');
  const monthsToMove =
    (options.year - Number(match[3])) * 12 + (options.month - 1 - shortMonthIndex(match[2]));
  await fromButton.click();

  const picker = page.getByRole('dialog', { name: 'Velg periode' });
  await expect(picker).toBeVisible();
  // Målmåneden kan ligge før eller etter startdatoen
  const step = picker.getByRole('button', { name: monthsToMove < 0 ? 'Forrige måned' : 'Neste måned' });
  for (let i = 0; i < Math.abs(monthsToMove); i++) {
    await step.click();
  }

  // Velgeren viser to måneder; første rutenett er målmåneden
  const grid = picker.getByRole('grid', { name: `${monthName(options.month)} ${options.year}` });
  const dayCell = (day: number) =>
    grid.getByRole('gridcell', {
      name: new RegExp(`\\b${day}\\. ${monthName(options.month)} ${options.year}`),
    });
  await dayCell(options.fromDay).click();
  await dayCell(options.toDay).click();
  await picker.getByRole('button', { name: 'Bekreft' }).click();
  await expect(picker).toBeHidden();

  if (options.beforeSave) await options.beforeSave(modal);
  await modal.getByRole('button', { name: 'Legg til' }).click();
  await expect(modal).toBeHidden();
}

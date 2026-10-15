import { describe, test, expect } from 'bun:test';
import { parseSavedPlan } from './saved-plan';
import { loadPlanFromStorage } from '@/store/slices/persistenceSlice';

// Samme form som planen e2e-testene legger i localStorage (coverage som streng)
function validPlan(): Record<string, unknown> {
  return {
    version: 1,
    savedAt: '2026-10-15T10:00:00.000Z',
    wizard: {
      currentStep: 8,
      wizardCompleted: true,
      dueDate: '2026-09-01T00:00:00.000Z',
      rights: 'both',
      coverage: 100,
      sharedWeeksToMother: 10,
      daycareStartDate: '2027-08-01T00:00:00.000Z',
      daycareEnabled: true,
    },
    jobSettings: { mother: null, father: { jobType: 'office', vacationDays: 25 } },
    economy: {
      mother: {
        monthlySalary: 50000,
        monthlyCommissionLoss: 0,
        employerCoversAbove6G: false,
        employerPaysFeriepenger: true,
      },
      father: {
        monthlySalary: 60000,
        monthlyCommissionLoss: 0,
        employerCoversAbove6G: false,
        employerPaysFeriepenger: false,
      },
    },
    periods: [
      {
        id: 'p1',
        type: 'permisjon',
        parent: 'mother',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-12-22T00:00:00.000Z',
        isLocked: true,
        segmentType: 'mandatory',
      },
    ],
    autoSaveEnabled: true,
  };
}

function withWizard(patch: Record<string, unknown>) {
  const plan = validPlan();
  plan.wizard = { ...(plan.wizard as object), ...patch };
  return plan;
}

describe('parseSavedPlan: gyldig plan', () => {
  test('beholder alle felt i en gyldig plan', () => {
    const parsed = parseSavedPlan(validPlan());
    expect(parsed).not.toBeNull();
    expect(parsed?.wizard.dueDate).toBe('2026-09-01T00:00:00.000Z');
    expect(parsed?.wizard.coverage).toBe(100);
    expect(parsed?.wizard.daycareEnabled).toBe(true);
    expect(parsed?.jobSettings.father).toEqual({ jobType: 'office', vacationDays: 25 });
    expect(parsed?.economy?.mother.monthlySalary).toBe(50000);
    expect(parsed?.periods).toHaveLength(1);
    expect(parsed?.autoSaveEnabled).toBe(true);
  });

  test('godtar planen e2e-testene bruker: coverage som streng og uten economy', () => {
    const plan = withWizard({ coverage: '100' });
    delete plan.economy;
    plan.jobSettings = { mother: null, father: null };
    const parsed = parseSavedPlan(plan);
    expect(parsed?.wizard.coverage).toBe(100);
    expect(parsed?.economy).toBeUndefined();
  });

  test('godtar 80 prosent og kun far/kun mor', () => {
    expect(parseSavedPlan(withWizard({ coverage: 80, rights: 'father-only' }))?.wizard.coverage).toBe(80);
    expect(parseSavedPlan(withWizard({ rights: 'mother-only' }))?.wizard.rights).toBe('mother-only');
  });
});

describe('parseSavedPlan: ugyldig grunnlag gir null', () => {
  const cases: [string, unknown][] = [
    ['null', null],
    ['tall', 42],
    ['liste', []],
    ['tomt objekt', {}],
    ['feil versjon', { ...validPlan(), version: 2 }],
    ['wizard mangler', { ...validPlan(), wizard: undefined }],
    ['dueDate søppel', withWizard({ dueDate: 'garbage' })],
    ['dueDate null', withWizard({ dueDate: null })],
    ['dueDate tall', withWizard({ dueDate: 0 })],
    ['rights ukjent', withWizard({ rights: 'x' })],
    ['coverage ukjent', withWizard({ coverage: '90' })],
    ['coverage mangler', withWizard({ coverage: undefined })],
    ['sharedWeeks ikke et tall', withWizard({ sharedWeeksToMother: 'ti' })],
    ['sharedWeeks negativ', withWizard({ sharedWeeksToMother: -1 })],
    ['sharedWeeks NaN-lignende', withWizard({ sharedWeeksToMother: null })],
  ];

  test.each(cases)('%s', (_name, raw) => {
    expect(parseSavedPlan(raw)).toBeNull();
  });
});

describe('parseSavedPlan: delvis ugyldig plan reddes ikke helt', () => {
  test('ugyldig barnehagedato blir null i stedet for kræsj', () => {
    const parsed = parseSavedPlan(withWizard({ daycareStartDate: 'garbage' }));
    expect(parsed?.wizard.daycareStartDate).toBeNull();
  });

  test('ugyldig prematur fødselsdato blir null', () => {
    expect(parseSavedPlan(withWizard({ prematureBirthDate: 'garbage' }))?.wizard.prematureBirthDate).toBeNull();
  });

  test('ugyldig currentStep utelates', () => {
    expect(parseSavedPlan(withWizard({ currentStep: 99 }))?.wizard.currentStep).toBeUndefined();
    expect(parseSavedPlan(withWizard({ currentStep: 'x' }))?.wizard.currentStep).toBeUndefined();
  });

  test('perioder som ikke er en liste blir tom liste', () => {
    expect(parseSavedPlan({ ...validPlan(), periods: null })?.periods).toEqual([]);
  });

  test('ugyldige perioder fjernes, gyldige beholdes', () => {
    const plan = validPlan();
    const good = (plan.periods as object[])[0];
    plan.periods = [
      good,
      { ...good, id: 'bad-date', startDate: 'garbage' },
      { ...good, id: 'bad-type', type: 'ukjent' },
      { ...good, id: 'bad-parent', parent: 'ingen' },
      { ...good, id: 'zero-length', endDate: (good as { startDate: string }).startDate },
      { ...good, id: '' },
      'tekst',
      null,
    ];
    const parsed = parseSavedPlan(plan);
    expect(parsed?.periods.map((p) => p.id)).toEqual(['p1']);
  });

  test('jobSettings som mangler eller er ugyldig blir null', () => {
    const missing = validPlan();
    delete missing.jobSettings;
    expect(parseSavedPlan(missing)?.jobSettings).toEqual({ mother: null, father: null });

    const invalid = { ...validPlan(), jobSettings: { mother: { jobType: 'x', vacationDays: 25 }, father: 'nei' } };
    expect(parseSavedPlan(invalid)?.jobSettings).toEqual({ mother: null, father: null });
  });

  test('økonomi med null-felt utelates helt', () => {
    expect(parseSavedPlan({ ...validPlan(), economy: { mother: null, father: null } })?.economy).toBeUndefined();
    const onlyMother = validPlan();
    (onlyMother.economy as Record<string, unknown>).father = { monthlySalary: 'mye' };
    expect(parseSavedPlan(onlyMother)?.economy).toBeUndefined();
  });

  test('økonomi får standardverdier for manglende delfelt', () => {
    const plan = validPlan();
    plan.economy = { mother: { monthlySalary: 40000 }, father: { monthlySalary: 0 } };
    const parsed = parseSavedPlan(plan);
    expect(parsed?.economy?.mother).toEqual({
      monthlySalary: 40000,
      monthlyCommissionLoss: 0,
      employerCoversAbove6G: false,
      employerPaysFeriepenger: false,
    });
  });
});

describe('loadPlanFromStorage', () => {
  // bun test har ingen localStorage/window, så vi stubber begge
  const store = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown; localStorage?: unknown };
  const original = { window: g.window, localStorage: g.localStorage };

  function setRaw(raw: string | null) {
    g.window = {};
    g.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    store.clear();
    if (raw !== null) store.set('permisjonsplan-v1', raw);
  }

  function restore() {
    g.window = original.window;
    g.localStorage = original.localStorage;
  }

  test('returnerer null for ugyldig JSON, tomt objekt og manglende nøkkel', () => {
    try {
      setRaw('{not json');
      expect(loadPlanFromStorage()).toBeNull();
      setRaw('{}');
      expect(loadPlanFromStorage()).toBeNull();
      setRaw(null);
      expect(loadPlanFromStorage()).toBeNull();
    } finally {
      restore();
    }
  });

  test('returnerer validert plan for gyldig JSON', () => {
    try {
      setRaw(JSON.stringify(validPlan()));
      expect(loadPlanFromStorage()?.wizard.rights).toBe('both');
    } finally {
      restore();
    }
  });
});

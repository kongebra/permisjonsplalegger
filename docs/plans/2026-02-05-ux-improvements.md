# UX Forbedringer basert på brukertesting

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Forbedre brukeropplevelsen basert på funn fra 5 personas (Emilie, Fatima, Maja, Jonas, Erik)

**Architecture:**
- Legge til economySlice i Zustand store for lønnsinput
- Utvide wizard fra 7 til 8 steg (nytt EconomyStep)
- Gjenbruke eksisterende EconomySection og EconomyComparison komponenter
- Fikse tekst og legge til ordforklaringer i eksisterende komponenter

**Tech Stack:** Next.js 16, React 19, Zustand, TypeScript, Tailwind CSS

**Prioritering:**
- P0 (Kritisk): Task 1-3 - Økonomi-integrasjon
- P1 (Høy): Task 4-6 - Instruksjoner og onboarding
- P2 (Middels): Task 7-9 - Validering og feedback
- P3 (Lav): Task 10 - Nice-to-have

---

## Task 1: Opprett economySlice for Zustand store

**Prioritet:** P0 (Kritisk)
**Persona:** Maja - "Jeg ser aldri hvor mye penger jeg faktisk får"

**Files:**
- Create: `src/store/slices/economySlice.ts`
- Modify: `src/store/index.ts:33-110`
- Modify: `src/store/hooks.ts`

**Step 1: Opprett economySlice**

```typescript
// src/store/slices/economySlice.ts
import type { StateCreator } from 'zustand';
import type { ParentEconomy } from '@/lib/types';
import type { PlannerStore } from '../index';

const DEFAULT_ECONOMY: ParentEconomy = {
  monthlySalary: 0,
  monthlyCommissionLoss: 0,
  employerCoversAbove6G: false,
  employerPaysFeriepenger: false,
};

export interface EconomySlice {
  motherEconomy: ParentEconomy;
  fatherEconomy: ParentEconomy;
  setMotherEconomy: (economy: ParentEconomy) => void;
  setFatherEconomy: (economy: ParentEconomy) => void;
  resetEconomy: () => void;
}

export const createEconomySlice: StateCreator<
  PlannerStore,
  [],
  [],
  EconomySlice
> = (set) => ({
  motherEconomy: DEFAULT_ECONOMY,
  fatherEconomy: DEFAULT_ECONOMY,

  setMotherEconomy: (economy) => set({ motherEconomy: economy }),
  setFatherEconomy: (economy) => set({ fatherEconomy: economy }),
  resetEconomy: () =>
    set({
      motherEconomy: DEFAULT_ECONOMY,
      fatherEconomy: DEFAULT_ECONOMY,
    }),
});
```

**Step 2: Integrer i store/index.ts**

Legg til i imports:
```typescript
import { createEconomySlice, type EconomySlice } from './slices/economySlice';
```

Oppdater PlannerStore type:
```typescript
export type PlannerStore = WizardSlice &
  JobSettingsSlice &
  PeriodsSlice &
  UiSlice &
  PersistenceSlice &
  EconomySlice & // Legg til
  { ... }
```

Legg til i create():
```typescript
...createEconomySlice(...a),
```

Oppdater savePlan() til å inkludere økonomi:
```typescript
motherEconomy: get().motherEconomy,
fatherEconomy: get().fatherEconomy,
```

Oppdater loadPlan() til å laste økonomi:
```typescript
if (saved.motherEconomy) set({ motherEconomy: saved.motherEconomy });
if (saved.fatherEconomy) set({ fatherEconomy: saved.fatherEconomy });
```

**Step 3: Legg til useEconomy hook**

```typescript
// I src/store/hooks.ts
export function useEconomy() {
  return usePlannerStore(
    useShallow((state) => ({
      motherEconomy: state.motherEconomy,
      fatherEconomy: state.fatherEconomy,
      setMotherEconomy: state.setMotherEconomy,
      setFatherEconomy: state.setFatherEconomy,
    }))
  );
}
```

**Step 4: Verifiser at appen kompilerer**

Run: `bun run build`
Expected: Build successful

**Step 5: Commit**

```bash
git add src/store/slices/economySlice.ts src/store/index.ts src/store/hooks.ts
git commit -m "feat: add economySlice for salary and economy data"
```

---

## Task 2: Opprett EconomyStep wizard-komponent

**Prioritet:** P0 (Kritisk)
**Persona:** Maja - "Jeg blir aldri spurt om hva jeg tjener"

**Files:**
- Create: `src/components/wizard/steps/EconomyStep.tsx`
- Modify: `src/components/wizard/WizardContainer.tsx`

**Step 1: Opprett EconomyStep komponent**

```typescript
// src/components/wizard/steps/EconomyStep.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Lightbulb } from 'lucide-react';
import type { ParentEconomy, ParentRights } from '@/lib/types';
import { G } from '@/lib/constants';

interface EconomyStepProps {
  rights: ParentRights;
  motherEconomy: ParentEconomy;
  fatherEconomy: ParentEconomy;
  onMotherChange: (economy: ParentEconomy) => void;
  onFatherChange: (economy: ParentEconomy) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(value);
}

function ParentEconomyCard({
  label,
  economy,
  onChange,
  colorClass,
}: {
  label: string;
  economy: ParentEconomy;
  onChange: (economy: ParentEconomy) => void;
  colorClass: string;
}) {
  const sixG = 6 * G;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={`text-lg ${colorClass}`}>{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Månedslønn */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Månedslønn (brutto)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Din faste månedslønn før skatt. Ikke inkluder bonus eller overtid.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            type="number"
            min={0}
            value={economy.monthlySalary || ''}
            onChange={(e) =>
              onChange({ ...economy, monthlySalary: Math.max(0, Number(e.target.value)) })
            }
            placeholder="50000"
          />
        </div>

        {/* Dekker over 6G */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Dekker arbeidsgiver lønn over 6G?</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    NAV dekker maks 6G ({formatCurrency(sixG)}/år = {formatCurrency(sixG / 12)}/mnd).
                    Noen arbeidsgivere dekker differansen for ansatte som tjener mer.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            <Toggle
              pressed={economy.employerCoversAbove6G}
              onPressedChange={(pressed) => onChange({ ...economy, employerCoversAbove6G: pressed })}
              className="data-[state=on]:bg-green-600 data-[state=on]:text-white"
            >
              Ja
            </Toggle>
            <Toggle
              pressed={!economy.employerCoversAbove6G}
              onPressedChange={(pressed) => onChange({ ...economy, employerCoversAbove6G: !pressed })}
              className="data-[state=on]:bg-muted"
            >
              Nei
            </Toggle>
          </div>
        </div>

        {/* Feriepenger */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Feriepenger fra arbeidsgiver?</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Hvis arbeidsgiver betaler lønn under permisjon, får du ofte full feriepengeopptjening.
                    Hvis NAV betaler direkte, får du kun feriepenger for de første 12-15 ukene.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            <Toggle
              pressed={economy.employerPaysFeriepenger}
              onPressedChange={(pressed) => onChange({ ...economy, employerPaysFeriepenger: pressed })}
              className="data-[state=on]:bg-green-600 data-[state=on]:text-white"
            >
              Ja
            </Toggle>
            <Toggle
              pressed={!economy.employerPaysFeriepenger}
              onPressedChange={(pressed) => onChange({ ...economy, employerPaysFeriepenger: !pressed })}
              className="data-[state=on]:bg-muted"
            >
              Nei (NAV)
            </Toggle>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EconomyStep({
  rights,
  motherEconomy,
  fatherEconomy,
  onMotherChange,
  onFatherChange,
}: EconomyStepProps) {
  const showMother = rights !== 'father-only';
  const showFather = rights !== 'mother-only';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Økonomisk informasjon</h2>
        <p className="text-muted-foreground">
          Valgfritt - for å beregne hva du faktisk får utbetalt
        </p>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 flex gap-3">
        <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">Hvorfor spør vi om dette?</p>
          <p className="mt-1">
            Med lønnsinformasjon kan vi vise deg hvor mye du faktisk får utbetalt per måned,
            og beregne den reelle forskjellen mellom 80% og 100% dekning for din situasjon.
          </p>
        </div>
      </div>

      {/* Parent inputs */}
      <div className="grid gap-4 md:grid-cols-2">
        {showMother && (
          <ParentEconomyCard
            label="Mor"
            economy={motherEconomy}
            onChange={onMotherChange}
            colorClass="text-pink-600 dark:text-pink-400"
          />
        )}
        {showFather && (
          <ParentEconomyCard
            label="Far / Medmor"
            economy={fatherEconomy}
            onChange={onFatherChange}
            colorClass="text-blue-600 dark:text-blue-400"
          />
        )}
      </div>

      {/* Skip hint */}
      <p className="text-center text-sm text-muted-foreground">
        Du kan hoppe over dette steget og legge til økonomisk informasjon senere.
      </p>
    </div>
  );
}
```

**Step 2: Oppdater WizardContainer til 8 steg**

I `src/components/wizard/WizardContainer.tsx`:

Endre TOTAL_STEPS:
```typescript
const TOTAL_STEPS = 8;
```

Legg til import:
```typescript
import { EconomyStep } from './steps/EconomyStep';
import { useEconomy } from '@/store/hooks';
```

Legg til hook i komponenten:
```typescript
const { motherEconomy, fatherEconomy, setMotherEconomy, setFatherEconomy } = useEconomy();
```

Oppdater renderStep() - legg til case 7 for EconomyStep, flytt SummaryStep til case 8:
```typescript
case 7:
  return (
    <EconomyStep
      rights={rights}
      motherEconomy={motherEconomy}
      fatherEconomy={fatherEconomy}
      onMotherChange={setMotherEconomy}
      onFatherChange={setFatherEconomy}
    />
  );
case 8:
  return (
    <SummaryStep ... />  // Uendret
  );
```

**Step 3: Oppdater index export**

I `src/components/wizard/steps/index.ts` (hvis den finnes), legg til:
```typescript
export { EconomyStep } from './EconomyStep';
```

**Step 4: Test at wizard fungerer**

Run: `bun run dev`
Naviger gjennom alle 8 steg manuelt.

**Step 5: Commit**

```bash
git add src/components/wizard/steps/EconomyStep.tsx src/components/wizard/WizardContainer.tsx
git commit -m "feat: add EconomyStep to wizard (step 7 of 8)"
```

---

## Task 3: Vis økonomi-resultat i SummaryStep

**Prioritet:** P0 (Kritisk)
**Persona:** Maja - "Hvor mye penger får jeg faktisk?"

**Files:**
- Modify: `src/components/wizard/steps/SummaryStep.tsx`
- Reuse: `src/lib/calculator/economy.ts` (compareScenarios)

**Step 1: Les nåværende SummaryStep**

Les filen først for å forstå strukturen.

**Step 2: Legg til økonomi-visning**

Import øverst:
```typescript
import { compareScenarios, calculateDailyRate } from '@/lib/calculator/economy';
import type { ParentEconomy } from '@/lib/types';
```

Legg til props:
```typescript
interface SummaryStepProps {
  // ... eksisterende props
  motherEconomy?: ParentEconomy;
  fatherEconomy?: ParentEconomy;
}
```

Inne i komponenten, beregn økonomi hvis data finnes:
```typescript
const hasEconomyData = motherEconomy?.monthlySalary || fatherEconomy?.monthlySalary;

const economyResult = hasEconomyData
  ? compareScenarios(
      motherEconomy!,
      rights !== 'mother-only' ? fatherEconomy : undefined,
      sharedWeeksToMother,
      leaveResult.gap,
      leaveResult.gap // Samme gap for begge scenarioer i denne konteksten
    )
  : null;
```

Legg til visning av økonomisk sammenligning (under eksisterende oppsummering):
```typescript
{economyResult && (
  <Card className="border-2 border-green-200 dark:border-green-800">
    <CardHeader className="pb-2">
      <CardTitle className="text-lg flex items-center gap-2">
        <DollarSign className="w-5 h-5" />
        Økonomisk sammenligning
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">
          Differanse mellom 100% og 80%
        </p>
        <p className={cn(
          "text-3xl font-bold",
          economyResult.difference >= 0 ? "text-green-600" : "text-red-600"
        )}>
          {economyResult.difference >= 0 ? '+' : ''}
          {formatCurrency(economyResult.difference)}
        </p>
        <p className="text-sm font-medium mt-1">
          {economyResult.recommendation}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium">100% dekning</p>
          <p className="text-muted-foreground">
            Totalt: {formatCurrency(economyResult.scenario100.total)}
          </p>
        </div>
        <div>
          <p className="font-medium">80% dekning</p>
          <p className="text-muted-foreground">
            Totalt: {formatCurrency(economyResult.scenario80.total)}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

**Step 3: Oppdater WizardContainer til å passe økonomi-props**

```typescript
case 8:
  return (
    <SummaryStep
      // ... eksisterende props
      motherEconomy={motherEconomy}
      fatherEconomy={fatherEconomy}
    />
  );
```

**Step 4: Test økonomivisning**

Run: `bun run dev`
1. Gå gjennom wizard
2. Legg inn lønn i steg 7
3. Se at SummaryStep viser økonomisk sammenligning

**Step 5: Commit**

```bash
git add src/components/wizard/steps/SummaryStep.tsx src/components/wizard/WizardContainer.tsx
git commit -m "feat: show economy comparison in SummaryStep"
```

---

## Task 4: Fiks kalender-instruksjonstekst

**Prioritet:** P1 (Høy)
**Persona:** Emilie, Fatima - "Instruksen stemmer ikke med interaksjonen"

**Files:**
- Modify: `src/components/planner/PeriodToolbar.tsx:117-119`

**Step 1: Endre instruksjonsteksten**

I `src/components/planner/PeriodToolbar.tsx`, endre linje 117-119 fra:
```typescript
<p className="text-center text-xs text-muted-foreground">
  Trykk på startdato, deretter sluttdato
</p>
```

Til:
```typescript
<p className="text-center text-xs text-muted-foreground">
  Dra over dagene du vil markere
</p>
```

**Step 2: Verifiser visuelt**

Run: `bun run dev`
Naviger til kalender og se at teksten er oppdatert.

**Step 3: Commit**

```bash
git add src/components/planner/PeriodToolbar.tsx
git commit -m "fix: update calendar instruction to match drag behavior"
```

---

## Task 5: Legg til ordforklaringer (Glossary)

**Prioritet:** P1 (Høy)
**Persona:** Fatima - "NAV-terminologi uten forklaring"

**Files:**
- Create: `src/components/ui/glossary-term.tsx`
- Modify: `src/components/wizard/steps/CoverageStep.tsx`
- Modify: `src/components/wizard/steps/DistributionStep.tsx`
- Modify: `src/components/planner/StatsBar.tsx`

**Step 1: Opprett GlossaryTerm komponent**

```typescript
// src/components/ui/glossary-term.tsx
'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const GLOSSARY: Record<string, string> = {
  'foreldrepenger': 'Pengene du får fra NAV når du er hjemme med barnet etter fødsel.',
  'kvote': 'Uker som er reservert til deg. Du mister dem hvis du ikke bruker dem.',
  'fellesperiode': 'Uker som kan fordeles fritt mellom foreldrene. Dere bestemmer selv hvem som tar dem.',
  'dekningsgrad': 'Hvor mye av lønnen din du får utbetalt. 100% = full lønn, 80% = 80% av lønnen.',
  '6G': 'Ca 780 000 kr per år. Dette er det meste NAV kan utbetale, uansett hvor mye du tjener.',
  'gap': 'Perioden mellom permisjonen slutter og barnet får barnehageplass. Du har ingen inntekt i denne perioden.',
  'feriepenger': 'Ekstra lønn du får utbetalt i juni basert på hva du tjente året før (10.2% av lønnen).',
};

interface GlossaryTermProps {
  term: keyof typeof GLOSSARY;
  children: React.ReactNode;
}

export function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const explanation = GLOSSARY[term];

  if (!explanation) return <>{children}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="underline decoration-dotted decoration-muted-foreground cursor-help">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Step 2: Bruk GlossaryTerm i CoverageStep**

I `src/components/wizard/steps/CoverageStep.tsx`, wrap "dekningsgrad" med:
```typescript
<GlossaryTerm term="dekningsgrad">dekningsgrad</GlossaryTerm>
```

**Step 3: Bruk GlossaryTerm i DistributionStep**

I `src/components/wizard/steps/DistributionStep.tsx`, wrap relevante termer:
```typescript
<GlossaryTerm term="fellesperiode">fellesperiode</GlossaryTerm>
<GlossaryTerm term="kvote">kvote</GlossaryTerm>
```

**Step 4: Bruk GlossaryTerm i StatsBar**

I `src/components/planner/StatsBar.tsx`, wrap "kvote" og "fellesperiode".

**Step 5: Test tooltips**

Run: `bun run dev`
Hover over understreket tekst og se at forklaringer vises.

**Step 6: Commit**

```bash
git add src/components/ui/glossary-term.tsx src/components/wizard/steps/*.tsx src/components/planner/StatsBar.tsx
git commit -m "feat: add glossary tooltips for NAV terminology"
```

---

## Task 6: Legg til velkomst-intro på wizard-start

**Prioritet:** P1 (Høy)
**Persona:** Fatima - "Appen starter rett på uten å forklare hva verktøyet gjør"

**Files:**
- Create: `src/components/wizard/WelcomeIntro.tsx`
- Modify: `src/components/wizard/WizardContainer.tsx`

**Step 1: Opprett WelcomeIntro komponent**

```typescript
// src/components/wizard/WelcomeIntro.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Clock, Calculator } from 'lucide-react';

interface WelcomeIntroProps {
  onStart: () => void;
}

export function WelcomeIntro({ onStart }: WelcomeIntroProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-3">Velkommen til permisjonsplanleggeren</h1>
        <p className="text-muted-foreground text-lg">
          Vi hjelper deg å planlegge foreldrepermisjonen og forstå økonomien.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <Shield className="w-8 h-8 text-green-600 shrink-0" />
            <div>
              <h3 className="font-semibold">Trygt og privat</h3>
              <p className="text-sm text-muted-foreground">
                All informasjon lagres kun på din enhet. Vi sender ingen data til servere.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <Clock className="w-8 h-8 text-blue-600 shrink-0" />
            <div>
              <h3 className="font-semibold">Tar ca 5 minutter</h3>
              <p className="text-sm text-muted-foreground">
                Du kan når som helst lukke og fortsette senere. Fremgangen lagres automatisk.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <Calculator className="w-8 h-8 text-purple-600 shrink-0" />
            <div>
              <h3 className="font-semibold">Se hva du faktisk får</h3>
              <p className="text-sm text-muted-foreground">
                Sammenlign 80% og 100% dekning og finn ut hva som lønner seg for din situasjon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={onStart} size="lg" className="w-full">
        Start planleggingen
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Dette er et planleggingsverktøy. Ha med tallene til samtale med NAV eller arbeidsgiver.
      </p>
    </div>
  );
}
```

**Step 2: Integrer i WizardContainer**

Legg til state for å vise intro:
```typescript
const [showIntro, setShowIntro] = useState(true);
```

Sjekk om bruker har startet før (via persistence):
```typescript
const { hasSavedPlan } = usePersistence();

useEffect(() => {
  if (hasSavedPlan || currentStep > 1) {
    setShowIntro(false);
  }
}, [hasSavedPlan, currentStep]);
```

Vis intro før wizard:
```typescript
if (showIntro) {
  return <WelcomeIntro onStart={() => setShowIntro(false)} />;
}
```

**Step 3: Test intro-flyten**

Run: `bun run dev`
1. Tøm localStorage
2. Naviger til /planlegger
3. Se at intro vises
4. Klikk "Start planleggingen"
5. Se at wizard starter

**Step 4: Commit**

```bash
git add src/components/wizard/WelcomeIntro.tsx src/components/wizard/WizardContainer.tsx
git commit -m "feat: add welcome intro screen before wizard"
```

---

## Task 7: Disable "Neste"-knapp til steg er validert

**Prioritet:** P2 (Middels)
**Persona:** Erik - "Jeg kan klikke meg gjennom uten å fylle ut noe"

**Files:**
- Modify: `src/store/hooks.ts` (useCanProceed)
- Modify: `src/components/wizard/WizardContainer.tsx`

**Step 1: Les og forstå useCanProceed**

Les `src/store/hooks.ts` for å se nåværende implementasjon.

**Step 2: Oppdater WizardContainer til å bruke useCanProceed**

```typescript
const canProceed = useCanProceed();

// I navigation buttons:
<Button
  onClick={nextStep}
  disabled={!canProceed}
  className="flex items-center gap-2"
>
  Neste
  <ChevronRight className="w-4 h-4" />
</Button>
```

**Step 3: Legg til hjelpetekst når disabled**

```typescript
{!canProceed && (
  <p className="text-sm text-amber-600 text-center">
    Fyll ut informasjonen over for å fortsette
  </p>
)}
```

**Step 4: Test validering**

Run: `bun run dev`
1. Start wizard
2. Prøv å klikke "Neste" uten å velge termindato
3. Se at knappen er disabled

**Step 5: Commit**

```bash
git add src/components/wizard/WizardContainer.tsx
git commit -m "feat: disable Next button until step is valid"
```

---

## Task 8: Vis gap-kostnad i kroner

**Prioritet:** P2 (Middels)
**Persona:** Maja - "Gap-advarselen sier uker, men ikke kroner"

**Files:**
- Modify: `src/components/wizard/steps/DaycareStep.tsx`
- Modify: `src/components/wizard/steps/SummaryStep.tsx`

**Step 1: Oppdater DaycareStep med gap-kostnad**

Importer calculateDailyRate fra economy.ts.

Legg til props for å motta økonomi-data:
```typescript
interface DaycareStepProps {
  // ... eksisterende
  motherEconomy?: ParentEconomy;
  fatherEconomy?: ParentEconomy;
}
```

Beregn gap-kostnad:
```typescript
const gapCost = gapDays > 0 && (motherEconomy?.monthlySalary || fatherEconomy?.monthlySalary)
  ? calculateGapCost(
      calculateDailyRate(motherEconomy?.monthlySalary || 0),
      calculateDailyRate(fatherEconomy?.monthlySalary || 0),
      gapDays
    )
  : null;
```

Vis i gap-advarselen:
```typescript
{gapCost && (
  <p className="font-medium text-amber-800 dark:text-amber-200">
    Estimert kostnad: {formatCurrency(gapCost.cost)}
  </p>
)}
```

**Step 2: Test gap-kostnad visning**

Run: `bun run dev`
1. Gå til steg 5 (Barnehage)
2. Aktiver barnehagestart med stort gap
3. Se at kostnad vises i kroner

**Step 3: Commit**

```bash
git add src/components/wizard/steps/DaycareStep.tsx
git commit -m "feat: show gap cost in NOK in DaycareStep"
```

---

## Task 9: Legg til kalender onboarding-overlay

**Prioritet:** P2 (Middels)
**Persona:** Erik - "Kalenderen kan være overveldende"

**Files:**
- Create: `src/components/planner/CalendarOnboarding.tsx`
- Modify: `src/app/planlegger/kalender/page.tsx`

**Step 1: Opprett CalendarOnboarding komponent**

```typescript
// src/components/planner/CalendarOnboarding.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Hand, Palette, Eye } from 'lucide-react';

const ONBOARDING_KEY = 'calendar-onboarding-seen';

export function CalendarOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (!seen) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Slik bruker du kalenderen</CardTitle>
          <Button variant="ghost" size="icon" onClick={dismiss}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Hand className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Dra for å velge dager</p>
              <p className="text-sm text-muted-foreground">
                Hold inne og dra over dagene du vil markere som permisjon, ferie eller annet.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Palette className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Velg type og forelder</p>
              <p className="text-sm text-muted-foreground">
                Bruk verktøylinjen nederst for å velge hvilken type periode og hvilken forelder.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Se hele året</p>
              <p className="text-sm text-muted-foreground">
                Trykk "Oversikt" for å se hele permisjonsperioden i et årskalender-format.
              </p>
            </div>
          </div>

          <Button onClick={dismiss} className="w-full">
            Forstått!
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Legg til i kalender-siden**

I `src/app/planlegger/kalender/page.tsx`:
```typescript
import { CalendarOnboarding } from '@/components/planner/CalendarOnboarding';

// I return:
<>
  <CalendarOnboarding />
  {/* ... resten av kalenderen */}
</>
```

**Step 3: Test onboarding**

Run: `bun run dev`
1. Tøm localStorage
2. Naviger til kalender
3. Se at onboarding vises
4. Klikk "Forstått!"
5. Refresh - onboarding skal ikke vises igjen

**Step 4: Commit**

```bash
git add src/components/planner/CalendarOnboarding.tsx src/app/planlegger/kalender/page.tsx
git commit -m "feat: add calendar onboarding overlay for first-time users"
```

---

## Task 10: Legg til hjelpetekst for enslige foreldre

**Prioritet:** P3 (Lav)
**Persona:** Maja - "Jeg vet ikke hvilke rettigheter jeg har som enslig"

**Files:**
- Modify: `src/components/wizard/steps/RightsStep.tsx`

**Step 1: Legg til info-boks for enslige**

Når "Kun mor" eller "Kun far" er valgt, vis en info-boks:

```typescript
{(value === 'mother-only' || value === 'father-only') && (
  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 flex gap-3">
    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
    <div className="text-sm text-blue-800 dark:text-blue-200">
      <p className="font-medium">Som enslig forelder</p>
      <p className="mt-1">
        Du har rett til hele foreldrepengeperioden inkludert fellesperioden.
        Det betyr {coverage === 100 ? '46' : '56'} uker totalt (pluss 3 uker før termin).
      </p>
    </div>
  </div>
)}
```

**Step 2: Test info-visning**

Run: `bun run dev`
1. Gå til steg 2 (Rettigheter)
2. Velg "Kun mor"
3. Se at info-boksen vises

**Step 3: Commit**

```bash
git add src/components/wizard/steps/RightsStep.tsx
git commit -m "feat: add info box for single parent rights"
```

---

## Oppsummering

| Task | Prioritet | Beskrivelse | Estimat |
|------|-----------|-------------|---------|
| 1 | P0 | economySlice i Zustand | - |
| 2 | P0 | EconomyStep wizard-komponent | - |
| 3 | P0 | Økonomi-visning i SummaryStep | - |
| 4 | P1 | Fiks kalender-instruksjonstekst | - |
| 5 | P1 | Ordforklaringer (GlossaryTerm) | - |
| 6 | P1 | Velkomst-intro | - |
| 7 | P2 | Disable Neste til validert | - |
| 8 | P2 | Gap-kostnad i kroner | - |
| 9 | P2 | Kalender onboarding | - |
| 10 | P3 | Enslig forelder info | - |

**Anbefalt rekkefølge:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

Task 1-3 er kritiske og må gjøres sammen (bygger på hverandre).
Task 4 er en quick fix som kan gjøres når som helst.
Task 5-6 forbedrer onboarding betydelig.
Task 7-10 er polish og kan prioriteres etter behov.

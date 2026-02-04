'use client';

import { useState, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DueDateInput,
  RightsSelector,
  CoverageToggle,
  DistributionSliders,
  DaycareInput,
  VacationInput,
  EconomySection,
} from '@/components/input';
import { CalendarTimeline } from '@/components/timeline';
import { DateSummary, EconomyComparison } from '@/components/results';
import { calculate, getDefaultDaycareStart, getDefaultSharedWeeksToMother } from '@/lib/calculator';
import { LEAVE_CONFIG } from '@/lib/constants';
import type { Coverage, ParentRights, ParentEconomy, VacationWeek, VacationInput as VacationInputType } from '@/lib/types';

// Default økonomi-verdier
const defaultParentEconomy: ParentEconomy = {
  monthlySalary: 0,
  monthlyCommissionLoss: 0,
  employerCoversAbove6G: false,
  employerPaysFeriepenger: false,
};

export default function Home() {
  // Dato-inputs
  const [dueDate, setDueDate] = useState<Date>(() => new Date());
  const [daycareStartDate, setDaycareStartDate] = useState<Date>(() =>
    getDefaultDaycareStart(new Date())
  );

  // Track om bruker har manuelt endret barnehagestart
  const isDaycareManuallySet = useRef(false);

  // Permisjons-config
  const [coverage, setCoverage] = useState<Coverage>(100);
  const [rights, setRights] = useState<ParentRights>('both');
  const [sharedWeeksToMother, setSharedWeeksToMother] = useState<number>(() =>
    getDefaultSharedWeeksToMother(100)
  );
  const [overlapWeeks, setOverlapWeeks] = useState<number>(0);
  const [vacationWeeks] = useState<VacationWeek[]>([]);
  const [vacation, setVacation] = useState<VacationInputType>({
    mother: { daysAfter: 0, duringFatherLeave: false },
    father: { daysBefore: 0, duringMotherLeave: false, daysAfter: 0 },
  });

  // Økonomi
  const [motherEconomy, setMotherEconomy] =
    useState<ParentEconomy>(defaultParentEconomy);
  const [fatherEconomy, setFatherEconomy] =
    useState<ParentEconomy>(defaultParentEconomy);

  // Oppdater default barnehagestart når termindato endres (kun hvis ikke manuelt satt)
  const handleDueDateChange = (date: Date) => {
    setDueDate(date);
    if (!isDaycareManuallySet.current) {
      setDaycareStartDate(getDefaultDaycareStart(date));
    }
  };

  // Når bruker manuelt endrer barnehagestart
  const handleDaycareChange = (date: Date) => {
    isDaycareManuallySet.current = true;
    setDaycareStartDate(date);
  };

  // Oppdater sharedWeeksToMother når coverage endres
  const handleCoverageChange = (newCoverage: Coverage) => {
    setCoverage(newCoverage);
    // Behold ratio hvis mulig
    const oldConfig = LEAVE_CONFIG[coverage];
    const newConfig = LEAVE_CONFIG[newCoverage];
    const ratio = sharedWeeksToMother / oldConfig.shared;
    setSharedWeeksToMother(Math.round(ratio * newConfig.shared));
  };

  // Beregn resultat
  const result = useMemo(() => {
    const hasEconomyData = motherEconomy.monthlySalary > 0;

    return calculate({
      dueDate,
      coverage,
      rights,
      sharedWeeksToMother,
      overlapWeeks,
      daycareStartDate,
      motherEconomy: hasEconomyData ? motherEconomy : undefined,
      fatherEconomy:
        hasEconomyData && rights === 'both' ? fatherEconomy : undefined,
      vacationWeeks,
      vacation,
    });
  }, [
    dueDate,
    coverage,
    rights,
    sharedWeeksToMother,
    overlapWeeks,
    daycareStartDate,
    motherEconomy,
    fatherEconomy,
    vacationWeeks,
    vacation,
  ]);

  const showFather = rights !== 'mother-only';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Permisjonsøkonomi-kalkulator</h1>
          <p className="text-muted-foreground">
            Sammenlign 80% vs 100% foreldrepermisjon
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="calculator" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calculator">Kalkulator</TabsTrigger>
            <TabsTrigger value="about">Om kalkulatoren</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
              {/* Venstre kolonne: Inputs */}
              <div className="space-y-6">
                <DueDateInput value={dueDate} onChange={handleDueDateChange} />

                <RightsSelector value={rights} onChange={setRights} />

                <CoverageToggle
                  value={coverage}
                  onChange={handleCoverageChange}
                />

                <DistributionSliders
                  coverage={coverage}
                  rights={rights}
                  sharedWeeksToMother={sharedWeeksToMother}
                  overlapWeeks={overlapWeeks}
                  onSharedWeeksChange={setSharedWeeksToMother}
                  onOverlapWeeksChange={setOverlapWeeks}
                />

                <DaycareInput
                  value={daycareStartDate}
                  onChange={handleDaycareChange}
                />

                <VacationInput
                  vacation={vacation}
                  onChange={setVacation}
                  rights={rights}
                />

                <EconomySection
                  rights={rights}
                  motherEconomy={motherEconomy}
                  fatherEconomy={fatherEconomy}
                  onMotherEconomyChange={setMotherEconomy}
                  onFatherEconomyChange={setFatherEconomy}
                />
              </div>

              {/* Høyre kolonne: Resultater */}
              <div className="space-y-6">
                <CalendarTimeline result={result.leave} showFather={showFather} dueDate={dueDate} />

                <DateSummary result={result.leave} showFather={showFather} />

                {result.economy && (
                  <EconomyComparison result={result.economy} />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="about" className="prose dark:prose-invert max-w-none">
            <h2>Om kalkulatoren</h2>
            <p>
              Denne kalkulatoren hjelper deg å sammenligne økonomien ved å velge
              80% vs 100% dekningsgrad for foreldrepermisjon.
            </p>

            <h3>Hvorfor dette verktøyet?</h3>
            <p>
              Mange foreldre taper penger (50-100k NOK) ved å velge 80% dekning
              fordi de ikke tar hensyn til:
            </p>
            <ul>
              <li>
                <strong>Gapet:</strong> Perioden mellom permisjonen slutter og
                barnehagen starter (vanligvis 1. august)
              </li>
              <li>
                <strong>6G-taket:</strong> NAV dekker maks 6G (ca. 780 000 kr/år).
                Høytlønnede taper differansen med mindre arbeidsgiver dekker.
              </li>
              <li>
                <strong>Feriepenger:</strong> NAV gir kun feriepengeopptjening
                for de første 12-15 ukene. Resten av permisjonen gir ingen
                opptjening med mindre arbeidsgiver betaler.
              </li>
            </ul>

            <h3>Hvordan bruke kalkulatoren</h3>
            <ol>
              <li>Legg inn termindato</li>
              <li>Velg hvem som har rett til foreldrepenger</li>
              <li>Velg dekningsgrad (100% eller 80%)</li>
              <li>Juster fordeling av fellesperioden</li>
              <li>Sett dato for barnehagestart</li>
              <li>
                (Valgfritt) Legg inn økonomisk informasjon for å se
                sammenligningen
              </li>
            </ol>

            <h3>Grunnbeløpet (G)</h3>
            <p>
              Kalkulatoren bruker G = 130 160 kr (gjeldende fra 1. mai 2025).
              6G = 780 960 kr er maksimalt grunnlag for foreldrepenger.
            </p>

            <h3>Personvern</h3>
            <p>
              All data behandles lokalt i nettleseren din. Ingenting lagres på
              server, og ingen data sendes ut av enheten din.
            </p>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            Dette er et verktøy for illustrasjonsformål. Kontakt NAV for
            offisielle beregninger.
          </p>
        </div>
      </footer>
    </div>
  );
}

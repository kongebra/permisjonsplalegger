'use client';

import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LEAVE_CONFIG } from '@/lib/constants';
import type { Coverage, ParentRights } from '@/lib/types';

interface DistributionStepProps {
  coverage: Coverage;
  rights: ParentRights;
  sharedWeeksToMother: number;
  onChange: (weeks: number) => void;
}

export function DistributionStep({
  coverage,
  rights,
  sharedWeeksToMother,
  onChange,
}: DistributionStepProps) {
  const config = LEAVE_CONFIG[coverage];
  const maxShared = config.shared;
  const sharedWeeksToFather = maxShared - sharedWeeksToMother;

  // Skip if only one parent has rights
  if (rights !== 'both') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Fordeling</h2>
          <p className="text-muted-foreground">
            {rights === 'mother-only'
              ? 'Mor tar hele permisjonen'
              : 'Far tar hele permisjonen'}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-6 bg-muted rounded-lg">
              <p className="text-lg font-semibold">
                {config.total} uker total permisjon
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {rights === 'mother-only'
                  ? 'Inkluderer 3 uker før termin'
                  : 'Far kan starte fra fødsel'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mother's total weeks
  const motherQuota = config.mother;
  const motherTotal = motherQuota + sharedWeeksToMother + config.preBirth;

  // Father's total weeks
  const fatherQuota = config.father;
  const fatherTotal = fatherQuota + sharedWeeksToFather;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Fordel fellesperioden</h2>
        <p className="text-muted-foreground">
          {maxShared} uker kan fordeles fritt mellom foreldrene
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Fellesperiode</CardTitle>
          <CardDescription>
            Dra slideren for å justere fordelingen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Slider
            value={[sharedWeeksToMother]}
            onValueChange={([value]) => onChange(value)}
            max={maxShared}
            min={0}
            step={1}
            className="w-full"
          />

          {/* Visual distribution */}
          <div className="flex gap-2 h-4 rounded-full overflow-hidden">
            <div
              className="bg-pink-400 transition-all"
              style={{ width: `${(sharedWeeksToMother / maxShared) * 100}%` }}
            />
            <div
              className="bg-blue-400 transition-all"
              style={{ width: `${(sharedWeeksToFather / maxShared) * 100}%` }}
            />
          </div>

          {/* Labels */}
          <div className="flex justify-between text-sm">
            <div className="text-center">
              <div className="text-pink-600 dark:text-pink-400 font-semibold">
                Mor: {sharedWeeksToMother} uker
              </div>
            </div>
            <div className="text-center">
              <div className="text-blue-600 dark:text-blue-400 font-semibold">
                Far: {sharedWeeksToFather} uker
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-pink-200 dark:border-pink-800">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Mor totalt</p>
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                {motherTotal} uker
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {config.preBirth} før + {motherQuota} kvote + {sharedWeeksToMother} felles
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Far totalt</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {fatherTotal} uker
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {fatherQuota} kvote + {sharedWeeksToFather} felles
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

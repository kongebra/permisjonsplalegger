'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { ChevronDown, CalendarDays, Users, Percent, Baby, Wallet, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LEAVE_CONFIG } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Coverage, ParentRights, ParentEconomy } from '@/lib/types';
import { useWizard, useEconomy } from '@/store/hooks';
import { usePlannerStore } from '@/store';
import posthog from 'posthog-js';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsSection = 'dueDate' | 'rights' | 'coverage' | 'distribution' | 'daycare' | 'economy' | null;

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const router = useRouter();
  const wizard = useWizard();
  const economy = useEconomy();
  const recalculateFromSettings = usePlannerStore((s) => s.recalculateFromSettings);
  const resetAll = usePlannerStore((s) => s.resetAll);

  // Local settings state (edited in sheet, applied on "Oppdater")
  const [dueDate, setDueDate] = useState(wizard.dueDate);
  const [rights, setRights] = useState(wizard.rights);
  const [coverage, setCoverage] = useState(wizard.coverage);
  const [sharedWeeksToMother, setSharedWeeksToMother] = useState(wizard.sharedWeeksToMother);
  const [daycareEnabled, setDaycareEnabled] = useState(wizard.daycareEnabled);
  const [daycareStartDate, setDaycareStartDate] = useState(wizard.daycareStartDate);
  const [motherEconomy, setMotherEconomy] = useState(economy.motherEconomy);
  const [fatherEconomy, setFatherEconomy] = useState(economy.fatherEconomy);

  // UI state
  const [expandedSection, setExpandedSection] = useState<SettingsSection>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Sync local state when sheet opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setDueDate(wizard.dueDate);
      setRights(wizard.rights);
      setCoverage(wizard.coverage);
      setSharedWeeksToMother(wizard.sharedWeeksToMother);
      setDaycareEnabled(wizard.daycareEnabled);
      setDaycareStartDate(wizard.daycareStartDate);
      setMotherEconomy(economy.motherEconomy);
      setFatherEconomy(economy.fatherEconomy);
      setExpandedSection(null);
    }
    onOpenChange(isOpen);
  }, [wizard, economy, onOpenChange]);

  // Check if changes are "destructive" (require period recalculation)
  const isDestructiveChange =
    dueDate.getTime() !== wizard.dueDate.getTime() ||
    coverage !== wizard.coverage ||
    rights !== wizard.rights ||
    sharedWeeksToMother !== wizard.sharedWeeksToMother;

  const hasChanges =
    isDestructiveChange ||
    daycareEnabled !== wizard.daycareEnabled ||
    daycareStartDate?.getTime() !== wizard.daycareStartDate?.getTime() ||
    JSON.stringify(motherEconomy) !== JSON.stringify(economy.motherEconomy) ||
    JSON.stringify(fatherEconomy) !== JSON.stringify(economy.fatherEconomy);

  // Derive changed fields for analytics (no sensitive data)
  const changedFields = [
    dueDate.getTime() !== wizard.dueDate.getTime() && 'due_date',
    coverage !== wizard.coverage && 'coverage',
    rights !== wizard.rights && 'rights',
    sharedWeeksToMother !== wizard.sharedWeeksToMother && 'distribution',
    daycareEnabled !== wizard.daycareEnabled && 'daycare',
    JSON.stringify(motherEconomy) !== JSON.stringify(economy.motherEconomy) && 'economy',
    JSON.stringify(fatherEconomy) !== JSON.stringify(economy.fatherEconomy) && 'economy',
  ].filter(Boolean) as string[];

  const doApply = useCallback(() => {
    posthog.capture('settings_changed', {
      changed_fields: [...new Set(changedFields)],
    });
    recalculateFromSettings({
      dueDate,
      rights,
      coverage,
      sharedWeeksToMother,
      daycareStartDate,
      daycareEnabled,
      motherEconomy,
      fatherEconomy,
    });
    setShowConfirmDialog(false);
    onOpenChange(false);
  }, [
    changedFields, dueDate, rights, coverage, sharedWeeksToMother,
    daycareStartDate, daycareEnabled, motherEconomy, fatherEconomy,
    recalculateFromSettings, onOpenChange,
  ]);

  const handleApply = useCallback(() => {
    if (isDestructiveChange) {
      setShowConfirmDialog(true);
      return;
    }
    doApply();
  }, [isDestructiveChange, doApply]);

  const handleDeleteData = useCallback(() => {
    resetAll();
    setShowDeleteDialog(false);
    onOpenChange(false);
    router.push('/planlegger');
  }, [resetAll, onOpenChange, router]);

  const toggleSection = (section: SettingsSection) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const config = LEAVE_CONFIG[coverage];

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Innstillinger</SheetTitle>
            <SheetDescription>Endre planens grunnlag</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {/* Due date */}
            <SettingsRow
              icon={<CalendarDays className="w-4 h-4" />}
              label="Termindato"
              value={format(dueDate, 'd. MMM yyyy', { locale: nb })}
              expanded={expandedSection === 'dueDate'}
              onToggle={() => toggleSection('dueDate')}
            >
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => date && setDueDate(date)}
                  locale={nb}
                  captionLayout="dropdown"
                  startMonth={new Date(new Date().getFullYear(), 0)}
                  endMonth={new Date(new Date().getFullYear() + 2, 11)}
                  className="rounded-md border"
                />
              </div>
            </SettingsRow>

            {/* Rights */}
            <SettingsRow
              icon={<Users className="w-4 h-4" />}
              label="Rettigheter"
              value={rights === 'both' ? 'Begge foreldre' : rights === 'mother-only' ? 'Kun mor' : 'Kun far'}
              expanded={expandedSection === 'rights'}
              onToggle={() => toggleSection('rights')}
            >
              <div className="space-y-2">
                {(['both', 'mother-only', 'father-only'] as ParentRights[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRights(r)}
                    className={cn(
                      'w-full p-2.5 rounded-lg border text-left text-sm transition-colors',
                      rights === r ? 'border-primary bg-primary/5 font-medium' : 'border-muted hover:bg-muted/50',
                    )}
                  >
                    {r === 'both' ? 'Begge foreldre' : r === 'mother-only' ? 'Kun mor' : 'Kun far/medmor'}
                  </button>
                ))}
              </div>
            </SettingsRow>

            {/* Coverage */}
            <SettingsRow
              icon={<Percent className="w-4 h-4" />}
              label="Dekningsgrad"
              value={`${coverage}% — ${config.total} uker`}
              expanded={expandedSection === 'coverage'}
              onToggle={() => toggleSection('coverage')}
            >
              <div className="flex gap-2">
                {([100, 80] as Coverage[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCoverage(c);
                      // Adjust shared weeks proportionally
                      const oldConfig = LEAVE_CONFIG[coverage];
                      const newConfig = LEAVE_CONFIG[c];
                      const ratio = sharedWeeksToMother / oldConfig.shared;
                      setSharedWeeksToMother(Math.round(newConfig.shared * ratio));
                    }}
                    className={cn(
                      'flex-1 p-3 rounded-lg border text-center text-sm transition-colors',
                      coverage === c ? 'border-primary bg-primary/5 font-semibold' : 'border-muted hover:bg-muted/50',
                    )}
                  >
                    <div className="text-lg font-bold">{c}%</div>
                    <div className="text-xs text-muted-foreground">{LEAVE_CONFIG[c].total} uker</div>
                  </button>
                ))}
              </div>
            </SettingsRow>

            {/* Distribution (only if both parents) */}
            {rights === 'both' && (
              <SettingsRow
                icon={<Users className="w-4 h-4" />}
                label="Fordeling"
                value={`Mor ${sharedWeeksToMother} + Far ${config.shared - sharedWeeksToMother} uker felles`}
                expanded={expandedSection === 'distribution'}
                onToggle={() => toggleSection('distribution')}
              >
                <div className="space-y-3">
                  <Slider
                    value={[sharedWeeksToMother]}
                    onValueChange={([v]) => setSharedWeeksToMother(v)}
                    max={config.shared}
                    min={0}
                    step={1}
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-mother)] font-medium">
                      Mor: {sharedWeeksToMother} uker
                    </span>
                    <span className="text-[var(--color-father)] font-medium">
                      Far: {config.shared - sharedWeeksToMother} uker
                    </span>
                  </div>
                </div>
              </SettingsRow>
            )}

            {/* Daycare */}
            <SettingsRow
              icon={<Baby className="w-4 h-4" />}
              label="Barnehagestart"
              value={daycareEnabled && daycareStartDate
                ? format(daycareStartDate, 'd. MMM yyyy', { locale: nb })
                : 'Ikke angitt'}
              expanded={expandedSection === 'daycare'}
              onToggle={() => toggleSection('daycare')}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Ta med barnehagestart</Label>
                  <Switch
                    checked={daycareEnabled}
                    onCheckedChange={setDaycareEnabled}
                  />
                </div>
                {daycareEnabled && (
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={daycareStartDate ?? undefined}
                      onSelect={(date) => setDaycareStartDate(date ?? null)}
                      locale={nb}
                      captionLayout="dropdown"
                      defaultMonth={daycareStartDate ?? new Date(dueDate.getFullYear() + 1, 7, 1)}
                      startMonth={dueDate}
                      endMonth={new Date(dueDate.getFullYear() + 3, 11)}
                      disabled={(date) => date < dueDate}
                      className="rounded-md border"
                    />
                  </div>
                )}
              </div>
            </SettingsRow>

            {/* Economy */}
            <SettingsRow
              icon={<Wallet className="w-4 h-4" />}
              label="Økonomi"
              value={motherEconomy.monthlySalary > 0
                ? `Mor ${formatCurrency(motherEconomy.monthlySalary)}/mnd`
                : 'Ikke angitt'}
              expanded={expandedSection === 'economy'}
              onToggle={() => toggleSection('economy')}
            >
              <div className="space-y-3">
                {rights !== 'father-only' && (
                  <ParentEconomyInput
                    label="Mor"
                    economy={motherEconomy}
                    onChange={setMotherEconomy}
                    colorClass="text-[var(--color-mother)]"
                  />
                )}
                {rights !== 'mother-only' && (
                  <ParentEconomyInput
                    label="Far / Medmor"
                    economy={fatherEconomy}
                    onChange={setFatherEconomy}
                    colorClass="text-[var(--color-father)]"
                  />
                )}
              </div>
            </SettingsRow>

          </div>

          {/* Bottom area: delete + update button */}
          <div className="border-t px-4 py-4 space-y-3">
            <Button
              onClick={handleApply}
              disabled={!hasChanges}
              className="w-full"
            >
              Oppdater plan
            </Button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center justify-center gap-2 w-full text-sm text-destructive hover:underline py-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Slett alle data og start på nytt
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation dialog for destructive changes */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Oppdatere plan?</DialogTitle>
            <DialogDescription>
              Endring av {[
                dueDate.getTime() !== wizard.dueDate.getTime() && 'termindato',
                coverage !== wizard.coverage && 'dekningsgrad',
                rights !== wizard.rights && 'rettigheter',
                sharedWeeksToMother !== wizard.sharedWeeksToMother && 'fordeling',
              ].filter(Boolean).join(', ')} oppdaterer alle automatiske permisjonsperioder. Dine egne perioder (ferie, ulønnet permisjon, annet) beholdes, men kan trenge justering.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={doApply}>
              Oppdater
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete data confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slette alle data?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Dette sletter planen din og all informasjon du har lagt inn.
                  Du kommer tilbake til starten og kan begynne på nytt.
                </p>
                <p className="text-xs text-muted-foreground">
                  Ingen data er lagret utenfor nettleseren din. Vi sender ingenting
                  til noen server — alt ligger kun på denne enheten.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDeleteData}>
              Slett og start på nytt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Sub-components ---

function SettingsRow({
  icon,
  label,
  value,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={expanded} onOpenChange={() => onToggle()}>
      <CollapsibleTrigger className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
        <div className="p-1.5 bg-muted rounded-md shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium truncate">{value}</p>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', expanded && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="pt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ParentEconomyInput({
  label,
  economy,
  onChange,
  colorClass,
}: {
  label: string;
  economy: ParentEconomy;
  onChange: (e: ParentEconomy) => void;
  colorClass: string;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-2.5">
      <p className={`text-sm font-semibold ${colorClass}`}>{label}</p>

      <div className="space-y-1">
        <Label className="text-xs">Månedslønn (brutto)</Label>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          value={economy.monthlySalary || ''}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            onChange({ ...economy, monthlySalary: Math.max(0, Number(val)) });
          }}
          placeholder="50 000"
          className="h-8 text-sm"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Dekker jobb over 6G?</Label>
        <div className="flex gap-1 shrink-0">
          <Toggle
            size="sm"
            pressed={economy.employerCoversAbove6G}
            onPressedChange={(pressed) => onChange({ ...economy, employerCoversAbove6G: pressed })}
            className="data-[state=on]:bg-green-600 data-[state=on]:text-white h-6 px-2 text-xs"
          >
            Ja
          </Toggle>
          <Toggle
            size="sm"
            pressed={!economy.employerCoversAbove6G}
            onPressedChange={(pressed) => onChange({ ...economy, employerCoversAbove6G: !pressed })}
            className="data-[state=on]:bg-muted h-6 px-2 text-xs"
          >
            Nei
          </Toggle>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Feriepenger fra arbeidsgiver?</Label>
        <div className="flex gap-1 shrink-0">
          <Toggle
            size="sm"
            pressed={economy.employerPaysFeriepenger}
            onPressedChange={(pressed) => onChange({ ...economy, employerPaysFeriepenger: pressed })}
            className="data-[state=on]:bg-green-600 data-[state=on]:text-white h-6 px-2 text-xs"
          >
            Ja
          </Toggle>
          <Toggle
            size="sm"
            pressed={!economy.employerPaysFeriepenger}
            onPressedChange={(pressed) => onChange({ ...economy, employerPaysFeriepenger: !pressed })}
            className="data-[state=on]:bg-muted h-6 px-2 text-xs"
          >
            Nei
          </Toggle>
        </div>
      </div>
    </div>
  );
}

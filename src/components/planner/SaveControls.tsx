'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePersistence } from '@/store/hooks';
import { Save, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import posthog from 'posthog-js';

export function SaveControls() {
  const {
    hasSavedPlan,
    autoSaveEnabled,
    lastSavedAt,
    savePlan,
    setAutoSaveEnabled,
    resetAll,
  } = usePersistence();

  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleSave = () => {
    posthog.capture('plan_saved', {
      is_first_save: !hasSavedPlan,
    });
    savePlan();
    if (!autoSaveEnabled) {
      setAutoSaveEnabled(true);
    }
  };

  const handleReset = () => {
    posthog.capture('plan_reset');
    resetAll();
    setShowResetDialog(false);
  };

  return (
    <div className="space-y-4">
      {/* Save button */}
      <div className="flex items-center justify-between">
        <Button
          onClick={handleSave}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Lagre plan
        </Button>

        {lastSavedAt && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Sist lagret: {format(lastSavedAt, 'HH:mm', { locale: nb })}
          </span>
        )}
      </div>

      {/* Auto-save toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="auto-save" className="text-sm font-medium">
            Autolagring
          </Label>
          <p className="text-xs text-muted-foreground">
            Lagrer automatisk når du gjør endringer
          </p>
        </div>
        <Switch
          id="auto-save"
          checked={autoSaveEnabled}
          onCheckedChange={setAutoSaveEnabled}
        />
      </div>

      {/* Reset button */}
      {hasSavedPlan && (
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResetDialog(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Start på nytt
          </Button>
        </div>
      )}

      {/* Reset confirmation dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start på nytt?</DialogTitle>
            <DialogDescription>
              Dette vil slette den lagrede planen og alle perioder du har lagt
              til. Denne handlingen kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Slett og start på nytt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

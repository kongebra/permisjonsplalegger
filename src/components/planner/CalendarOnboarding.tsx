'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Hand, Palette, Eye } from 'lucide-react';

const ONBOARDING_KEY = 'calendar-onboarding-seen';
const emptySubscribe = () => () => {};

export function CalendarOnboarding() {
  const shouldShow = useSyncExternalStore(
    emptySubscribe,
    () => { try { return !localStorage.getItem(ONBOARDING_KEY); } catch { return false; } },
    () => false
  );
  const [dismissed, setDismissed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const dismiss = () => {
    try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch { /* private browsing */ }
    setDismissed(true);
  };

  // Fokus-fangst: hindrer Tab fra å nå bakgrunn, Escape lukker
  useEffect(() => {
    if (!shouldShow || dismissed) return;

    const previousFocus = document.activeElement as HTMLElement | null;

    // Fokuser første knapp i modalen ved åpning
    const firstButton = cardRef.current?.querySelector<HTMLElement>('button');
    firstButton?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { dismiss(); return; }
      if (e.key !== 'Tab') return;

      const focusable = cardRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow, dismissed]);

  if (!shouldShow || dismissed) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="max-w-md w-full"
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="onboarding-title">Slik bruker du kalenderen</CardTitle>
          <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Lukk">
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
                Trykk &ldquo;Oversikt&rdquo; for å se hele permisjonsperioden i et årskalender-format.
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

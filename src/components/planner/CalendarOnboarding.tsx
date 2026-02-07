'use client';

import { useState, useSyncExternalStore } from 'react';
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

  const dismiss = () => {
    try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch { /* private browsing */ }
    setDismissed(true);
  };

  if (!shouldShow || dismissed) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Slik bruker du kalenderen</CardTitle>
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

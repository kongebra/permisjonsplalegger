"use client";

import { useState, useEffect } from "react";
import { CalendarCheck } from "lucide-react";

/** Total loader display time in ms — shared with WizardContainer */
export const SETUP_LOADER_DURATION = 2500;

/**
 * Each phase has a message, a progress target (0–100), and a duration.
 * Durations should sum to SETUP_LOADER_DURATION.
 * Non-linear pacing: fast start, slower middle, snappy finish.
 */
const phases = [
  { message: "Beregner perioder...",       target: 40,  duration: 700  },
  { message: "Setter opp kalenderen...",   target: 85,  duration: 1200 },
  { message: "Snart klar!",               target: 100, duration: 600  },
];

export function SetupLoader() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Kick off first phase immediately
    setProgress(phases[0].target);

    let elapsed = phases[0].duration;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 1; i < phases.length; i++) {
      const idx = i;
      timers.push(
        setTimeout(() => {
          setPhaseIndex(idx);
          setProgress(phases[idx].target);
        }, elapsed),
      );
      elapsed += phases[idx].duration;
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  const phase = phases[phaseIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <CalendarCheck className="w-12 h-12 text-primary animate-bounce" />
        <p className="text-lg font-medium text-foreground">{phase.message}</p>
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{
              width: `${progress}%`,
              transition: `width ${phases[phaseIndex].duration}ms ease-in-out`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

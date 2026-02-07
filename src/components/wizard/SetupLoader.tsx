"use client";

import { useState, useEffect, type ComponentType } from "react";
import { Baby, CalendarHeart, PartyPopper } from "lucide-react";

/** Total loader display time in ms — shared with WizardContainer */
export const SETUP_LOADER_DURATION = 2500;

/**
 * Each phase has a message, icon, progress target (0–100), and a duration.
 * Durations should sum to SETUP_LOADER_DURATION.
 * Non-linear pacing: fast start, slower middle, snappy finish.
 */
const phases: {
  message: string;
  icon: ComponentType<{ className?: string }>;
  target: number;
  duration: number;
}[] = [
  { message: "Beregner perioder...",       icon: Baby,          target: 40,  duration: 700  },
  { message: "Setter opp kalenderen...",   icon: CalendarHeart, target: 85,  duration: 1200 },
  { message: "Snart klar!",               icon: PartyPopper,   target: 100, duration: 600  },
];

export function SetupLoader() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  // Track previous phase for crossfade-out
  const [prevPhaseIndex, setPrevPhaseIndex] = useState<number | null>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Kick off first phase animation on next frame
    timers.push(setTimeout(() => setProgress(phases[0].target), 20));

    let elapsed = phases[0].duration;
    for (let i = 1; i < phases.length; i++) {
      const idx = i;
      timers.push(
        setTimeout(() => {
          setPrevPhaseIndex(idx - 1);
          setPhaseIndex(idx);
          setProgress(phases[idx].target);
        }, elapsed),
      );
      // Clear prev icon after crossfade completes
      timers.push(
        setTimeout(() => setPrevPhaseIndex(null), elapsed + 300),
      );
      elapsed += phases[idx].duration;
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  const phase = phases[phaseIndex];
  const Icon = phase.icon;
  const PrevIcon = prevPhaseIndex !== null ? phases[prevPhaseIndex].icon : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Icon container with crossfade */}
        <div className="relative w-12 h-12">
          {/* Outgoing icon */}
          {PrevIcon && (
            <PrevIcon
              className="absolute inset-0 w-12 h-12 text-primary animate-[fadeScaleOut_300ms_ease-in-out_forwards]"
            />
          )}
          {/* Incoming icon */}
          <Icon
            key={phaseIndex}
            className="absolute inset-0 w-12 h-12 text-primary animate-[fadeScaleIn_400ms_ease-out_forwards]"
          />
        </div>

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

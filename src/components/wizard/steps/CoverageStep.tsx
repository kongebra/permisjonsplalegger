"use client";

import { cn } from "@/lib/utils";
import { LEAVE_CONFIG, G } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { Coverage } from "@/lib/types";
import { Percent, Clock } from "lucide-react";
import { GlossaryTerm } from "@/components/ui/glossary-term";

interface CoverageStepProps {
  value: Coverage;
  onChange: (value: Coverage) => void;
}

const coverageOptions: {
  value: Coverage;
  percentage: string;
  weeks: number;
  description: string;
  pros: string[];
  cons: string[];
}[] = [
  {
    value: 100,
    percentage: "100%",
    weeks: LEAVE_CONFIG[100].total,
    description: `Full lønn (maks 6G ≈ ${formatCurrency(6 * G)}/år)`,
    pros: ["Høyere månedlig utbetaling", "Mindre økonomisk stress"],
    cons: ["Kortere permisjon", "Større gap før barnehage"],
  },
  {
    value: 80,
    percentage: "80%",
    weeks: LEAVE_CONFIG[80].total,
    description: `80% av lønn (maks 6G ≈ ${formatCurrency(6 * G)}/år)`,
    pros: ["Lengre tid hjemme med barnet", "Mindre gap før barnehage"],
    cons: ["Lavere månedlig utbetaling", "Lavere utbetaling per måned"],
  },
];

export function CoverageStep({ value, onChange }: CoverageStepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          Velg <GlossaryTerm term="dekningsgrad">dekningsgrad</GlossaryTerm>
        </h2>
        <p className="text-muted-foreground">
          NAV utbetaler det samme totalt — men gapet og feriepenger gjør at én
          kan lønne seg
        </p>
      </div>

      <div
        className="grid gap-4 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Velg dekningsgrad"
      >
        {coverageOptions.map((option) => (
          <button
            key={option.value}
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "w-full p-4 rounded-lg border-2 text-left transition-all",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              value === option.value
                ? "border-primary bg-primary/5"
                : "border-muted bg-card",
            )}
          >
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent
                    className={cn(
                      "w-5 h-5",
                      value === option.value
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="text-2xl font-bold">
                    {option.percentage}
                  </span>
                </div>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    value === option.value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground",
                  )}
                >
                  {value === option.value && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{option.weeks} uker permisjon</span>
              </div>

              {/* Description */}
              {/* <p className="text-sm text-muted-foreground">
                {option.description}
              </p> */}

              {/* Pros/Cons */}
              {/* <div className="space-y-2 pt-2 border-t">
                <div className="space-y-1">
                  {option.pros.map((pro, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">+</span>
                      <span>{pro}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {option.cons.map((con, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span className="text-orange-500">-</span>
                      <span>{con}</span>
                    </div>
                  ))}
                </div>
              </div> */}
            </div>
          </button>
        ))}
      </div>

      {/* Visual timeline comparison */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground text-center">
          Tidslinje-sammenligning
        </p>
        {/* 100% bar */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 h-6">
            <div
              className={cn(
                "h-full rounded-l-sm text-[10px] font-medium flex items-center justify-center text-white",
                value === 100 ? "bg-primary" : "bg-muted-foreground/40",
              )}
              style={{
                width: `${(LEAVE_CONFIG[100].total / LEAVE_CONFIG[80].total) * 100}%`,
              }}
            >
              {LEAVE_CONFIG[100].total} uker
            </div>
            <div className="h-full flex-1 rounded-r-sm bg-warning-bg border border-dashed border-warning-fg/30 text-[10px] flex items-center justify-center text-warning-fg">
              <GlossaryTerm term="gap">Gap</GlossaryTerm>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">100% dekning</p>
        </div>
        {/* 80% bar */}
        <div className="space-y-1">
          <div className="flex items-center h-6">
            <div
              className={cn(
                "h-full rounded-sm w-full text-[10px] font-medium flex items-center justify-center text-white",
                value === 80 ? "bg-primary" : "bg-muted-foreground/40",
              )}
            >
              {LEAVE_CONFIG[80].total} uker
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">80% dekning</p>
        </div>
      </div>
    </div>
  );
}

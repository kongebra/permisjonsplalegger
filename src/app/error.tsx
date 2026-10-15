"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePlannerStore } from "@/store";
import { STORAGE_KEY } from "@/store/slices/persistenceSlice";

/**
 * Feilgrense for alle sider under rot-layouten. Erstatter Nexts engelske
 * standardside, logger feilen og lar brukeren komme seg videre uten å tømme
 * nettleserdata for hånd.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[feilgrense]", error);
    try {
      posthog.captureException(error);
    } catch {
      // Analyse skal aldri gjøre feilsiden verre
    }
  }, [error]);

  const handleStartOver = () => {
    try {
      // Samme nullstilling som "Slett alle data" i innstillingene: tømmer både
      // tilstanden i minnet og den lagrede planen
      usePlannerStore.getState().resetAll();
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Privat modus eller blokkert lagring: vi kommer oss videre uansett
      }
    }
    router.push("/planlegger");
  };

  return (
    <main id="main" className="container mx-auto max-w-lg px-4 py-16">
      <div role="alert" className="space-y-4 text-center">
        <TriangleAlert
          className="mx-auto h-10 w-10 text-warning-fg"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold">Noe gikk galt</h1>
        <p className="text-muted-foreground">
          Siden kunne ikke vises. Prøv igjen, eller start på nytt hvis det
          fortsetter.
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={reset}>Prøv igjen</Button>
        <Button variant="outline" onClick={handleStartOver}>
          Start på nytt (sletter lagret plan)
        </Button>
      </div>
    </main>
  );
}

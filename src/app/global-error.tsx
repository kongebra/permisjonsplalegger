"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import "./globals.css";

/**
 * Siste skanse hvis selve rot-layouten feiler. Erstatter Nexts engelske
 * standardside og logger feilen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-feilgrense]", error);
    try {
      posthog.captureException(error);
    } catch {
      // Analyse skal aldri gjøre feilsiden verre
    }
  }, [error]);

  return (
    <html lang="nb">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <main id="main" className="mx-auto max-w-lg px-4 py-16 text-center">
          <div role="alert" className="space-y-4">
            <h1 className="text-2xl font-bold">Noe gikk galt</h1>
            <p className="text-muted-foreground">
              Siden kunne ikke vises. Prøv igjen om litt.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-8 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Prøv igjen
          </button>
        </main>
      </body>
    </html>
  );
}

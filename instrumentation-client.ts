import posthog from "posthog-js";

// Uten nøkkel (lokal utvikling og e2e) hoppes init over, ellers logger PostHog
// en feil om manglende token ved hver sidelasting.
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2025-11-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
    // Privacy: no session recording, no autocapture, respect Do Not Track
    disable_session_recording: true,
    autocapture: false,
    respect_dnt: true,
    persistence: "memory",
    person_profiles: "identified_only",
  });
}

// IMPORTANT: Never combine this approach with other client-side PostHog
// initialization approaches, especially components like a PostHogProvider.
// instrumentation-client.ts is the correct solution for initializing
// client-side PostHog in Next.js 15.3+ apps.

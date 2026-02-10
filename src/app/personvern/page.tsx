import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Personvern",
  description:
    "Personvernerklæring for Permisjonsøkonomi-kalkulator. Les om hvordan vi behandler dine data.",
  alternates: {
    canonical: "https://perm-planlegger.vercel.app/personvern",
  },
};

export default function PersonvernPage() {
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <main id="main" className="container mx-auto max-w-2xl px-4 py-8 flex-1">
        <h1 className="text-3xl font-bold mb-6">Personvernerklæring</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <p>
            Denne personvernerklæringen beskriver hvordan Permisjonsøkonomi-kalkulator
            behandler informasjon. Vi tar personvernet ditt på alvor.
          </p>

          <h2 className="text-xl font-semibold mt-8">1. Ingen personopplysninger lagres hos oss</h2>
          <p>
            All informasjon du legger inn (lønn, termin, permisjonsvalg) lagres <strong>kun
            lokalt i nettleseren din</strong> via localStorage. Vi har ingen database,
            ingen brukerkontoer og ingen server som mottar dataene dine.
          </p>

          <h2 className="text-xl font-semibold mt-8">2. Anonym bruksstatistikk</h2>
          <p>
            Vi bruker <strong>PostHog</strong> (EU-basert, GDPR-kompatibel) for å samle
            anonym bruksstatistikk. Dette hjelper oss å forbedre tjenesten.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ingen session-opptak</li>
            <li>Ingen automatisk innsamling av klikk eller skjemadata</li>
            <li>Respekterer Do Not Track (DNT)</li>
            <li>Ingen lagring i nettleseren (kun i minne per besøk)</li>
            <li>IP-adresser anonymiseres</li>
            <li>Data lagres i EU (Frankfurt)</li>
          </ul>
          <p>
            Vi samler kun inn hendelser som &quot;wizard startet&quot; og
            &quot;økonomi-fanen vist&quot; for å forstå hvilke funksjoner som brukes.
          </p>

          <h2 className="text-xl font-semibold mt-8">3. Informasjonskapsler (cookies)</h2>
          <p>
            Vi bruker <strong>ingen informasjonskapsler</strong> og lagrer ingen
            analytics-data i nettleseren din. PostHog bruker kun minne (memory) som
            forsvinner når du lukker fanen.
          </p>

          <h2 className="text-xl font-semibold mt-8">4. Lokal lagring (localStorage)</h2>
          <p>
            Vi bruker localStorage kun for å lagre permisjonsplanen din
            (<code>permisjonsplan-v1</code>) slik at du kan fortsette der du slapp.
            Du kan slette dette når som helst via nettleserens innstillinger.
          </p>

          <h2 className="text-xl font-semibold mt-8">5. Dine rettigheter</h2>
          <p>Siden vi ikke lagrer personopplysninger, er det ingen data å be om innsyn i
            eller sletting av. For å fjerne lokalt lagret data:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Åpne nettleserens innstillinger</li>
            <li>Slett nettstedsdata for denne siden</li>
          </ol>

          <h2 className="text-xl font-semibold mt-8">6. Kontakt</h2>
          <p>
            Spørsmål om personvern kan rettes til prosjektet via{" "}
            <a
              href="https://github.com/kongebra/permisjonsplalegger/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              GitHub Issues
            </a>
            .
          </p>

          <p className="text-muted-foreground text-xs mt-8">
            Sist oppdatert: Februar 2026
          </p>
        </div>

        <div className="mt-8">
          <Link href="/planlegger" className="text-primary underline text-sm">
            &larr; Tilbake til kalkulatoren
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

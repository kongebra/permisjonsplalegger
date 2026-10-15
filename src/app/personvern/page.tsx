import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Personvernerklæring",
  description:
    "Slik behandler Permisjonsøkonomi-kalkulator data. All informasjon lagres lokalt i nettleseren. Anonym statistikk via PostHog (EU).",
  alternates: {
    canonical: "https://perm-planlegger.vercel.app/personvern",
  },
};

export default function PersonvernPage() {
  return (
    <>
      <SiteHeader showCta />
      <div className="bg-background">
      <main id="main" className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Personvernerklæring</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Publisert <time dateTime="2025-12-01">1. desember 2025</time>
          {" "}&middot;{" "}
          Oppdatert <time dateTime="2026-02-11">11. februar 2026</time>
        </p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <p>
            Denne personvernerklæringen beskriver hvordan Permisjonsøkonomi-kalkulator
            behandler informasjon. Vi tar personvernet ditt på alvor og har designet
            tjenesten med dataminimering som grunnprinsipp.
          </p>

          <h2 className="text-xl font-semibold mt-8">1. Databehandling og lagring</h2>
          <p>
            All informasjon du legger inn (lønn, termindato, permisjonsvalg) lagres <strong>kun
            lokalt i nettleseren din</strong> via localStorage. Vi har verken database,
            brukerkontoer eller servere som mottar opplysningene dine. Dataene forlater
            aldri enheten din.
          </p>

          <h2 className="text-xl font-semibold mt-8">2. Anonym bruksstatistikk</h2>
          <p>
            Vi bruker <strong>PostHog</strong> (EU-basert, GDPR-kompatibel) for å samle
            anonym bruksstatistikk. Dette hjelper oss å forbedre tjenesten ved å forstå
            hvilke funksjoner som brukes og hvor brukere eventuelt møter problemer.
          </p>
          <p>Konfigurasjon og begrensninger:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Datalagring kun i minne (forsvinner når fanen lukkes)</li>
            <li>Respekterer Do Not Track (DNT)-innstillingen i nettleseren</li>
            <li>Automatisk innsamling av klikk og skjemadata er deaktivert</li>
            <li>Session-opptak er deaktivert</li>
            <li>IP-adresser anonymiseres</li>
            <li>Data lagres i EU (Frankfurt, Tyskland)</li>
          </ul>
          <p>Eksempler på hendelser vi registrerer:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>&laquo;Veiviser startet&raquo; &ndash; at noen begynte planleggingen</li>
            <li>&laquo;Veiviser fullført&raquo; &ndash; at noen fullførte alle steg</li>
            <li>&laquo;Økonomi-fanen vist&raquo; &ndash; at noen åpnet sammenligningen</li>
          </ul>
          <p>
            Vi registrerer aldri beløp, datoer, navn eller andre opplysninger som kan
            knyttes til enkeltpersoner.
          </p>

          <h2 className="text-xl font-semibold mt-8">3. Informasjonskapsler (cookies)</h2>
          <p>
            Vi bruker <strong>verken informasjonskapsler (cookies) eller lignende
            sporingsmekanismer</strong>. PostHog-klienten bruker kun minne (memory)
            som automatisk tømmes når du lukker fanen eller nettleseren.
          </p>

          <h2 className="text-xl font-semibold mt-8">4. Lokal lagring (localStorage)</h2>
          <p>
            Vi bruker localStorage kun for å lagre permisjonsplanen din
            (<code>permisjonsplan-v1</code>) slik at du kan fortsette der du slapp.
            Denne lagringen skjer utelukkende i din nettleser og sendes aldri til oss.
            Du kan slette dataene når som helst via nettleserens innstillinger.
          </p>

          <h2 className="text-xl font-semibold mt-8">5. Tredjepartstjenester</h2>
          <p>Følgende tredjepartstjenester benyttes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Vercel</strong> &ndash; Hosting og distribusjon av nettsiden.
              Vercel behandler IP-adresser og standard HTTP-metadata for å levere
              innhold. Se{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Vercels personvernerklæring
              </a>.
            </li>
            <li>
              <strong>PostHog (EU)</strong> &ndash; Anonym bruksstatistikk som
              beskrevet i punkt 2 ovenfor. Se{" "}
              <a
                href="https://posthog.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                PostHogs personvernerklæring
              </a>.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">6. Dine rettigheter etter GDPR</h2>
          <p>
            Ettersom vi ikke lagrer personopplysninger på våre servere, har vi
            heller ingen data å gi innsyn i eller slette. Dersom du likevel
            ønsker å utøve dine rettigheter etter personvernforordningen
            (GDPR), har du krav på:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Rett til innsyn</strong> &ndash; Be om oversikt over data vi behandler</li>
            <li><strong>Rett til retting</strong> &ndash; Krev at uriktige opplysninger rettes</li>
            <li><strong>Rett til sletting</strong> &ndash; Be om at data fjernes</li>
            <li><strong>Rett til dataportabilitet</strong> &ndash; Få utlevert data i et maskinlesbart format</li>
            <li><strong>Rett til å protestere</strong> &ndash; Protest mot vår behandling av data</li>
          </ul>
          <p>For å fjerne lokalt lagret data fra nettleseren:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Åpne nettleserens innstillinger</li>
            <li>Slett nettstedsdata for denne siden</li>
          </ol>

          <h2 className="text-xl font-semibold mt-8">7. Endringer i denne erklæringen</h2>
          <p>
            Denne personvernerklæringen oppdateres ved behov, for eksempel
            ved endringer i funksjonalitet eller regelverk. Vesentlige endringer
            markeres med oppdatert dato nederst på denne siden.
          </p>

          <h2 className="text-xl font-semibold mt-8">8. Kontakt</h2>
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
          <Link href="/" className="text-primary underline text-sm">
            &larr; Forsiden
          </Link>
        </div>
      </main>
    </div>
    </>
  );
}

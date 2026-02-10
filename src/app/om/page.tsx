import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Om",
  description:
    "Om Permisjonsøkonomi-kalkulator. Et gratis, privat verktøy for norske foreldre som planlegger foreldrepermisjon.",
  alternates: {
    canonical: "https://perm-planlegger.vercel.app/om",
  },
};

export default function OmPage() {
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <main id="main" className="container mx-auto max-w-2xl px-4 py-8 flex-1">
        <h1 className="text-3xl font-bold mb-6">Om Permisjonsøkonomi-kalkulator</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <h2 className="text-xl font-semibold mt-8">Hvorfor dette verktøyet?</h2>
          <p>
            De fleste norske foreldre står overfor et viktig valg: 80% eller 100%
            dekningsgrad på foreldrepengen? Svaret er sjelden opplagt fordi flere
            faktorer spiller inn:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Gapet:</strong> Den ubetalte perioden mellom permisjonsslutt og
              barnehagestart (vanligvis 1. august)
            </li>
            <li>
              <strong>6G-taket:</strong> NAV dekker kun inntekt opp til 6G
              ({new Intl.NumberFormat("nb-NO").format(130160 * 6)} kr i 2025)
            </li>
            <li>
              <strong>Feriepenger:</strong> Stor reduksjon i år 2 hvis NAV betaler i
              stedet for arbeidsgiver
            </li>
          </ul>
          <p>
            Denne kalkulatoren hjelper deg å se totalbildet, slik at du kan ta et
            informert valg.
          </p>

          <h2 className="text-xl font-semibold mt-8">Personvern først</h2>
          <p>
            All informasjon du legger inn lagres kun lokalt i nettleseren din. Vi har
            ingen database, ingen brukerkontoer og sender ingen personopplysninger til
            noen server. Les mer i vår{" "}
            <Link href="/personvern" className="text-primary underline">
              personvernerklæring
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold mt-8">Åpen kildekode</h2>
          <p>
            Prosjektet er åpen kildekode og tilgjengelig på{" "}
            <a
              href="https://github.com/kongebra/permisjonsplalegger"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              GitHub
            </a>
            . Du kan inspisere koden, rapportere feil eller bidra til forbedringer.
          </p>

          <h2 className="text-xl font-semibold mt-8">Beregningsgrunnlag</h2>
          <p>
            Kalkulatoren bruker offentlig tilgjengelige satser og regler fra NAV.
            Grunnbeløpet (G) oppdateres årlig. Beregningene tar hensyn til:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>49 uker ved 100% dekning / 59 uker ved 80% dekning</li>
            <li>Inntekt opp til 6G (med mulighet for arbeidsgiverdekning utover)</li>
            <li>Feriepenger fra NAV vs. arbeidsgiver</li>
            <li>Tap av variable tillegg i permisjonsperioden</li>
          </ul>

          <div className="rounded-lg bg-warning-bg border border-warning-fg/20 px-3.5 py-3 mt-8">
            <h2 className="text-base font-semibold text-foreground mb-2">
              Viktig forbehold
            </h2>
            <ul className="list-disc list-inside space-y-1 text-xs text-warning-fg">
              <li>Dette er <strong>ikke</strong> en offentlig tjeneste fra NAV</li>
              <li>Kalkulatoren er laget av privatpersoner og kan inneholde feil</li>
              <li>Sjekk alltid med NAV for rettigheter og nøyaktige beløp</li>
              <li>Regler og satser kan endre seg uten forvarsel</li>
            </ul>
          </div>
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

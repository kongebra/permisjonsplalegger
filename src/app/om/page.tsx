import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: "Om kalkulatoren",
  description:
    "Gratis verktøy for norske foreldre som sammenligner 80% og 100% foreldrepermisjon. Beregn gapet før barnehagestart, feriepenger og 6G-effekten.",
  alternates: {
    canonical: "https://perm-planlegger.vercel.app/om",
  },
};

export default function OmPage() {
  return (
    <>
    <SiteHeader showCta />
    <div className="bg-background">
      <main id="main" className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Om Permisjonsøkonomi-kalkulator</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Skrevet av teamet bak Permisjonsøkonomi-kalkulator
          {" "}&middot;{" "}
          Publisert <time dateTime="2025-12-01">1. desember 2025</time>
          {" "}&middot;{" "}
          Oppdatert <time dateTime="2026-02-11">11. februar 2026</time>
        </p>

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
            Denne kalkulatoren hjelper deg med å se totalbildet, slik at du kan ta et
            informert valg basert på din families situasjon.
          </p>

          <h2 className="text-xl font-semibold mt-8">Hvem er dette for?</h2>
          <p>
            Verktøyet er laget for vordende og nybakte foreldre i Norge som ønsker
            bedre oversikt over de økonomiske konsekvensene av permisjonsvalget.
            Enten du er førstegangsfødende eller venter barn nummer to, kan
            kalkulatoren gi deg nyttig innsikt. Den er spesielt verdifull hvis:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Du har inntekt over 6G og lurer på hvordan taket påvirker utbetalingene</li>
            <li>Du er usikker på hvor lenge du blir uten inntekt før barnehageplass</li>
            <li>Du ønsker å sammenligne ulike fordelinger av permisjonsukene</li>
            <li>Du vil forstå feriepenge-effekten av NAV-utbetalinger vs. arbeidsgiverdekning</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">Slik fungerer kalkulatoren</h2>
          <p>
            Du fyller inn grunnleggende opplysninger i en veiviser med åtte steg:
            termindato, hvem som har rett på foreldrepenger, dekningsgrad, fordeling
            av fellesperioden, forventet barnehagestart, jobbinnstillinger, og
            en økonomisk oppsummering. Basert på dette genereres en interaktiv
            kalender der du kan justere perioder og se den økonomiske sammenligningen
            mellom 80% og 100% dekning i sanntid.
          </p>

          <h2 className="text-xl font-semibold mt-8">Personvern først</h2>
          <p>
            All informasjon du legger inn lagres kun lokalt i nettleseren din. Vi har
            ingen database, ingen brukerkontoer og sender ingen personopplysninger
            over nett. Les mer i vår{" "}
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
            . Du kan inspisere koden, rapportere feil eller bidra med forbedringer.
          </p>

          <h2 className="text-xl font-semibold mt-8">Beregningsgrunnlag</h2>
          <p>
            Kalkulatoren bruker offentlig tilgjengelige satser og regler fra NAV.
            Grunnbeløpet (G) oppdateres årlig. Beregningene tar hensyn til følgende:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>49 uker ved 100% dekning / 59 uker ved 80% dekning</li>
            <li>Inntekt opp til 6G (med mulighet for arbeidsgiverdekning utover)</li>
            <li>Feriepenger fra NAV vs. arbeidsgiver</li>
            <li>Tap av variable tillegg i permisjonsperioden</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">Kontakt oss</h2>
          <p>
            Har du spørsmål, funnet en feil, eller har forslag? Opprett gjerne en
            sak på{" "}
            <a
              href="https://github.com/kongebra/permisjonsplalegger/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              GitHub Issues
            </a>
            . Vi setter pris på alle tilbakemeldinger som gjør verktøyet bedre
            for norske familier.
          </p>

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
          <Link href="/" className="text-primary underline text-sm">
            &larr; Forsiden
          </Link>
        </div>
      </main>
    </div>
    </>
  );
}

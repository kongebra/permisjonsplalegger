import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle, Clock, Shield } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Permisjonsplanleggeren — få kabalen til å gå opp',
  description:
    'Gratis verktøy som hjelper deg planlegge foreldrepermisjonen. Se om permisjonen rekker til barnehagestart, forstå familiens økonomi måned for måned, og finn ut om 80% eller 100% passer best.',
};

const benefits = [
  {
    icon: CheckCircle,
    heading: 'Rekker permisjonen til barnehagestart?',
    body: 'Se gapet mellom permisjonsslutt og barnehagestart — og planlegg ferie eller ulønnet for å tette det.',
  },
  {
    icon: CheckCircle,
    heading: 'Hva har familien i inntekt under permisjon?',
    body: 'Se månedlig inntekt for mor og far under hele permisjonsperioden — ikke bare et totaltall.',
  },
  {
    icon: CheckCircle,
    heading: 'Burde vi velge 80% eller 100%?',
    body: '80% gir 10 uker lengre permisjon, 100% gir høyere månedlig utbetaling. Vi viser hva som faktisk lønner seg for dere.',
  },
];

export default function Home() {
  return (
    <>
    <SiteHeader />
    <main id="main" className="container mx-auto px-4 py-12 max-w-2xl">
      {/* Hero */}
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">
          Få kabalen til å gå opp
        </h1>
        <p className="text-xl text-muted-foreground">
          Planlegg foreldrepermisjonen — permisjon, barnehage og økonomi samlet på ett sted.
        </p>
        <Link
          href="/planlegger"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-8 py-3 text-base font-semibold hover:bg-primary/90 transition-colors mt-2"
        >
          Start planleggingen — gratis
        </Link>
        <p className="text-sm text-muted-foreground">
          Ingen innlogging. Ingen konto. Tar ca 5 minutter.
        </p>
      </div>

      {/* Fordeler */}
      <div className="space-y-6 mb-12">
        {benefits.map((b) => (
          <div key={b.heading} className="flex gap-4">
            <b.icon className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-lg mb-1">{b.heading}</h2>
              <p className="text-muted-foreground">{b.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tillit-signaler */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm text-muted-foreground border-t pt-8">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 shrink-0" />
          <span>Ingen data sendes til server — alt lagres lokalt</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          <span>Ikke tilknyttet NAV — beregningene er veiledende</span>
        </div>
      </div>
    </main>
    </>
  );
}

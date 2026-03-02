import Link from 'next/link';

interface SiteHeaderProps {
  showCta?: boolean;
}

export function SiteHeader({ showCta = false }: SiteHeaderProps) {
  return (
    <header className="border-b py-3 px-4">
      <div className="container mx-auto max-w-2xl flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold hover:text-primary transition-colors"
        >
          Permisjonsplanleggeren
        </Link>
        {showCta && (
          <Link
            href="/planlegger"
            className="text-sm text-primary hover:underline"
          >
            Til planleggeren →
          </Link>
        )}
      </div>
    </header>
  );
}

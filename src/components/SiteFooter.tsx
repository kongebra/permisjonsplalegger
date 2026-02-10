import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t py-6 text-center text-xs text-muted-foreground">
      <nav aria-label="Bunntekst" className="flex flex-wrap justify-center gap-4 mb-2">
        <Link href="/om" className="hover:underline">
          Om oss
        </Link>
        <Link href="/personvern" className="hover:underline">
          Personvern
        </Link>
        <a
          href="https://github.com/kongebra/permisjonsplalegger"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          GitHub
        </a>
      </nav>
      <p>&copy; {new Date().getFullYear()} Permisjonsøkonomi-kalkulator</p>
    </footer>
  );
}

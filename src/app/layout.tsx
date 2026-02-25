import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://perm-planlegger.vercel.app";
const siteDescription =
  "Gratis verktøy for å planlegge foreldrepermisjon. Se om permisjonen rekker til barnehagestart, finn ut familiens månedlige økonomi under permisjon, og velg mellom 80% og 100% basert på hva som faktisk passer dere.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Permisjonsplanleggeren",
    template: "%s | Permisjonsplanleggeren",
  },
  description: siteDescription,
  keywords: [
    "foreldrepermisjon",
    "permisjonsplanlegging",
    "barnehagestart og foreldrepermisjon",
    "80% vs 100% foreldrepermisjon",
    "burde jeg velge 80 eller 100 prosent",
    "økonomi foreldrepermisjon",
    "NAV foreldrepenger",
    "permisjon kalkulator",
    "permisjon barnehage gap",
    "familieøkonomi permisjon",
  ],
  openGraph: {
    type: "website",
    locale: "no_NO",
    siteName: "Permisjonsplanleggeren",
    title: "Permisjonsplanleggeren",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Permisjonsplanleggeren",
    description: siteDescription,
  },
  other: {
    "theme-color": "oklch(0.985 0.005 80)",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Permisjonsplanleggeren",
  description: siteDescription,
  url: siteUrl,
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "NOK" },
  inLanguage: "no",
  datePublished: "2025-12-01",
  dateModified: "2026-02-25",
  author: {
    "@type": "Organization",
    name: "Permisjonsplanleggeren",
    url: `${siteUrl}/om`,
  },
  publisher: {
    "@type": "Organization",
    name: "Permisjonsplanleggeren",
    url: `${siteUrl}/om`,
    contactPoint: {
      "@type": "ContactPoint",
      url: "https://github.com/kongebra/permisjonsplalegger/issues",
      contactType: "customer support",
    },
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh flex flex-col`}
      >
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-background focus:text-foreground">
          Hopp til hovedinnhold
        </a>
        <div className="flex-1">
          <Providers>{children}</Providers>
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}

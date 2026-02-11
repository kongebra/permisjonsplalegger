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
  "Gratis kalkulator som sammenligner 80% og 100% foreldrepermisjon. Se hvordan gapet mellom permisjon og barnehagestart, feriepenger og 6G-taket påvirker familiens økonomi.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Permisjonsøkonomi-kalkulator",
    template: "%s | Permisjonsøkonomi-kalkulator",
  },
  description: siteDescription,
  keywords: [
    "foreldrepenger",
    "foreldrepermisjon",
    "NAV",
    "80% vs 100%",
    "permisjonskalkulator",
    "feriepenger",
    "6G",
    "barnehagestart",
    "gapet",
    "permisjon økonomi",
  ],
  openGraph: {
    type: "website",
    locale: "no_NO",
    siteName: "Permisjonsøkonomi-kalkulator",
    title: "Permisjonsøkonomi-kalkulator",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Permisjonsøkonomi-kalkulator",
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
  name: "Permisjonsøkonomi-kalkulator",
  description: siteDescription,
  url: siteUrl,
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "NOK" },
  inLanguage: "no",
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

# Design: Site-wide navigasjon for info-sider

**Dato:** 2026-02-26
**Status:** Godkjent

## Problem

Brukere som starter på landingssiden (`/`) og klikker en footer-lenke (f.eks. "Om oss") ender opp på `/om` uten en tydelig vei tilbake. Back-lenkene på info-sidene peker på `/planlegger`, ikke `/`.

## Løsning

Enkel `SiteHeader`-komponent importert direkte i de tre info-sidene. Planleggeren er uberørt.

## Komponenter

### Ny: `SiteHeader`

- **Venstre:** Appnavn "Permisjonsplanleggeren" som `<Link href="/">`
- **Høyre:** "Til planleggeren →" som `<Link href="/planlegger">` — vises via prop `showCta={true}` (default `false`)
- **Layout:** `flex justify-between items-center`, border-bottom, `py-3 px-4`, `text-sm`
- **Brukes i:** `src/components/SiteHeader.tsx`

### Endringer i sider

| Side | Endring |
|------|---------|
| `src/app/page.tsx` | Importer `<SiteHeader />` (uten CTA) øverst i `<main>` |
| `src/app/om/page.tsx` | Importer `<SiteHeader showCta />` + endre back-lenke til `href="/"` med tekst "← Forsiden" |
| `src/app/personvern/page.tsx` | Importer `<SiteHeader showCta />` + endre back-lenke til `href="/"` med tekst "← Forsiden" |

### Endringer i `SiteFooter`

- Copyright-tekst: "Permisjonsøkonomi-kalkulator" → "Permisjonsplanleggeren"

## Ikke i scope

- Endringer i `/planlegger` eller `/planlegger/kalender`
- Logo/ikon i headeren
- Mobilmeny eller dropdown

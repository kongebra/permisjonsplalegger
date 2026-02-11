# Website Audit Runde 2 - 10. februar 2026

## Resultat: 32 → 71 (Grade F → Grade C)

Audit URL: https://perm-planlegger.vercel.app/

| Kategori | Runde 1 | Runde 2 | Mål |
|----------|---------|---------|-----|
| Core SEO | 67 | 85 | ~95 |
| Crawlability | 63 | 99 | ~95 |
| Security | 83 | 94 | ~95 |
| Accessibility | 93 | 98 | ~97 |
| Performance | - | 97 | - |
| Links | 89 | 84 | ~95 |
| E-E-A-T | 53 | 53 | ~85 |
| Legal | 44 | 68 | ~90 |
| Content | - | 69 | - |
| Social Media | - | 75 | - |
| Internationalization | - | 100 | - |
| Images | - | 100 | - |
| Mobile | - | 100 | - |
| Structured Data | - | 100 | - |
| URL Structure | - | 100 | - |
| **Totalt** | **32** | **71** | **85+** |

---

## Gjenstående issues

### 1. E-E-A-T: About/Privacy/Contact ikke oppdaget (score 53)
- Crawleren finner ikke /om og /personvern
- Grunn: Lenker finnes kun i footer på de nye sidene og kalender-siden, men IKKE på `/planlegger` (wizard-siden)
- **Fix:** Legg til SiteFooter eller lenker i wizard-siden og root layout slik at crawleren ser dem fra alle sider
- Mangler også: author byline, contact page, content dates (datePublished)

### 2. Core SEO: `/planlegger/kalender` mangler H1 (ERROR)
- Kalender-siden er `"use client"` og crawleren ser `CalendarSkeleton`
- **Fix:** Legg til sr-only `<h1>` i CalendarSkeleton eller i kalender-sidelayout (tilsvarende det vi gjorde for planlegger)

### 3. Core SEO: Descriptions for korte (alle 5 sider under 120 tegn)
- `/` og `/planlegger`: 83/96 tegn
- `/planlegger/kalender`: 112 tegn
- `/om`: 92 tegn
- `/personvern`: 83 tegn
- **Fix:** Utvid alle descriptions til 120-160 tegn

### 4. Core SEO: Kalender title for kort (8 tegn)
- "Kalender" er bare 8 tegn, minimum er 30
- **Fix:** Utvid til f.eks. "Permisjonskalender - planlegg perioder og økonomi"

### 5. Core SEO: Duplicate title/description mellom `/` og `/planlegger`
- `/` redirecter (307) til `/planlegger`, begge får identisk metadata
- **Fix:** Gi `/` (root) sin egen unike title/description, eller sett `redirect` i stedet for layout-metadata

### 6. Links: Dead-end pages (/, /planlegger, /planlegger/kalender)
- Crawleren ser ingen utgående interne lenker fra disse sidene
- Grunn: Alt innhold er client-rendered, crawleren ser bare skeleton
- **Fix:** Legg til server-rendered footer med lenker i layout (ikke bare i client components)

### 7. Links: Orphan page `/planlegger/kalender`
- Færre enn 2 innkommende lenker
- **Fix:** Lenke til kalender fra flere steder (om-side, footer)

### 8. Social: og:url matcher ikke canonical
- OG URL er satt til root for alle sider
- **Fix:** Fjern hardkodet `url` fra openGraph i root layout, la Next.js generere per-side

### 9. Legal: Privacy policy link ikke funnet
- Crawleren ser ikke footer-lenker på wizard/kalender-sider (client-rendered)
- **Fix:** Samme som #1/#6 - server-rendered footer i layout

### 10. Content: Thin content på /, /planlegger, /planlegger/kalender
- Client-rendered sider har lite synlig tekst for crawlere
- /om og /personvern har 204/208 ord (minimum 300)
- **Fix:** Utvid innholdet på /om og /personvern, legg til noscript-innhold eller server-rendered tekst for wizard/kalender

### 11. Content: Keyword stuffing på /om og /personvern
- "til" (4.2%) og "ingen" (4.8%) flagget som overbrukt
- **Fix:** Varier ordbruken, bruk synonymer

### 12. Security: CSP allows unsafe-inline og unsafe-eval (warning)
- Nødvendig for Next.js og Tailwind, vanskelig å fjerne uten nonce-basert CSP
- **Vurdering:** Kan ignoreres for nå, eller implementer nonce-basert CSP senere

### 13. Security: HTTP→HTTPS redirects (warning)
- Vercel håndterer dette automatisk (308 redirects)
- **Vurdering:** Informational, ingen handling nødvendig

### 14. Performance: Critical request chains (warning)
- CSS og JS bundler er i critical path
- **Vurdering:** Normal for Next.js, kan optimaliseres med preload hints

### 15. Crawlability: Redirect chain / → /planlegger (warning)
- Root redirecter med 307
- **Vurdering:** Tilsiktet oppførsel, men kan vurdere permanent redirect (308/301)

---

## Prioritert handlingsplan for neste sesjon

### Høy prioritet (størst score-impact)
1. **Server-rendered footer i layout** - Fikser E-E-A-T (#1), Legal (#9), Links dead-end (#6)
2. **H1 i kalender-skeleton** - Fikser Core SEO error (#2)
3. **Utvid descriptions til 120+ tegn** - Fikser Core SEO warnings (#3)
4. **Utvid kalender-title** - Fikser Core SEO (#4)
5. **Fiks OG URL per side** - Fikser Social (#8)

### Medium prioritet
6. **Fiks duplicate title/description for `/`** (#5)
7. **Utvid /om og /personvern innhold til 300+ ord** (#10)
8. **Varier ordbruk** (#11)

### Lav prioritet / kan ignoreres
9. Redirect chain / → /planlegger (#15) - tilsiktet
10. CSP unsafe-inline (#12) - nødvendig for Next.js
11. HTTP→HTTPS (#13) - Vercel håndterer
12. Critical request chains (#14) - normal for Next.js

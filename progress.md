# Progress

> **Parallel agents:** Casper werkt vaak per pagina met meerdere agents tegelijk. Werk **alleen het sectie-blok van jouw pagina** bij — overschrijf andere secties niet.

---

## Algemeen

- **Stack:** Next.js 16 + React 19 + Tailwind 4 + GSAP
- **Repo:** https://github.com/Casper-Schepkens/IKR-website
- **Lokaal:** `cd ikr-website && npm run dev`
- **Deploy:** live op Vercel (Hobby), auto-deploy bij push naar `master`
- **Root directory:** `ikr-website` (hernoemd van `IKR website` — spaties breken Vercel serverless functions)
- **Laatste commit:** `ac997fc` — SEO metadata, WP redirects, Resend notify-split (live op productie)
- Design assets in `design/figma-pages/` + `design/figma-sections/`
- Payload verwijderd → puur Next.js
- Design tokens in `globals.css`, video's in `src/data/videos.ts`
- OG-image: dynamisch via `src/app/opengraph-image.tsx` (geen losse template-webp meer)
- **Favicon (27 aug 2026):** IKR-logo (cyaan vierkant) via `src/app/icon.png` + `apple-icon.png` + `favicon.ico`. Oude `public/favicon.svg` weg.
- **SEO (27 aug 2026):** sitemap, robots, metadataBase/canonicals, JSON-LD, 308's oude WP-URL's — live. GSC property `iknowright.be` geverifieerd; sitemap `https://iknowright.be/sitemap.xml` ingediend (Google status nog “Kan niet ophalen”, XML zelf 200). Homepage-indexering opnieuw aangevraagd.
- **Custom domain (27 aug 2026):** `https://iknowright.be` = Vercel (Valid Configuration). Apex A `216.198.79.1`. www CNAME `6d5c470a752ea4e1.vercel-dns-017.com` → 308 naar apex. Nameservers blijven GreenGeeks. MX `smtp.google.com` onaangeroerd. Turnstile hostnames: localhost + vercel.app + apex + www.
- Vercel env vars ingesteld (Resend + Turnstile). `RESEND_NOTIFY_FROM_EMAIL` niet nodig (code-fallback `forms@`). Lokaal: dummy-keys.
- **Resend (27 aug 2026):** notify-split live (`forms@` → `contact@`; klant-PDF blijft `From: contact@`). `contact@` van suppression-lijst gehaald. Contactformulier live getest: Turnstile OK, Resend **Delivered** naar `contact@`.
- Live Next-site: `https://iknowright.be` + `https://ikr-website.vercel.app`. Media lokaal in `ikr-website/public/`.
- **Cases single-source (jul 2026):** `caseDetails` → `caseGridItems` / `caseCarouselItems`
- Gsm/mobile versie: Casper (aug 2026)
- **Legal:** `/privacy`, `/cookies`, `/algemene-voorwaarden`, `/legal` — footer links + LinkedIn/Instagram socials
- Telefoon site-wide: `+32 479 40 03 29` (`src/data/site-contact.ts`)
- Legacy audit script: `npm run audit:legacy` → `legacy-content-audit.md`
- **Titel (31 aug 2026):** site-title + OG = `IKnowRight: dé TikTok agency voor food brands in Vlaanderen`
- **Video-showers (31 aug 2026):** 4 plekken delen geen dezelfde video. Per klantmap: shower 0 = 1e/5e/9e (homepage fan), 1 = 2e/6e (homepage cases), 2 = 3e/7e (start aanpak gsm; daarna alle andere clips in de gsm), 3 = 4e/8e (aanpak carousel). Eén video in het mapje → die overal. Maison Slash seksenquete-topvideo (`hideFromShowers`) blijft alleen op de case-detailpagina.
- **Showers vs grid (31 aug 2026):** `SHOWER_CHANNELS` = Tempus, Maison Slash, Anneke, Oh!ma, Wasbar. `CASE_GRID_ORDER` blijft 3 laag-1 cases. Oh!ma/Wasbar klikken naar de TikTok-post, geen fake detailpagina. Extra mp4's: Wasbar 2, Oh!ma 6, Maison Slash +5, Tempus +3.
- **Analytics (4 sep 2026):** `@vercel/analytics` in root layout. Cookie- + privacytekst bijgewerkt. Nog te doen: Enable in Vercel-dashboard + commit/push. Data start vanaf dan (geen geschiedenis).
- **Video posters + lazy load (4 sep 2026):** eerste frame als JPEG in `public/images/posters/`. `InViewVideo` zet `src` pas in-view/hover (`preload=none`). Food-mp4's ~14MB → ~2MB. Sitemap `https://iknowright.be/sitemap.xml` is 200; GSC opnieuw indienen.

---

## Homepage (`/`)

**Status:** live — copy/interactie-pass aug 2026

- Hero, carousel, brand strip, stats, team, proces, **Why TikTok**, cases (3 linkbare cards), reviews (echte quotes), CTA, footer
- Live op Vercel
- **jul 2026:** homepage fan-carousel (5) = case-video's + link naar detail (`homepageCarouselCards`)
- **aug 2026:** carousel-logo als sticker + klik-pijl; hover groeit omhoog zonder cutoff
- **aug 2026:** proces = Analyse → Creatie → Iteratie; smooth S-curve (`scrub: 1`)
- **aug 2026:** Why TikTok met DataReportal 42,5% + leeftijd-pie (niet 50%, niet 46% 34+)
- **aug 2026:** homepage-stats uit Metricool (Tempus + Maison Slash): 2.2M views / 171 video's / 170K topvideo — geen Figma-125M
- **31 aug 2026:** hero-titel = IKnowRight + “dé TikTok agency voor food brands in Vlaanderen”. Proces-sectie heeft knop naar `/aanpak`. Fan-carousel = shower 0 (5 merken: Tempus, Maison Slash, Anneke, Oh!ma, Wasbar). Cases-preview = shower 1 (alleen de 3 laag-1 cases).
- **TikTok-clarity quick win (sep 2026):** fan-carousel cards tonen echte `@handle`s uit `SHOWER_CHANNELS` (geen fake handles), bottom-left met mini musical-note mark + handle. Navbar ongewijzigd (geen TikTok-mark naast logo). Bestaande cards blijven; `TikTokPhoneFeed` niet op homepage.

---

## Aanpak (`/aanpak`)

**Status:** live — interactie-pass aug 2026

- Hero + gsm-feed, **Is dat wel iets voor mij?**, **Zonder/Met IKR**, proces-sectie, case-carousel, content-creator/contact CTA
- **jul 2026:** case-carousel + gsm-feed pullen uit case-video's (`caseCarouselItems` / `aanpakHeroFeedVideos`)
- **aug 2026:** scroll-hint op gsm; cijfers via `ikr-stats.ts` (zelfde Metricool-bron als homepage); Bekijk-het-zelf zonder cutoff; CTA-foto’s freelancer + team
- **31 aug 2026:** “freelancer” → “content creator” in CTA. Scroll-hint staat naast de gsm (niet erover). Gsm-feed begint met shower 2, daarna alle andere clips (geschud, niet dezelfde klant na elkaar; seksenquete blijft eruit). Wasbar zit dus wél in de gsm. Onderaan-carousel = shower 3. Klik op Oh!ma/Wasbar opent TikTok.
- Open: echte creator/shoot-foto i.p.v. supermarkt-aisle (`freelancer-cta.jpg`); Anneke-logo ontbreekt nog

---

## Pricing (`/pricing`)

**Status:** live, v1 klaar — Turnstile-fix aug 2026 (code); hostname in Cloudflare-dashboard nog Casper

- Visueel formulier + CTA op basis van Figma (geen placeholders, CTA-foto `freelancer-cta.jpg`)
- Rol **bedrijf** → `/api/pricing/request` → PDF naar invuller + notificatie naar `contact@iknowright.be`
- Rol **creator** / **solliciteren** → redirect `/contact?type=...`, knoptekst past aan
- Turnstile + GDPR + honeypot, `/privacy`
- **aug 2026 Turnstile:** lokaal gebruikt Cloudflare dummy-keys (werkt op localhost). Live blijft echte keys. Widget toont hostname-fout + retry. Server logt error-codes (geen secrets).
- PDF: `public/documents/ikr-tarieven.pdf`
- Resend `iknowright.be` verified (GreenGeeks DNS)
- From + notify: `contact@iknowright.be` (geen noreply)
- Suppression list contact@ was blocker — opgelost via Resend dashboard

---

## Contact (`/contact`)

**Status:** live, volledige chat-form + e-mail flow — audit follow-up jun 2026

- 1:1 op basis van `design/figma-pages/Contact v5.png` — navbar + footer hergebruikt
- Chat-layout: vragen links, antwoorden ingesprongen rechts met tails
- Progressieve stappen: volgende vraag pas na invullen vorige
- **Topics per type** (bedrijf / creator / solliciteren) — mail subject `[Creator]` / `[Sollicitatie]` waar van toepassing
- Telefoon sidebar: `+32 479 40 03 29`
- Submit via `/api/contact` → Resend notificatie naar `contact@iknowright.be` (replyTo = invuller)
- Turnstile + GDPR + honeypot (zelfde patroon als pricing)
- Teamfoto: `public/images/contact-team.jpg` (geëxtraheerd uit design) — echte teamfoto, geen filler
- **31 aug 2026:** e-mail in de cyan kaart is `mailto:`. Copy “freelancer” → “content creator”. Formulier + tel + mail = de CTA’s.
- Getest lokaal; live test op Vercel nog doen (env vars)

---

## Cases (`/cases`)

**Status:** v1 + Tempus layout A (cijfers i.p.v. foto's, aug 2026)

**Laag 1 — Cases (detailpagina's):**
- Tempus, Maison Slash, Anneke Govaerts — elk met lokale TikTok-video's (`public/videos/cases/`). Extra clips op Tempus/Maison voor showers; Wasbar + Oh!ma alleen in showers, geen detailpagina.
- Overview: hele kaart klikbaar → detail; galerij: klik → TikTok-post
- Views-badge met oog-icoon (niet likes)
- Maison Slash overview-thumbnail = `7573647751959858464.mp4` (niet seksenquete-topvideo)
- **Tempus (aug 2026):** layout A. Foto's in de 3 stappen vervangen door Metricool-cijfers. v2/v3 weg.
- **Maison Slash (aug 2026):** Metricool-cijfers i.p.v. groeipercentages (+28.000% etc.). 1.2M views, 170K topvideo, 100 video's. Geen "binnen één maand".
- **31 aug 2026:** Maison Slash cover = logo-banner (geen seksenquete-videoframe). Anneke geen cover (geen teamfoto meer).

**Laag 2 — Food werk:**
- Aïki, O'Tacos, Panos — influencer-grid, views + highlight, geen detailpagina
- **aug 2026:** echte food-video's lokaal (`public/videos/food/{aiki,otacos,panos}.mp4`, geconverteerd van de originele .mov's). Geen WP-hotlink, geen Pureto/showcase-stand-ins meer.
- **jul 2026:** blauwe play/pijl-button midden op food-video's verwijderd (niet clickable)

**Testimonials:**
- **aug 2026:** speech-bubble opnieuw: tail is sibling met volle bovenrand + 8px overlap in de bubble; `paddingBottom` houdt de staart in-flow zodat marquee `overflow:hidden` niet afknipt.

**Open:**
- Foto's + tekst corrigeren (nog niet juist)
- Hero/storyfoto's Maison Slash & Anneke (cover is gefixt: logo / geen foto; echte shoot-foto's later)
- Panos view-stat invullen
- Echte food retainer-cases later → laag 1
- Tempus: één layout kiezen, v2/v3 daarna weg

**jul 2026:** single-source — `caseGridItems`/`caseCarouselItems` afgeleid van `caseDetails`

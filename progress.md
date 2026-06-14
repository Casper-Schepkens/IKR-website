# Progress

> **Parallel agents:** Casper werkt vaak per pagina met meerdere agents tegelijk. Werk **alleen het sectie-blok van jouw pagina** bij — overschrijf andere secties niet.

---

## Algemeen

- **Stack:** Next.js 16 + React 19 + Tailwind 4 + GSAP
- **Repo:** https://github.com/Tandloosi/IKR-website
- **Lokaal:** `cd ikr-website && npm run dev`
- **Deploy:** live op Vercel (Hobby), auto-deploy bij push naar `master`
- **Root directory:** `ikr-website` (hernoemd van `IKR website` — spaties breken Vercel serverless functions)
- **Laatste commit:** `8176c10` — legacy audit follow-up jun 2026
- Design assets in `design/figma-pages/` + `design/figma-sections/`
- Payload verwijderd → puur Next.js
- Design tokens in `globals.css`, video's in `src/data/videos.ts`
- OG-image nog vervangen
- Custom domain `iknowright.be` — bewust uitgesteld (DNS DaddyGo later)
- Vercel env vars ingesteld (Resend + Turnstile)
- Gsm/mobile versie nog niet gebouwd
- **Legal:** `/privacy`, `/cookies`, `/algemene-voorwaarden`, `/legal` — footer links + LinkedIn/Instagram socials
- Telefoon site-wide: `+32 479 40 03 29` (`src/data/site-contact.ts`)
- Legacy audit script: `npm run audit:legacy` → `legacy-content-audit.md`

---

## Homepage (`/`)

**Status:** live, build ok — audit follow-up jun 2026

- Hero, carousel, brand strip, stats, team, proces, **Why TikTok**, cases (3 linkbare cards), reviews (echte quotes), CTA, footer
- Live op Vercel

---

## Aanpak (`/aanpak`)

**Status:** live, build ok — audit follow-up jun 2026

- Hero + gsm-feed, **Is dat wel iets voor mij?**, **Zonder/Met IKR**, proces-sectie, case-carousel, freelancer/contact CTA
- Open: gsm-placeholders (echte Figma exports ontbreken), freelancer CTA asset (`card top.png`)

---

## Pricing (`/pricing`)

**Status:** live, v1 klaar — nav-label **Prijzen** (jun 2026)

- Visueel formulier + CTA op basis van Figma (geen placeholders, CTA-foto `freelancer-cta.jpg`)
- Rol **bedrijf** → `/api/pricing/request` → PDF naar invuller + notificatie naar `contact@iknowright.be`
- Rol **creator** / **solliciteren** → redirect `/contact?type=...`, knoptekst past aan
- Turnstile + GDPR + honeypot, `/privacy`
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
- Teamfoto: `public/images/contact-team.jpg` (geëxtraheerd uit design)
- Getest lokaal; live test op Vercel nog doen (env vars)

---

## Cases (`/cases`)

**Status:** v1 klaar, live na push — audit follow-up jun 2026 (echte testimonial marquee i.p.v. fake quotes; `#food` anchor op food-sectie)

**Laag 1 — Cases (detailpagina's):**
- Tempus, Maison Slash, Anneke Govaerts — elk met top 4 TikTok-video's lokaal (`public/videos/cases/`)
- Overview: hele kaart klikbaar → detail; galerij: klik → TikTok-post
- Views-badge met oog-icoon (niet likes)
- Maison Slash overview-thumbnail = `7573647751959858464.mp4` (niet seksenquete-topvideo)

**Laag 2 — Food werk:**
- Aïki, O'Tacos, Panos — influencer-grid, views + highlight, geen detailpagina
- Video's via WP `.mov`

**Open (nice-to-have):**
- Hero/storyfoto's + logo's voor Maison Slash & Anneke
- Food `.mov` lokaal als `.mp4` hosten
- Panos view-stat invullen
- Echte food retainer-cases later → laag 1

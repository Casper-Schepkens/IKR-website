# Progress

> **Parallel agents:** Casper werkt vaak per pagina met meerdere agents tegelijk. Werk **alleen het sectie-blok van jouw pagina** bij — overschrijf andere secties niet.

---

## Algemeen

- **Stack:** Next.js 16 + React 19 + Tailwind 4 + GSAP
- **Repo:** https://github.com/Tandloosi/IKR-website
- **Deploy:** nog niet — lokaal via `npm run dev`
- Design assets in `design/figma-pages/` + `design/figma-sections/`
- Payload verwijderd → puur Next.js
- Design tokens in `globals.css`, video's in `src/data/videos.ts`
- OG-image nog vervangen
- Vercel + DNS DaddyGo nog niet ingesteld

---

## Homepage (`/`)

**Status:** live, build ok

- Hero, carousel, brand strip, stats, team, proces, cases, reviews, CTA, footer
- Laatste commit ref: `c6de0ae`

---

## Aanpak (`/aanpak`)

**Status:** live, build ok

- Hero + gsm-feed, proces-sectie, case-carousel, freelancer/contact CTA
- Open: gsm-placeholders (echte Figma exports ontbreken), freelancer CTA asset (`card top.png`)

---

## Pricing (`/pricing`)

**Status:** live, v1 klaar

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

**Status:** live, volledige chat-form + e-mail flow

- 1:1 op basis van `design/figma-pages/Contact v5.png` — navbar + footer hergebruikt
- Chat-layout: vragen links, antwoorden ingesprongen rechts met tails
- Progressieve stappen: volgende vraag pas na invullen vorige
- Laatste stap: 3 standaardopties + "Anders" met vrij tekstveld
- Submit via `/api/contact` → Resend notificatie naar `contact@iknowright.be` (replyTo = invuller)
- Turnstile + GDPR + honeypot (zelfde patroon als pricing)
- Teamfoto: `public/images/contact-team.jpg` (geëxtraheerd uit design)
- Getest en werkend lokaal

---

## Cases (`/cases`)

**Status:** overzicht + detail-template herstructureerd

- Overzicht (`/cases`): grid met hover-video's, testimonials marquee, knoppen linken naar detail
- Detail-template (`/cases/template`): casespecifiek verhaal (niet meer generiek Aanpak-proces)
  - Hero + outcome line → samenvatting → resultaten metrics → videogalerij → verhaalblokken → klantquote → contact-CTA
- Data-model in `src/data/cases.ts` — `CaseDetail` type met `summary`, `results`, `story`, `testimonial`
- Grid items hebben `slug` — Tempus live op `/cases/tempus` (content van iknowright.be/cases/tempus)
- Open: tempus-video lokaal hosten (`public/videos/tempus-case.mp4`), overige cases invullen
- Tempus stockfoto's: `public/images/cases/tempus/` (Unsplash, gratis commercieel)

# Decisions

> **Parallel agents:** Globale beslissingen staan onder Algemeen. Pagina-specifieke keuzes alleen in die sectie toevoegen.

---

## Algemeen

### Payload CMS → verwijderd (jun 2026)
**Beslissing:** Payload volledig strippen. Puur Next.js voor marketing site.

**Waarom:** Geen blog/CMS nodig voor v1. Payload voegde admin panel, SQLite DB, blocks-systeem en honderden template-bestanden toe zonder winst.

**Status:** Uitgevoerd.

### Styling
**Beslissing:** CSS custom properties in `globals.css` als design tokens. Complexe Figma-layouts (vw positioning, clip-path) blijven inline styles — kleuren via `var(--ikr-*)`.

### Asset-structuur
- `ikr-website/public/images/` — live assets
- `design/` — Figma-referenties, nooit deployed

### Navbar
Eén component: `Navbar.tsx` (pill-bar). Niet per pagina nabouwen.

### Hosting
DaddyGo = shared hosting, geen Node.js. **Beslissing:** site op Vercel hosten, DNS bij GreenGeeks laten (niet nameservers verhuizen). Google Workspace mail blijft MX `smtp.google.com`.

**Domain-switch (27 aug 2026):** apex `iknowright.be` is primair (A `216.198.79.1`). `www` is 308 naar apex (CNAME `6d5c470a752ea4e1.vercel-dns-017.com`). MX/TXT/DKIM/DMARC/`send`/`resend._domainkey` niet aangeraakt.

**Status:** Live op `https://iknowright.be` (Hobby). Pro ($20/maand) nog te bevestigen voor commercieel gebruik.

### Mapnaam `ikr-website` (jun 2026)
**Beslissing:** Next.js app hernoemd van `IKR website` → `ikr-website`.

**Waarom:** Vercel weigert serverless function-paden met spaties.

**Status:** Uitgevoerd. Vercel Root Directory = `ikr-website`.

### Legacy audit follow-up (jun 2026)
**Beslissing:** Telefoon overal `+32 479 40 03 29`. Geen migratie oude landing/VSL (geen actieve ads). Over ons blijft op homepage — geen aparte `/over-ons`. Socials footer: LinkedIn + Instagram.

**Future:** IKR roadmap/mijlpalen pagina; nieuwe landing page (vervanger WP landings). Zie `pdf-diensten-sync.md` voor align site ↔ tarieven-PDF.

**Status:** Uitgevoerd (legal set, reviews, contact topics, Why TikTok, footer links).

### Resend from/to split (aug 2026)
**Beslissing:** interne form-notificaties niet meer `From: contact@` → `To: contact@`. Klantmails (tarieven-PDF) blijven `From: contact@`. Notificaties `From: forms@` (geen mailbox nodig) → `To: contact@`. Daarna `contact@` van Resend suppression halen.

**Waarom:** self-send via Resend naar Google Workspace bounced; adres staat sindsdien op de suppression-lijst.

**Status:** Code uitgevoerd (`src/lib/resend-mail.ts`). `contact@` van Resend-suppression gehaald (27 aug 2026). Live pas na deploy.

---

## Homepage (`/`)

**Beslissing (jun 2026):** Why TikTok-sectie tussen proces en cases. Case preview = 3 linkbare cards i.p.v. static PNG. Echte testimonials (Anne Cornu, Anneke Govaerts, Maison Slash).

**Beslissing (aug 2026):** Proces = Analyse → Creatie → Iteratie (niet strategie/creatie/ads). Why TikTok-cijfers: 42,5% volwassen Belgen (DataReportal 2026), geen 50%. Leeftijd via Ads Manager-split. Geen IKR-eigen 125M in die sectie.

**Beslissing (aug 2026):** Homepage-stats = som Metricool Tempus + Maison Slash (sep 2025–aug 2026): 2.2M views, 171 video's, 170K beste video. Geen Figma-125M / 263 / +400K. Anneke niet in Metricool, dus niet in de som.

---

## Aanpak (`/aanpak`)

**Beslissing (jun 2026):** "Is dat wel iets voor mij?" + Zonder/Met IKR secties op pagina. Geen aparte `/jobs` — solliciteren via `/contact?type=solliciteren` met type-specifieke topics.

**Beslissing (jul 2026):** Cases single-source. `caseDetails` = bron; `caseGridItems` + `caseCarouselItems` afgeleid. Homepage, `/cases`, Aanpak-carousel delen die bron. Nieuwe case = toevoegen aan `caseDetails` + `CASE_GRID_ORDER` (+ assets). Food werk blijft apart (`foodWorkItems`, geen detail).

---

## Pricing (`/pricing`)

**Beslissing (jun 2026):** Resend via `/api/pricing/request`. PDF statisch in `public/documents/`. From + notify = `contact@iknowright.be`. Creator/sollicitant → redirect contact, geen PDF-mail. Nav-label **Prijzen** (route blijft `/pricing`).

**Beslissing (aug 2026):** Turnstile lokaal = Cloudflare dummy-keys (niet de productie-sitekey op localhost). Productie blijft echte keys. Hostname `ikr-website.vercel.app` moet in het Cloudflare-dashboard. SKIP_TURNSTILE blijft als extra lokale bypass.

---

## Contact (`/contact`)

**Beslissing:** Contact v5 als design-bron (niet v1–v4).

**Beslissing (jun 2026):** Chat-UI met progressieve stappen. Submit via Resend (`/api/contact`) — één notificatiemail naar `contact@iknowright.be`, geen bevestigingsmail naar invuller. Zelfde Turnstile + GDPR + honeypot als pricing. Bedrijfsvraag alleen bij type `bedrijf`. **Topics per contacttype** (bedrijf / creator / solliciteren) via `getMessageTopicsForType`; mail subject prefix `[Creator]` / `[Sollicitatie]` waar van toepassing. Telefoon: `+32 479 40 03 29` (`site-contact.ts`).

---

## Cases (`/cases`)

Portfolio in **twee lagen** — geen fake case-pagina's.

**Laag 1 — Cases (`caseDetails` → `caseGridItems`):** volledige case studies met detailpagina. Nu: Tempus, Maison Slash, Anneke Govaerts. Criteria: doel, aanpak, cijfers, minstens één concreet resultaat. Nieuwe case = kopieer `caseDetailTemplate`, zet in `caseDetails` + `CASE_GRID_ORDER` (+ optioneel `CASE_GRID_PREVIEW_INDEX`). Grid/carousel volgen automatisch.

**Laag 2 — Food werk (`foodWorkItems`):** influencer-opdrachten binnen food. Grid met video + views + highlight. **Geen detailpagina**, geen verzonnen verhaal. Tonen dat IKR food kent; geen retainer-case pretenderen.

**Later:** echte food cases (langdurige samenwerkingen) schuiven naar laag 1 wanneer content klaar is. Panos/O'Tacos/Aïki blijven in laag 2 tot er een volledig verhaal is.

**Niet doen:** `/cases/template` publiek linken. Wasbar/Ohma/MS zijn uit het grid.

**Beslissing (jun 2026):** Top TikTok-video's per kanaal lokaal in `public/videos/cases/`. Overview-thumbnail via `CASE_GRID_PREVIEW_INDEX` — niet altijd hoogste views (Maison Slash: seksenquete uitgesloten). Galerij-klik opent TikTok-post. Views-badge = oog-icoon + "XK views". Testimonial marquee = echte klantquotes (geen fake CEO-namen). Footer anchor `#food` op food-sectie.

**Beslissing (jul 2026):** Single-source — geen losse `caseCarouselVideos` / handmatige `caseGridItems` meer.

**Beslissing (aug 2026):** Tempus-detail = layout A (tijdlijn). Foto's in de stappen vervangen door cijfers (Metricool `@tempusverpleging` sep 2025–aug 2026; 1–2 sollicitaties/dag uit Drive-calls). v2/v3 weg. Maison Slash: absolute Metricool-cijfers (1.2M views / 170K top), geen groeipercentages vs bijna-leeg vorig jaar, geen "binnen één maand". Food-werk host Aïki/O'Tacos/Panos lokaal als H.264. Speech-bubble: staart sibling van de box, overlap + paddingBottom zodat marquee de tail niet afknipt.

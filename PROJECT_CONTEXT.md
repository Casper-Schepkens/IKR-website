# PROJECT_CONTEXT — IKnowRight (IKR) website

Korte projectoriëntatie voor agents en contributors. Geen geheimen. Onzekere of conflicterende feiten staan gemarkeerd als **onzeker**.

---

## 1. Wat is dit

- Marketing site voor **IKnowRight (IKR)** — TikTok-bureau voor food brands in Vlaanderen.
- Repo: [Casper-Schepkens/IKR-website](https://github.com/Casper-Schepkens/IKR-website).
- Live: [iknowright.be](https://iknowright.be) · Vercel-alias: [ikr-website.vercel.app](https://ikr-website.vercel.app).
- Geen CMS: content in TypeScript-data + `public/` assets.
- Domein was kort in DNS Belgium-quarantaine (~23–24 sep 2026); daarna geheractiveerd — site weer live.

---

## 2. Tech stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4** · **GSAP**
- **Resend** (formulieren + wekelijkse analytics-mail)
- **Cloudflare Turnstile** (captcha op forms)
- **Vercel** hosting + **Web Analytics** (`@vercel/analytics`, cookieless) + Cron
- **OpenAI Ads** measurement pixel (apart van Vercel `track()`)
- Geen Payload/CMS; admin later gepland (Supabase) maar **uitgesteld**

---

## 3. Structuur

App staat op **repo-root** (Optie A, PR #21). Vercel Root Directory: `.`

```
├── src/
│   ├── app/           # Routes + API (`/api/contact`, `/api/pricing/request`, `/api/cron/weekly-analytics`)
│   ├── components/ikr/# UI (hero, carousel, cases, forms, CTA, …)
│   ├── data/          # cases.ts, videos.ts, ikr-stats.ts, site-contact.ts, …
│   ├── lib/           # analytics, Resend, Turnstile, Vercel Web Analytics helpers
│   └── utilities/
├── public/            # images/, videos/, documents/ (o.a. tarieven-PDF)
├── scripts/           # o.a. legacy audit
├── design/            # Figma-exports (~47 MB), niet deployed
└── docs/              # productgeschiedenis, sessies, contributing
```

Belangrijke routes: `/`, `/aanpak`, `/pricing`, `/contact`, `/cases`, `/cases/[slug]`, legal (`/privacy`, `/cookies`, …).

Contentbronnen: `src/data/cases.ts` (`caseDetails` = single source), `videos.ts`, `ikr-stats.ts`.

---

## 4. Opstarten

Node 18+.

```bash
cp .env.example .env   # vul namen in; zie §5
npm install
npm run dev            # http://localhost:3000
```

Andere scripts: `npm run build` · `npm run start` · `npm run lint` · `npm run audit:legacy`.

Push naar `master` deployt naar Vercel. Lokaal gebruikt Turnstile automatisch dummy-keys als echte keys ontbreken.

---

## 5. Benodigde secrets / env vars

**Alleen namen** (waarden nooit in docs/commits). Bron: `.env.example`.

| Naam | Rol |
|------|-----|
| `RESEND_API_KEY` | Resend API |
| `RESEND_FROM_EMAIL` | From voor o.a. klantmails |
| `RESEND_NOTIFY_FROM_EMAIL` | From voor interne form-notificaties |
| `IKR_NOTIFY_EMAIL` | Ontvanger form-notificaties |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Turnstile secret |
| `SKIP_TURNSTILE` | Optioneel lokaal: captcha overslaan |
| `NEXT_PUBLIC_OAIQ_DEBUG` | Optioneel: OpenAI Ads pixel debug logging |
| `CRON_SECRET` | Auth voor `/api/cron/weekly-analytics` |
| `VERCEL_API_TOKEN` | Read-only token voor Web Analytics API |
| `VERCEL_PROJECT_ID` | Vercel project |
| `VERCEL_TEAM_ID` | Nodig bij team-account |
| `IKR_ANALYTICS_REPORT_EMAIL` | Ontvanger wekelijks digest |

Turnstile hostnames (dashboard): `localhost`, `ikr-website.vercel.app`, `iknowright.be`, `www.iknowright.be`.

---

## 6. Belangrijke beslissingen

- Puur Next.js marketing site; Payload verwijderd; geen publieke prijslijst (aanvraag via `/pricing`).
- Hosting op Vercel; analytics = Vercel Web Analytics (geen GA4).
- Dual CTA alleen samen met `track()`-events.
- Publieke copy: geen em dashes (—); geen Metricool-/interne analytics-jargon naar bezoekers.
- Carousel-kaarten: TikTok-logo + `@handle` **horizontaal** (logo links van handle).
- Hero: groot TikTok-logo naast video’s (PR #24 gemerged); op mobiel naast titel.
- Cases: `caseDetails` single source; food-werk zonder vol verhaal → `foodWorkItems`.
- Formulieren: Resend + Turnstile + honeypot; notificaties `From: forms@` → `To: contact@` (geen self-send bounce).
- Kleuren (Milan-voorstel, **PR #25 open**): eggshell `#F0ECCD`, pastel purple `#B192EC`, navy behouden, oude cyan laten vallen. Op `master` staan nog de oude tokens (cream `#F0EBE0`, cyan `#0FC1DE`) tot merge.
- PDF-diensten sync: door gebruiker gesloten (site OK).
- Admin-panel: gepland (Supabase), bewust uitgesteld.

---

## 7. Huidige stand

- Restructure Optie A + analytics dual-CTA / weekly digest (PR #21, #23) op `master`.
- Hero TikTok-logo naast carousel (PR #24) gemerged.
- OpenAI Ads pixel site-wide; conversies o.a. contact (`registration_completed`) en pricing (`prijs_aangevraagd`).
- Milan-kleurpalet: **PR #25 open** (nog niet op live `master`).
- Analytics setup (cron-env, dry-run) was OK per setup-docs; traffic klein; conversie-events nog schaars bij laag volume (stand ~28 sep 2026).
- Placeholder CTA-beeld (Woolworths / `freelancer-cta.jpg` op pricing & aanpak): gebruiker houdt huidige beeld voorlopig.
- Tempus-hero: gebruiker meldt fix; eventuele repo↔productie-sync **onzeker** / buiten prioriteit.
- `public/website-template-OG.webp` staat nog in de tree (Payload-restant). PR #22 heeft het ooit verwijderd onder het oude pad; na root-promotie is het bestand weer aanwezig. Site heeft wel `src/app/opengraph-image.tsx` voor OG.
- Turnstile / GSC: door Casper afgerond (volgens prefs).
- README noemt nog “Hobby”; Pro is aangekocht voor analytics (prefs/setup) — planlabel in README mogelijk verouderd (**onzeker** of README bewust zo blijft).

---

## 8. Volgende stappen

- PR #25 (Milan-kleuren) reviewen/mergen wanneer gewenst.
- CTA-foto vervangen wanneer gebruiker een kandidaat kiest (zie project-store `docs/cta-image-recommendations.md`); tot dan niets forceren.
- Optioneel: orphan `website-template-OG.webp` opnieuw opruimen; echte branded OG blijft via `opengraph-image.tsx` / latere asset.
- Admin (Supabase) alleen als Casper prioriteit geeft.
- BDG-analytics: apart handoff-plan voor andere AI (`docs/bdg-analytics-handoff-plan.md` in project store) — niet IKR-scope tenzij gevraagd.

---

## 9. Externe links

- Live: https://iknowright.be
- Vercel preview/alias: https://ikr-website.vercel.app
- GitHub: https://github.com/Casper-Schepkens/IKR-website
- Open PRs (stand bij schrijven): [#25 Milan kleurpalet](https://github.com/Casper-Schepkens/IKR-website/pull/25)
- Merged relevant: [#21 root](https://github.com/Casper-Schepkens/IKR-website/pull/21) · [#23 analytics](https://github.com/Casper-Schepkens/IKR-website/pull/23) · [#24 hero logo](https://github.com/Casper-Schepkens/IKR-website/pull/24) · [#17 OpenAI Ads](https://github.com/Casper-Schepkens/IKR-website/pull/17) · [#22 OG remove](https://github.com/Casper-Schepkens/IKR-website/pull/22)
- Resend: https://resend.com
- Turnstile: https://dash.cloudflare.com/?to=/:account/turnstile
- OpenAI Ads measurement pixel: https://developers.openai.com/ads/measurement-pixel
- DNS Belgium delete/quarantine: https://docs.dnsbelgium.be/be/general/deletes.html

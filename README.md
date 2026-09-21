# IKR Website

Marketing site voor [IKnowRight](https://ikr-website.vercel.app) — TikTok-bureau voor food brands.

**Stack:** Next.js 16, React 19, Tailwind 4, GSAP. Geen CMS.

Live: [ikr-website.vercel.app](https://ikr-website.vercel.app) · [iknowright.be](https://iknowright.be)

## Setup

Node 18+. Kopieer [`.env.example`](.env.example) naar `.env` (Resend + Turnstile). Lokaal gebruikt de code automatisch dummy Turnstile-keys — echte keys alleen op Vercel.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Push naar `master` deployt automatisch naar Vercel (Hobby). **Vercel Root Directory** moet `.` (project root) zijn — niet meer `ikr-website`.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
- `npm run audit:legacy` — vergelijk live copy met de oude WP-site

## Pagina's

| Route | Inhoud |
| --- | --- |
| `/` | Homepage |
| `/aanpak` | Werkwijze |
| `/pricing` | Tarieven aanvragen (geen publieke prijslijst) |
| `/contact` | Chat-formulier |
| `/cases` | Portfolio + food werk |
| `/cases/[slug]` | Case-detail |
| `/privacy`, `/cookies`, `/algemene-voorwaarden`, `/legal` | Legal |

## Waar content zit

- Cases + food werk: [`src/data/cases.ts`](src/data/cases.ts) — `caseDetails` is de bron; grid en carousel volgen
- Video-paden: [`src/data/videos.ts`](src/data/videos.ts)
- Cijfers: [`src/data/ikr-stats.ts`](src/data/ikr-stats.ts)
- Telefoon: [`src/data/site-contact.ts`](src/data/site-contact.ts)
- Assets: `public/images/`, `public/videos/`
- Tarieven-PDF: `public/documents/ikr-tarieven.pdf`

## Nieuwe case

1. Video's in `public/videos/cases/{slug}/`, paden in `videos.ts`
2. Kopieer `caseDetailTemplate` naar `caseDetails` in `cases.ts`
3. Slug toevoegen aan `CASE_GRID_ORDER`

Grid, Aanpak-carousel en homepage-preview volgen automatisch. Template-slug niet publiek linken.

Food-influencer zonder volledig verhaal → `foodWorkItems` (geen detailpagina). Echte retainer-cases horen in `caseDetails`.

## Forms

`/api/contact` en `/api/pricing/request` mailen via Resend naar `contact@iknowright.be`. Turnstile + honeypot.

Op `/pricing`: rol **bedrijf** stuurt de tarieven-PDF; **creator** / **solliciteren** gaan naar `/contact`.

## Repo-structuur

```
├── src/                 # Next.js app (pages, components, data)
├── public/              # images, videos, documents
├── scripts/             # o.a. legacy audit
├── design/              # Figma-exports (~47 MB), niet deployed — referentie only
└── docs/                # productgeschiedenis, sessienotities, contributing
```

Designreferenties staan in [`design/`](design/) (niet deployed). Samenwerking & git: [`docs/contributing.md`](docs/contributing.md).

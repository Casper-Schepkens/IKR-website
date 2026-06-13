# Decisions

## Payload CMS → verwijderd (jun 2026)
**Beslissing:** Payload volledig strippen. Puur Next.js voor marketing site.

**Waarom:** Geen blog/CMS nodig voor v1. Payload voegde admin panel, SQLite DB, blocks-systeem en honderden template-bestanden toe zonder winst.

**Status:** Uitgevoerd.

## Styling
**Beslissing:** CSS custom properties in `globals.css` als design tokens. Complexe Figma-layouts (vw positioning, clip-path) blijven inline styles — kleuren via `var(--ikr-*)`.

## Asset-structuur
- `IKR website/public/images/` — live assets
- `design/` — Figma-referenties, nooit deployed

## Navbar
Eén component: `Navbar.tsx` (pill-bar).

## Hosting (open)
DaddyGo = traditionele shared hosting, geen Node.js. Next.js vereist Node-runtime.
**Aanbeveling:** Site hosten op Vercel (gratis tier, perfect voor Next.js), domein van DaddyGo wijzen via DNS (CNAME/A-record). DaddyGo behouden voor e-mail of andere diensten.

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
- `IKR website/public/images/` — live assets
- `design/` — Figma-referenties, nooit deployed

### Navbar
Eén component: `Navbar.tsx` (pill-bar). Niet per pagina nabouwen.

### Hosting
DaddyGo = shared hosting, geen Node.js. **Beslissing:** site op Vercel hosten, DaddyGo-domein via DNS wijzen. DaddyGo behouden voor e-mail. **Status:** nog niet uitgevoerd.

---

## Homepage (`/`)

_(geen pagina-specifieke beslissingen)_

---

## Aanpak (`/aanpak`)

_(geen pagina-specifieke beslissingen)_

---

## Pricing (`/pricing`)

**Beslissing (jun 2026):** Resend via `/api/pricing/request`. PDF statisch in `public/documents/`. From + notify = `contact@iknowright.be`. Creator/sollicitant → redirect contact, geen PDF-mail.

---

## Contact (`/contact`)

**Beslissing:** Contact v5 als design-bron (niet v1–v4).

**Beslissing (jun 2026):** Chat-UI met progressieve stappen. Submit via Resend (`/api/contact`) — één notificatiemail naar `contact@iknowright.be`, geen bevestigingsmail naar invuller. Zelfde Turnstile + GDPR + honeypot als pricing. Bedrijfsvraag alleen bij type `bedrijf`. Bericht = keuze uit 3 opties of "Anders" met vrij tekst.

---

## Cases (`/cases`)

_(nog niet gebouwd)_

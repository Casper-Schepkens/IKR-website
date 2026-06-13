# Decisions

## Architectuur: hybrid (jun 2026)
**Beslissing:** Marketingpagina's (home, aanpak, pricing, cases, contact) blijven hardcoded React components in `src/components/ikr/`. Payload CMS gebruiken voor blog/posts en optioneel dynamische content later.

**Waarom:** IKR-site is design-gedreven met pixel-perfect Figma-layouts. Payload's block-systeem is overkill voor vaste marketingpagina's. Payload blijft nuttig voor `/posts`, media-beheer en admin — zonder de hele site te hoeven migreren.

**Alternatief afgewezen:** Alles via Payload Pages/blocks — te veel template-boilerplate, trager itereren op design.

## Asset-structuur
- `IKR website/public/images/` — alleen live assets
- `design/` — Figma-referenties, nooit deployed

## Navbar
Eén component: `Navbar.tsx` (pill-bar). Oude hamburger `AanpakNavbar` verwijderd.

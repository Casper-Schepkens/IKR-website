# Blockers

> **Parallel agents:** Voeg blockers toe of verwijder ze **alleen in jouw pagina-sectie**. Raak andere secties niet aan.

---

## Algemeen
- **Vercel plan:** Hobby → Pro ($20/maand) nu de site live is op `iknowright.be` (commercieel) — Casper moet kaart invoeren

## Homepage (`/`)
- Anneke heeft nog geen logo-bestand.

## Aanpak (`/aanpak`)
- Echte creator/shoot-foto i.p.v. supermarkt-aisle (`freelancer-cta.jpg`). Teamfoto op de contact-CTA is ok.

## Pricing (`/pricing`)
- **Turnstile live:** tot `ikr-website.vercel.app` in Cloudflare Hostname Management staat, faalt de captcha op Vercel. Lokaal is gefixt (dummy-keys).
- **Resend suppression:** `contact@iknowright.be` kan opnieuw suppressed raken bij bounce — check Resend dashboard als notify uitblijft

## Contact (`/contact`)
- **Live test:** creator/solliciteren topics + mail subjects nog verifiëren op Vercel-URL (lokaal ok, build ok)

## Cases (`/cases`)
- **Content:** tekst Maison Slash & Anneke nog niet juist — wacht op copy
- Optioneel later: echte shoot-foto's Maison Slash & Anneke; echte food retainer-cases.

## Admin (`/admin`)
- Supabase-project + Google OAuth-client aanmaken (zie `docs/product/admin-setup.md`)
- `ANTHROPIC_API_KEY` (platform.claude.com) + maandlimiet
- Billit API-sleutel + PartyID; headernamen verifiëren in sandbox
- TikTok developer-app + review (Display API)
- Vercel Pro nodig voor decks (functies tot 5 min)

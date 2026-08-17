# Blockers

> **Parallel agents:** Voeg blockers toe of verwijder ze **alleen in jouw pagina-sectie**. Raak andere secties niet aan.

---

## Algemeen
- **Custom domain:** uitgesteld — DNS DaddyGo/GreenGeeks → Vercel komt later. **Nu:** Turnstile hostname `ikr-website.vercel.app` aanzetten. **Bij permanente switch:** ook `iknowright.be` (+ www) + Vercel env keys; Hobby → Pro.
- **Vercel plan:** Hobby → Pro ($20/maand) pas bij live op eigen domein
- **Gsm/mobile:** site is nog niet responsive — volgende grote taak
- **Resend:** `contact@iknowright.be` staat nog op suppression (bounce 13 jun 2026). Form-notificaties komen niet aan. Fix (from/to splitsen + unsuppress) uitgesteld — Casper heeft nu geen mail-toegang.

## Homepage (`/`)
- Anneke heeft nog geen logo-bestand.

## Aanpak (`/aanpak`)
- **IKR-stats:** 125M / 263 / 400K komen uit Figma, niet geverifieerd. Update via TikTok Analytics-export.
- Dedicated freelancer-asset (`card top.png`) ontbreekt nog — nu `freelancer-cta.jpg`.

## Pricing (`/pricing`)
- **Turnstile live:** tot `ikr-website.vercel.app` in Cloudflare Hostname Management staat, faalt de captcha op Vercel. Lokaal is gefixt (dummy-keys).
- **Resend suppression:** `contact@iknowright.be` kan opnieuw suppressed raken bij bounce — check Resend dashboard als notify uitblijft

## Contact (`/contact`)
- **Live test:** creator/solliciteren topics + mail subjects nog verifiëren op Vercel-URL (lokaal ok, build ok)

## Cases (`/cases`)
- **Content:** foto's + tekst nog niet juist — wacht op juiste assets/copy
- **Tempus:** 3 layout-versies live ter review — Casper moet er één kiezen
- Optioneel later: betere hero/storyfoto's Maison Slash & Anneke; echte food retainer-cases.

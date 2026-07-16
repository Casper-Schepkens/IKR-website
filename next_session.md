# Next session

> **Parallel agents:** Elke agent werkt op één pagina. Update **alleen jouw sectie** hieronder — laat andere secties staan.

---

## Algemeen
1. **Gsm/mobile versie** — responsive layout voor alle pagina's (nu desktop-first / vw-positioning)
2. Contact- en pricing-formulier **live testen** op Vercel-URL (creator/solliciteren topics + PDF-mail)
3. OG-image vervangen (`ikr-website/public/website-template-OG.webp`)
4. **PDF-diensten sync** — zie [`pdf-diensten-sync.md`](pdf-diensten-sync.md)
5. _(uitgesteld)_ Custom domain `iknowright.be` via DaddyGo DNS → Vercel — **bij permanente switch:** Turnstile hostnames + Vercel env keys fixen (`iknowright.be` + www); Hobby → Pro ($20/maand)
6. _(future)_ IKR roadmap/mijlpalen pagina; nieuwe landing page (vervanger WP landings)

## Homepage (`/`)
1. **Proces stap 1-2-3** — content/copy aanpassen (Casper levert later)
2. **Waarom TikTok?** — herschrijven met echte cijfers + bezwaren die we vaak horen (bv. "zit mijn doelpubliek daar wel?" + hoeveel mensen op TikTok). Nog niet bouwen — eerst cijfers/bronnen verzamelen.
3. Optioneel: OG-image; her-run `npm run audit:legacy` na grote content-wijzigingen.

## Aanpak (`/aanpak`)
1. Gsm-placeholders + freelancer CTA asset (`card top.png`) indien Figma exports klaar.
_(Done jul 2026: cases single-source — carousel pullt uit `caseGridItems`)_

## Pricing (`/pricing`)
PDF-diensten sync — zie [`pdf-diensten-sync.md`](pdf-diensten-sync.md). Live end-to-end test formulier → PDF-mail.

## Contact (`/contact`)
Live test creator/solliciteren topics + mail subject `[Creator]`/`[Sollicitatie]`. Test op Vercel.

## Cases (`/cases`)
1. **Foto's + tekst** corrigeren (nog niet juist — Casper levert juiste assets/copy later)
2. Hero/storyfoto's + logo's voor Maison Slash & Anneke
3. Food `.mov` lokaal als `.mp4` hosten (nu nog via WP `iknowright.be`)
4. Panos view-stat invullen
5. Echte food retainer-cases → laag 1 wanneer content klaar
_(Done jul 2026: blauwe play/pijl-button weggehaald bij food-werk — niet clickable)_
_(Done jul 2026: single-source — `caseGridItems` afgeleid van `caseDetails`; Aanpak/homepage/`/cases` delen bron)_

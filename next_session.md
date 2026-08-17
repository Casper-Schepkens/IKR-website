# Next session

> **Parallel agents:** Elke agent werkt op één pagina. Update **alleen jouw sectie** hieronder — laat andere secties staan.

---

## Algemeen
1. **Gsm/mobile versie** — responsive layout voor alle pagina's (nu desktop-first / vw-positioning)
2. Contact- en pricing-formulier **live testen** op Vercel-URL (creator/solliciteren topics + PDF-mail)
3. OG-image vervangen (`ikr-website/public/website-template-OG.webp`)
4. **PDF-diensten sync** — zie [`pdf-diensten-sync.md`](pdf-diensten-sync.md)
5. _(uitgesteld)_ Custom domain `iknowright.be` via DaddyGo DNS → Vercel — **bij permanente switch:** Turnstile hostnames + Vercel env keys fixen (`iknowright.be` + www); Hobby → Pro ($20/maand)
6. _(later, wacht op mail-toegang)_ **Resend notify-split** — `contact@` staat nog op suppression (bounce 13 jun). From/to splitsen: klantmails `From: contact@`, interne form-notificaties `From: forms@` of `hello@` → `To: contact@`. Daarna `contact@` unsuppressen in Resend. Geen mailbox nodig voor het from-adres. Niet doen tot Casper weer bij de mail kan.
7. _(future)_ IKR roadmap/mijlpalen pagina; nieuwe landing page (vervanger WP landings)

## Homepage (`/`)
1. Optioneel: OG-image; her-run `npm run audit:legacy` na grote content-wijzigingen.
2. Anneke-logo ontbreekt → nu tekst-sticker. Aanleveren als je het bestand hebt.
_(Done aug 2026: stats 2.2M / 171 / 170K uit Metricool)_

## Aanpak (`/aanpak`)
1. Dedicated freelancer-foto (`card top.png`) als die beter is dan `freelancer-cta.jpg`.
_(Done aug 2026: IKR-cijfers via Metricool in `ikr-stats.ts`; scroll-hint gsm verdwijnt na eerste swipe/wheel; cutoff Bekijk-het-zelf; contact-CTA = teamfoto)_

## Pricing (`/pricing`)
1. **Cloudflare dashboard (jij):** Turnstile widget → Settings → Hostname Management → voeg `ikr-website.vercel.app` toe. Daarna live formulier testen (PDF-mail).
2. PDF-diensten sync — zie [`pdf-diensten-sync.md`](pdf-diensten-sync.md).

## Contact (`/contact`)
Live test creator/solliciteren topics + mail subject `[Creator]`/`[Sollicitatie]`. Test op Vercel.

## Cases (`/cases`)
1. ~~Tempus layout kiezen~~ → **A blijft**, foto's → Metricool-cijfers
2. Foto's + tekst corrigeren voor Maison Slash & Anneke (Casper levert assets/copy)
3. Betere hero/storyfoto's + logo's voor Maison Slash & Anneke
4. Panos view-stat invullen (niet in Metricool)
5. Echte food retainer-cases → laag 1 wanneer content klaar
_(Done aug 2026: Aïki/O'Tacos/Panos lokale mp4; speech-bubble tails; Tempus A + cijfers; Maison Slash Metricool i.p.v. %)_
_(Done jul 2026: blauwe play/pijl-button weggehaald bij food-werk — niet clickable)_
_(Done jul 2026: single-source — `caseGridItems` afgeleid van `caseDetails`; Aanpak/homepage/`/cases` delen bron)_

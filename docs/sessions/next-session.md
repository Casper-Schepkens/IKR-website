# Next session

> **Parallel agents:** Elke agent werkt op één pagina. Update **alleen jouw sectie** hieronder — laat andere secties staan.

---

## Algemeen
1. **Web Analytics:** Vercel-dashboard → project IKR-website → Analytics → Enable. Daarna deze commit pushen. Cijfers staan daarna onder Analytics (bezoekers, pagina's, referrers). Geen historische data van vóór enable.
2. **Search Console:** sitemap is live (`https://iknowright.be/sitemap.xml`, HTTP 200). Opnieuw indienen: Search Console → Sitemaps → `https://iknowright.be/sitemap.xml` → Verzenden.
3. Vercel Hobby → Pro ($20/maand) — jij moet de kaart invoeren in Vercel billing; agent kan dat niet.
4. **PDF-diensten sync** — zie [`pdf-diensten-sync.md`](pdf-diensten-sync.md)
5. _(future)_ IKR roadmap/mijlpalen pagina; nieuwe landing page (vervanger WP landings)

## Homepage (`/`)
1. Anneke-logo ontbreekt → nu tekst-sticker. Aanleveren als je het bestand hebt.
2. Optioneel: officiële TikTok brand asset i.p.v. minimal note-mark naast carousel `@handle`s (nu bewust geen trademark-file).
3. Optioneel later: stats/BrandStrip labels TikTok-specifieker; hero CTA; footer TikTok-profiel wanneer URL bestaat.
_(Done 31 aug 2026: fan = 5 merken incl. Oh!ma + Wasbar; cases-preview blijft 3 laag-1)_
_(Done sep 2026: @handles + mini note-mark bottom-left op carousel cards; navbar mark verwijderd na feedback; geen phone-feed op home)_

## Aanpak (`/aanpak`)
1. Creator/shoot-foto voor de sollicitatie-CTA (niet de supermarkt-aisle).
_(Done 31 aug 2026: content creator-copy; scroll-hint naast gsm; gsm-feed = shower 2 + rest geschud; carousel shower 3)_

## Pricing (`/pricing`)
1. **Cloudflare dashboard (jij):** Turnstile widget → Settings → Hostname Management → voeg `ikr-website.vercel.app` toe. Daarna live formulier testen (PDF-mail).
2. PDF-diensten sync — zie [`pdf-diensten-sync.md`](pdf-diensten-sync.md).

## Contact (`/contact`)
Live test creator/solliciteren topics + mail subject `[Creator]`/`[Sollicitatie]`. Test op Vercel.

## Cases (`/cases`)
1. ~~Tempus layout kiezen~~ → **A blijft**, foto's → Metricool-cijfers
2. Foto's + tekst corrigeren voor Maison Slash & Anneke (Casper levert assets/copy)
3. Echte shoot-foto's Maison Slash & Anneke later (cover is nu logo / geen foto)
4. Panos view-stat invullen (niet in Metricool)
5. Echte food retainer-cases → laag 1 wanneer content klaar
_(Done aug 2026: Aïki/O'Tacos/Panos lokale mp4; speech-bubble tails; Tempus A + cijfers; Maison Slash Metricool i.p.v. %)_
_(Done jul 2026: blauwe play/pijl-button weggehaald bij food-werk — niet clickable)_
_(Done jul 2026: single-source — `caseGridItems` afgeleid van `caseDetails`; Aanpak/homepage/`/cases` delen bron)_

## Admin (`/admin`)
**Volgende sessie (Casper, 31 okt 2026): van "cool" naar "praktisch".** Het frame is goed, maar het
dashboard is ontworpen zonder onze processen te kennen. Nu functioneel maken, zonder bloat.
1. **Eerst onderzoeken, niet bouwen.** Lees heel Notion, heel de Drive en vooral de **Lucidchart**-diagrammen
   (processen) om te voelen hoe IKR werkt.
2. Twee perspectieven:
   - **Casper: salesgericht.** Leads → sales call → voorstel → getekend.
   - **Cedric + Milan: klantgericht.** Productie, draaidagen, content, opvolging.
3. Casper legt het **productieproces** uit. Claude stelt voor hoe dat als **workflow** in het dashboard
   komt (stappen, wie, wanneer), eerst als voorstel.
4. Daarna schrappen wat niet gebruikt wordt; elke scherm-/knopkeuze moet een echte stap in het proces dienen.
5. **IKR AI-harness.** De IKR AI in het dashboard moet zelf kunnen zoeken en lezen in Google Drive,
   Gmail, Notion (en Calendar), niet alleen in Supabase. Uitzoeken: tools via de Claude API (eigen
   tool-loop met Google/Notion-API's of MCP-connector), welke OAuth-koppelingen nodig zijn, wat de AI
   alleen mag lezen en wat ze mag schrijven (bv. mails enkel als concept), en hoe dat in de kosten past.

Stand na PR #29 (klanten/leads gesplitst, logo's, alle AI via API, API-kosten in instellingen):
- Contracten in Supabase bijgewerkt uit Drive (Tempus nieuw contract vanaf 1/11/2026, Chez Albert €1.500/mnd).
  Nog aanvullen: bedrag + data Wasbar en Lilalou (staan als concept), verlenging Oh!ma, startdatum Chez Albert.
- Logo Oh!ma ontbreekt nog (uploaden via Gegevens).
- Geparkeerd: TikTok-cijfers (Metricool Starter heeft geen API; opties: upgrade Advanced of TikTok Display API),
  eigenaar per klant (geen ding), Google Calendar-sync.
- Open setup: Supabase e-mailprovider uit, wildcard-redirect voor previews, connector end-to-end testen.

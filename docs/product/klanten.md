# Klanten (admin `/admin/klanten`)

> **Status:** prototype (5 nov 2026). Casper werkt dit verder uit. Bouw enkel wat hij beschrijft;
> de brainstorm hieronder zijn voorstellen, geen beslissingen.

## Wat Casper vroeg (5 nov 2026, letterlijk samengevat)
- Een nieuw menu-item links: **"Klanten"**.
- Doel: **overzicht van alle klanten**: hoelang hun contract nog loopt, welke freelancer erop staat,
  wanneer de draaidag gefixt is, de content-kalender, enz.
- "Ik ga dat nog veel verder uittypen." Voor nu: **gewoon een lijst per klant met freelancer en
  wanneer het contract afloopt.**
- "Onthoud wat ik gezegd heb en dat ik daar aan verder werk."

## Wat er nu staat (v0)
- Tabel `clients`: naam, freelancer (vrije tekst), einde contract (datum). Zichtbaar en aanpasbaar
  voor het hele team (RLS `is_team_member`), live verversen.
- Pagina: lijst, wie het eerst afloopt bovenaan; "Nog" in dagen of maanden: rood < 30 dagen of
  verlopen, oranje < 60, groen daarna. Toevoegen, aanpassen, verwijderen (met bevestiging).
- Grok Bot (MCP): `klanten_lijst`, `klant_aanmaken`, `klant_bijwerken`, `klant_verwijderen`.

## Context uit eerder werk
- In v1 (PR #29, gewist op 2 nov) stonden contracten in Supabase, bijgewerkt uit de Drive:
  Tempus (nieuw contract vanaf 1/11/2026), Chez Albert (€1.500/mnd), Wasbar en Lilalou (concept),
  Oh!ma (verlenging). Die data is weg; kan opnieuw uit de contracten in de Drive gehaald worden.
- Cases op de site: Maison Slash, Anneke, Aïki, O'Tacos, Panos, Tempus, Oh!ma, Wasbar.
- De productie-workflow (Cedric & Milan) is nog niet in Lucid uitgetekend; Klanten hoort daarbij.

## Brainstorm (voorstellen, nog niet beslist)
**1. Klantfiche** (klik op een klant)
- Contract: start, einde, bedrag per maand, aantal video's per maand, opzegtermijn, link naar het
  getekende contract in de Drive; verlenging (ja/nee/besproken).
- Contactpersoon bij de klant (naam, mail, gsm), TikTok-account (@handle + link).
- Freelancer(s): wie filmt/editeert; later een aparte tabel `freelancers` (naam, rol, tarief,
  beschikbaarheid) zodat je ziet wie op hoeveel klanten staat.
- Notities / afspraken (tone of voice, do's & don'ts, brandbook-link).

**2. Productie per klant**
- Draaidagen: datum, locatie, freelancer, status (te plannen → gepland → gefilmd → gemonteerd →
  gepost). "Wanneer is de draaidag gefixt" = status gepland + datum.
- Content-kalender: link naar de kalender (Sheet/Notion) of een eigen weergave per maand
  (wat wordt wanneer gepost).
- Teller: video's deze maand geleverd vs. afgesproken.

**3. Signalen (wat het overzicht nuttig maakt)**
- Contract loopt binnen 30/60 dagen af → op de weekly (het "later"-blok met contracten) en in de
  Grok Bot-chat; opvolgtaak voor Casper (verlengingsgesprek).
- Geen draaidag gepland binnen X dagen → oranje.
- Achter op levering (minder video's dan afgesproken) → oranje.

**4. Koppelingen**
- Sales → klant: een lead op "gewonnen" maakt (of stelt voor) een klant aan, met de gegevens uit
  de lead (brug sales → onboarding).
- Weekly: weekcijfers (aflopende contracten, draaidagen deze week) automatisch op de weekly.
- Prikbord: Grok Bot kan de content-kalender of shotlist van een klant op het prikbord zetten.
- Later TikTok-cijfers per klant (Metricool heeft op Starter geen API; geparkeerd).

**5. Wie ziet wat**
- Productie-info: hele team. Bedragen/financiën: misschien enkel Casper (zoals sales) — te beslissen.

## Open vragen voor Casper
1. Welke velden wil je als eerste op de klantfiche (contract, contactpersoon, draaidagen, kalender)?
2. Is een freelancer altijd één persoon per klant, of meerdere (filmen vs. editen)?
3. Mogen Cedric en Milan bedragen zien?
4. Moeten we de klanten uit de Drive-contracten importeren?

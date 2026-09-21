# Legacy content audit — iknowright.be vs nieuwe site

Generated: 2026-06-14

Raw data: [`legacy-content/`](legacy-content/) (JSON + per-pagina markdown)

---

## Samenvatting

| Status | Aantal |
|--------|--------|
| Partial | 13 |
| Migrated | 1 |
| Skip | 2 |
| Decision | 6 |
| Missing | 1 |

**Oude site:** 23 WordPress-pagina's via REST API  
**Nieuwe site:** 7 routes, 25 bestanden geïndexeerd

---

## Overall feel

De oude site voelt **conversationeel en geruststellend**: "geen fancy woorden", "Ben jij dat van die video's?", emoji's sporadisch, directe CTA's ("Plan je intake"). Veel **objection handling** (TikTok is niet enkel tieners, "Is dat wel iets voor mij?").

De nieuwe site voelt **visueler en strakker** (Figma V2): kortere copy, sterkere typografie, food-brand focus explicieter in hero/brand strip. Minder uitleg, meer bewijs via stats/cases.

Risico: nieuwe site verliest **vertrouwen-opbouw** (langere uitleg, testimonials, TikTok-educatie) ten gunste van design. Aanbevolen: echte reviews + legal + minstens één "waarom TikTok"-moment behouden.

---

## Gap matrix — hoofdpagina's

| Oud | Nieuw | Status | Must-have mist |
|-----|-------|--------|----------------|
| [Home](https://iknowright.be/) | / | **Partial** | Anne Cornu; 46% |
| [Cases](https://iknowright.be/cases/) | /cases | **Partial** | — |
| [Anneke-Govaerts](https://iknowright.be/cases/anneke-govaerts/) | /cases/anneke-govaerts | **Partial** | 1300 |
| [Aiki](https://iknowright.be/cases/food/aiki/) | /cases | **Partial** | — |
| [O&#8217;Tacos](https://iknowright.be/cases/food/otacos/) | /cases | **Migrated** | — |
| [Maison Slash](https://iknowright.be/cases/maison-slash/) | /cases/maison-slash | **Partial** | — |
| [Other](https://iknowright.be/cases/other/) | /cases | **Partial** | — |
| [Tempus](https://iknowright.be/cases/tempus/) | /cases/tempus | **Partial** | — |
| [Contact](https://iknowright.be/contact/) | /contact | **Partial** | — |
| [Jobs](https://iknowright.be/jobs/) | /aanpak, /contact?type=solliciteren | **Partial** | videomaker |
| [legal](https://iknowright.be/legal/) | (missing) | **Missing** | BE1014.718.978; Vondelstraat; Lebbeke |
| [Over ons](https://iknowright.be/over-ons/) | /(team section) | **Partial** | — |
| [Pricing](https://iknowright.be/pricing/) | /pricing | **Partial** | — |
| [Wat we doen](https://iknowright.be/wat-we-doen/) | /aanpak | **Partial** | contentcreatie |
| [Werkwijze](https://iknowright.be/werkwijze/) | /aanpak | **Partial** | Kick-off; Draaidag |

---

## Gap matrix — landing & VSL

| Oud | Status | Notities |
|-----|--------|----------|
| [Landing Page Crazy offer](https://iknowright.be/landing-page-crazy-offer/) | **Decision** | 97 woorden, 0 media |
| [Landing page v2 succes](https://iknowright.be/landing-page-v2-succes/) | **Decision** | 0 woorden, 0 media |
| [Landing Page V2](https://iknowright.be/landing-page-v2/) | **Decision** | 246 woorden, 3 media |
| [Landing Page](https://iknowright.be/landing-page/) | **Decision** | 307 woorden, 3 media |
| [VSL_eng](https://iknowright.be/vsl_eng/) | **Decision** | 7 woorden, 1 media |
| [VSL](https://iknowright.be/vsl/) | **Decision** | 12 woorden, 1 media |

---

## Gap matrix — utility (skip)

- [Coming soon](https://iknowright.be/coming-soon-2/) → Skip
- [Thank you](https://iknowright.be/thank-you/) → Skip

---

## Copy die zeker over moet (must-have snippets)

### Testimonials (homepage — nu fake op nieuwe site)

**Anne Cornu — CEO Maison Slash**
> Ik werk nu een tijdje samen met het team van het bureau en ik voel gewoon: zij snappen TikTok. Waar ik soms wat uit de doelgroep val, pakken zij het op. Ik ben oprecht blij dat ze ons helpen om onze TikTok van Maison Slash naar een hoger niveau te duwen.

**Dr. Anneke Govaerts — Migraine specialiste**
> Ik was helemaal onbekend in de TIK-TOK wereld. Zij hebben mijn hand vastgehouden bij de eerste stapjes/ filmpjes, en mij direct op een juiste manier een plaats kunnen geven als hoofdpijn-expert op dat forum. Sindsdien kreeg ik veel meer media-aandacht.

### Legal (ontbreekt volledig op nieuwe site)

Van [`/legal`](https://iknowright.be/legal/):

- IKnowRight, Vondelstraat 65, 9280 Lebbeke
- BTW: BE1014.718.978
- IBAN: BE03 7310 6214 9184, BIC: KREDBEBB
- Tel: 0471571399
- contact@iknowright.be

### "Waarom enkel TikTok?" (homepage oud — ontbreekt nieuw)

> TikTok is hét platform bij uitstek om nieuwe prospects te bereiken… Véél meer nog dan bij Instagram reels of Facebook posts!
> Misvatting: "enkel de jongeren zitten op TikTok." FOUT! … meer dan **46%** van de TikTok gebruikers ouder dan 34 jaar!

### Doelgroep (wat-we-doen — deels ontbreekt)

> Niet willen dansen op TikTok, maar wél willen opvallen. Meer klanten, personeel of merkherkenning…

### Zonder IKR / Met IKR (landing pages — bruikbaar voor /aanpak)

Sterke before/after bullets op `/landing-page` en `/landing-page-v2` — zie [`legacy-content/pages/landing-page.md`](legacy-content/pages/landing-page.md).

---

## Per-pagina detail

### Home (`/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/
- **Nieuw:** /
- **Must-have gevonden:** food brands, honger, Content Strategie, Content Creatie, Advertenties, Anneke Govaerts, TikTok
- **Must-have mist:** Anne Cornu, 46%
- **Nice-to-have mist:** Waarom enkel TikTok, Online Marketing Monkey, Plan je intake

### Cases (`/cases/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/cases/
- **Nieuw:** /cases
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### Anneke-Govaerts (`/cases/anneke-govaerts/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/cases/anneke-govaerts/
- **Nieuw:** /cases/anneke-govaerts
- **Must-have gevonden:** migraine, VRT
- **Must-have mist:** 1300
- **Nice-to-have mist:** —

### Aiki (`/cases/food/aiki/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/cases/food/aiki/
- **Nieuw:** /cases
- **Must-have gevonden:** Aïki, 50, noodle
- **Must-have mist:** —
- **Nice-to-have mist:** 1500 likes

### O&#8217;Tacos (`/cases/food/otacos/`)

- **Status:** Migrated
- **Oud:** https://iknowright.be/cases/food/otacos/
- **Nieuw:** /cases
- **Must-have gevonden:** O'Tacos, 16k
- **Must-have mist:** —
- **Nice-to-have mist:** —

### Maison Slash (`/cases/maison-slash/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/cases/maison-slash/
- **Nieuw:** /cases/maison-slash
- **Must-have gevonden:** Maison Slash, 145, viraal
- **Must-have mist:** —
- **Nice-to-have mist:** 28000%

### Other (`/cases/other/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/cases/other/
- **Nieuw:** /cases
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### Tempus (`/cases/tempus/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/cases/tempus/
- **Nieuw:** /cases/tempus
- **Must-have gevonden:** 650, verpleegkundigen, HR
- **Must-have mist:** —
- **Nice-to-have mist:** 650 000

### Coming soon (`/coming-soon-2/`)

- **Status:** Skip
- **Oud:** https://iknowright.be/coming-soon-2/
- **Nieuw:** (skip)
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### Contact (`/contact/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/contact/
- **Nieuw:** /contact
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### Jobs (`/jobs/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/jobs/
- **Nieuw:** /aanpak, /contact?type=solliciteren
- **Must-have gevonden:** freelancer
- **Must-have mist:** videomaker
- **Nice-to-have mist:** portfolio

### Landing Page Crazy offer (`/landing-page-crazy-offer/`)

- **Status:** Decision
- **Oud:** https://iknowright.be/landing-page-crazy-offer/
- **Nieuw:** (not migrated)
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### Landing page v2 succes (`/landing-page-v2-succes/`)

- **Status:** Decision
- **Oud:** https://iknowright.be/landing-page-v2-succes/
- **Nieuw:** (not migrated)
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### Landing Page V2 (`/landing-page-v2/`)

- **Status:** Decision
- **Oud:** https://iknowright.be/landing-page-v2/
- **Nieuw:** (not migrated)
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### Landing Page (`/landing-page/`)

- **Status:** Decision
- **Oud:** https://iknowright.be/landing-page/
- **Nieuw:** (not migrated)
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### legal (`/legal/`)

- **Status:** Missing
- **Oud:** https://iknowright.be/legal/
- **Nieuw:** (missing)
- **Must-have gevonden:** —
- **Must-have mist:** BE1014.718.978, Vondelstraat, Lebbeke
- **Nice-to-have mist:** IBAN, KREDBEBB

### Over ons (`/over-ons/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/over-ons/
- **Nieuw:** /(team section)
- **Must-have gevonden:** Casper, Cédric, Milan
- **Must-have mist:** —
- **Nice-to-have mist:** ontstond vanuit, organische content

### Pricing (`/pricing/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/pricing/
- **Nieuw:** /pricing
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### Thank you (`/thank-you/`)

- **Status:** Skip
- **Oud:** https://iknowright.be/thank-you/
- **Nieuw:** (skip)
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### VSL_eng (`/vsl_eng/`)

- **Status:** Decision
- **Oud:** https://iknowright.be/vsl_eng/
- **Nieuw:** (not migrated)
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### VSL (`/vsl/`)

- **Status:** Decision
- **Oud:** https://iknowright.be/vsl/
- **Nieuw:** (not migrated)
- **Must-have gevonden:** —
- **Must-have mist:** —
- **Nice-to-have mist:** —

### Wat we doen (`/wat-we-doen/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/wat-we-doen/
- **Nieuw:** /aanpak
- **Must-have gevonden:** contentstrategie, social media
- **Must-have mist:** contentcreatie
- **Nice-to-have mist:** Is dat wel iets voor mij, niet willen dansen op TikTok

### Werkwijze (`/werkwijze/`)

- **Status:** Partial
- **Oud:** https://iknowright.be/werkwijze/
- **Nieuw:** /aanpak
- **Must-have gevonden:** Intake
- **Must-have mist:** Kick-off, Draaidag
- **Nice-to-have mist:** geen moeilijke trajecten, marketingjargon


---

## Actielijst (geprioriteerd)

| Prio | Actie | Bron | Doel |
|------|-------|------|------|
| Decision | Social media management was 4e dienst op oude site — nieuwe site heeft strategie/creatie/advertenties. Bewuste keuze documenteren. | /wat-we-doen/ | ProcessSection / AanpakPageContent |
| Decision | Landing/VSL: /landing-page-crazy-offer/ — migreren, redirecten, of WP laten draaien voor actieve ads | https://iknowright.be/landing-page-crazy-offer/ | (Casper: check Meta/Google ad links) |
| Decision | Landing/VSL: /landing-page-v2-succes/ — migreren, redirecten, of WP laten draaien voor actieve ads | https://iknowright.be/landing-page-v2-succes/ | (Casper: check Meta/Google ad links) |
| Decision | Landing/VSL: /landing-page-v2/ — migreren, redirecten, of WP laten draaien voor actieve ads | https://iknowright.be/landing-page-v2/ | (Casper: check Meta/Google ad links) |
| Decision | Landing/VSL: /landing-page/ — migreren, redirecten, of WP laten draaien voor actieve ads | https://iknowright.be/landing-page/ | (Casper: check Meta/Google ad links) |
| Decision | Landing/VSL: /vsl_eng/ — migreren, redirecten, of WP laten draaien voor actieve ads | https://iknowright.be/vsl_eng/ | (Casper: check Meta/Google ad links) |
| Decision | Landing/VSL: /vsl/ — migreren, redirecten, of WP laten draaien voor actieve ads | https://iknowright.be/vsl/ | (Casper: check Meta/Google ad links) |
| P0 | Vervang fake homepage-reviews (Wout Desmedt e.a.) door echte quotes: Anne Cornu (Maison Slash) + Dr. Anneke Govaerts | / | ReviewsSection.tsx, CasesPageContent.tsx |
| P0 | Maak /legal pagina met bedrijfsgegevens (Vondelstraat 65, Lebbeke, BTW, IBAN, tel) | /legal/ | Nieuwe route src/app/legal/page.tsx + footer link |
| P0 | Harmoniseer telefoonnummer — codebase heeft: 04 71 49 75 12
           vs 01-3.77-4.25 vs 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89 vs 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34 vs 004.78 1.52 vs 01-1.01-.41 vs 0471 57 13 99 vs 026
           vs 025/11/8413 vs 09436316961. vs 09436316961 vs 08892777760. vs 08892777760 vs 0186996682017. vs 0186996682017 vs 0206158073120. vs 0206158073120 vs 0290537760. vs 0290537760 vs 057532182. vs 057532182 vs 056290371800342. vs 056290371800342. Oude /legal: 0471571399 | /legal/, footer, contact | SiteFooter.tsx, ContactPageContent.tsx |
| P0 | Footer legal links fixen: Privacy → /privacy; Cookie + Algemene voorwaarden pagina's ontbreken | Oude footer | SiteFooter.tsx |
| P1 | Overweeg "Waarom enkel TikTok?"-sectie met 46%-stat (35+) — ontbreekt op nieuwe homepage | / | Homepage (nieuwe sectie) of /aanpak |
| P1 | "Is dat wel iets voor mij?"-doelgroepcopy overnemen (geen dansen op TikTok, restaurant/retail…) | /wat-we-doen/ | /aanpak |
| P2 | Origin story ("IKR ontstond vanuit…") — nu alleen korte team-sectie op homepage | /over-ons/ | Homepage team of aparte /over-ons |

---

## Casper review (handmatig invullen)

- [ ] **Telefoonnummer correct?** Oud legal: `0471571399`. Nieuw footer: `0471 57 13 99`. Nieuw contact: `04 71 49 75 12`.
- [ ] **Welke landing/VSL URLs zitten nog in actieve ads?** (bepaalt redirect vs migratie bij domain switch)
- [ ] **Must-have vs nice-to-have** — markeer acties hierboven
- [ ] **/over-ons** aparte pagina of origin story op homepage?
- [ ] **Social media management** als 4e dienst behouden?

---

## Nieuwe site routes

- `/aanpak`
- `/cases`
- `/cases/[slug]`
- `/contact`
- `/page.tsx`
- `/pricing`
- `/privacy`

---

## Telefoons & emails in nieuwe codebase

- Telefoons: 04 71 49 75 12
          , 01-3.77-4.25, 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89, 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34, 004.78 1.52, 01-1.01-.41, 0471 57 13 99, 026
          , 025/11/8413, 09436316961., 09436316961, 08892777760., 08892777760, 0186996682017., 0186996682017, 0206158073120., 0206158073120, 0290537760., 0290537760, 057532182., 057532182, 056290371800342., 056290371800342
- Emails: contact@iknowright.be, CONTACT@IKNOWRIGHT.BE

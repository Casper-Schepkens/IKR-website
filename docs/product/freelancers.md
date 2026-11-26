# Freelancers (admin `/admin/freelancers`)

> **Status:** v1 (26 nov 2026). Start leeg: geen echte data ingevoerd, geen voorbeelddata in de database.

## Doel
Eén centrale lijst van al onze freelancers (filmen, monteren, contentplanning, schermgezichten), zodat we
zien wie bij welke klant zit en bij een afzegging snel iemand vinden die het al bewezen heeft.

## Kolommen (één rij per freelancer)
| Kolom | Veld (`freelancers`) | Opmerking |
| --- | --- | --- |
| Naam | `name` | verplicht; voor- en achternaam, eventueel handelsnaam |
| E-mail | `email` | gecontroleerd, klein geschreven |
| Telefoon | `phone` | vrije tekst; klikbaar (`tel:`) |
| Score | `score` | `rood` / `oranje` / `groen` / `zekerheid` of leeg; gekleurd label |
| Klanten / opdrachten | `assignments` + `client_ids` | vrije tekst, plus koppeling aan klanten uit Klanten |
| Link | `portfolio_url` | enkel http(s); zonder schema wordt het `https://`; opent in een nieuw tabblad |
| Bron en opmerking | `notes` | vrije tekst |

**Score = de fase uit Milans kleurensysteem.** Er is geen aparte kolom "fase" en geen cijfer.
- **Rood:** goed vermoeden dat ze het kunnen, nog niets bewezen voor IKR
- **Oranje:** heeft de laboratoriumtest bij IKR gedaan (klein idee bedenken, filmen, monteren)
- **Groen:** heeft één opdracht voor een klant uitgevoerd, gecheckt door Milan, Cédric of een groene freelancer
- **Zekerheid** (paars label): heeft al veel gedaan, we zijn zeker dat ze het kunnen

## Bewerken
- **In de tabel:** klik op een waarde (of het potloodje bij een lege cel). Enter of ernaast klikken bewaart,
  Escape annuleert. De score kies je in het label zelf; dat bewaart meteen.
- **Fiche:** het pijltje vóór de naam opent alle velden samen, ook de koppeling aan klanten, met
  **Verwijder** (vraagt eerst "Ja, verwijder …").
- **Nieuwe freelancer:** formulier onderaan (knop "Nieuwe freelancer" bovenaan springt ernaartoe).
- Zoeken op naam (zonder accenten/hoofdletters) en filteren op score (ook "Geen score").

## Rechten
Zelfde als Klanten en SOP's: RLS `team_all` met `public.is_team_member()`. Elk actief teamlid in
`team_members` (Casper, Cédric, Milan) mag lezen, toevoegen, aanpassen en verwijderen.

## Grok Bot (MCP)
- `freelancers_lijst` — filter op `zoek` (naam), `score` (of `geen`) en `klant`
- `freelancer_aanmaken` — enkel `naam` verplicht
- `freelancer_bijwerken` — alle velden optioneel; lege tekst maakt leeg; `klanten` vervangt de koppelingen
- `freelancer_verwijderen`

Schrijfacties worden zoals altijd gelogd in `bot_actions`. Instructie aan Grok Bot: geen freelancers,
contactgegevens of scores verzinnen; score enkel zetten als het team dat zegt.

## Database
Migratie `supabase/migrations/20261126000100_freelancers.sql`: tabel `freelancers`, check op score,
`touch_updated_at`-trigger, realtime, en een trigger die een verwijderde klant uit `client_ids` haalt.

## Later (niet gebouwd)
- Op Klanten tonen welke freelancers gekoppeld zijn (nu staat daar nog het vrije veld "freelancer").
- Rol per freelancer (filmen/monteren/planning/schermgezicht) als apart filter, als dat nodig blijkt.

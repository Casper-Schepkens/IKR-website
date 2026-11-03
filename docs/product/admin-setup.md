# IKR Admin — setup

`/admin` is het interne dashboard van IKR. Het wordt per persoon gebouwd, op basis van de
workflows in Lucidchart ("IKR Customer Journey – Volledige Flow"). Kernregel: enkel wat in
de workflow staat, geen extra features.

## Stand (2 nov 2026)

- **Sales (Casper)**, enkel voor `casper@iknowright.be`:
  - `/admin/sales/cold-mails`: cold mails-dashboard (Apollo, enkel lezen). Toont het aantal nieuwe
    adressen dat nog gemaild moet worden in de actieve sequence (oranje onder 20 → Grokbot vragen),
    verstuurd → reacties → leads → setter calls → sales calls → gewonnen, en een overzicht per sequence;
  - `/admin/sales/inbox`: sales-inbox (Gmail van casper@). Threads die Casper begon (cold mail) of met
    een bekende lead, waarvan de laatste mail van de lead komt. Tabs "Nieuwe leads" en "Al gemaild" (met
    context). Per reactie zet de AI een antwoord klaar (taak `inbox_reply` in `ai_jobs`); Casper past aan en
    klikt Verstuur. Niet geïnteresseerd/uitschrijven: geen antwoord, wel "Markeer als lost". Een nieuwe
    afzender wordt automatisch een lead; een telefoonnummer uit de mail komt bij de lead.
  - `/admin/sales`:
  - leads-overzicht met de funnel;
  - knop "Nieuwe lead";
  - leadfiche met gegevens, volgende actie, opvolgdatum, notities, fase (voorlopig manueel)
    en "Lead lost" met reden en notitie;
  - lopende leads gesorteerd op opvolgdatum; achterstallige opvolging in het oranje.
- **Weekly** (`/admin/weekly`), gedeeld voor het hele team:
  - to-do's per persoon en lange to-do's: Done, Notitie, Schuif door;
  - de weekly inplannen (live of online met Meet) in de contact-agenda, met uitnodigingen
    (Casper altijd, Cedric en Milan zodra hun agenda gekoppeld is);
  - "Meeting starten", "Conclude meeting" (plant de volgende in) en "Vorige weeklies".
- **Instellingen** (`/admin/instellingen`): "Connect calendar" per persoon en voor contact@iknowright.be.
- Live weeklies: Record-knop; de opname gaat naar de Drive van contact@ (map "IKR Dashboard – Weeklies"), gedeeld met iknowright.be.
- Online weeklies: check om de 30 s of de Fireflies-bot in de Meet zit, met knop "Fireflies toevoegen".
  Elke ochtend (06:00 UTC, `/api/cron/weekly-transcripts`) gaat het transcript als Google Doc naar de
  Drive van contact@ en komt de link bij de weekly.

## Toegang

- Login: Google via Supabase Auth. Enkel @iknowright.be-adressen.
- Sales is twee keer afgeschermd:
  - in de app (`canSeeSales` in `src/lib/admin/env.ts`);
  - in de database (RLS-policy op `public.leads` via `public.is_sales_user()`).

## Database

- `public.leads`: één tabel als bron van waarheid. Een lead bestaat pas vanaf het eerste
  mailverkeer; contacten in Apollo zijn nog geen leads.
- Fases: `lead`, `setter_planned`, `setter_done`, `sales_planned`, `sales_done`, `next_steps`,
  `won`, `lost`.
- Migratie: `supabase/migrations/20261102000000_sales_leads.sql`.
- Velden voor opvolging en context: `next_action`, `follow_up_on`, `notes`.
- 24 leads geïmporteerd uit de Notion-tabel "Leads" (2 nov 2026). De status en de bron uit
  Notion staan onderaan de notities.
- De tabellen van de eerste versie zijn verwijderd (`20261102000100_drop_v1_admin.sql`).

## Omgevingsvariabelen

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `APOLLO_API_KEY` (cold mails-dashboard)
- `SUPABASE_SERVICE_ROLE_KEY` (Google-tokens server-side lezen)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (agenda/Meet)
- `FIREFLIES_API_KEY` (weekly: bot-check en transcripts)
- `CRON_SECRET` (dagelijkse transcript-taak)

## Volgende stappen (sales)

Volgens de sales-workflow in Lucid:
1. ~~cold mails-dashboard (Apollo)~~ klaar;
2. ~~sales-inbox (Gmail + AI-antwoorden)~~ klaar;
3. boekingspagina en agenda;
4. lead-scan en scripts;
5. Record, Fireflies, Drive en analyse;
6. sales call plannen met reminders;
7. opvolging.

## AI-taken

- Tabel `ai_jobs` = wachtrij. Engine `api` (standaard): de taak loopt meteen via de Claude API
  (`ANTHROPIC_API_KEY`, model `claude-sonnet-5-5`). Met `IKR_AI_ENGINE=worker` blijven taken op `pending`
  staan voor een worker op een eigen server (Claude Code), zonder dat het dashboard verandert.
- Per taak worden model, tokens en kost (USD) bewaard. Overzicht: Instellingen → AI-kosten (enkel Casper).
- Testweek: na een week de kost per maand bekijken en kiezen tussen API en een eigen server.
- Vaste IKR-context: `src/lib/admin/ai/context.ts`. Taken: `src/lib/admin/ai/handlers.ts`.

## Grokbot (MCP)

- Endpoint: `https://iknowright.be/api/mcp` (header `Authorization: Bearer <GROKBOT_API_KEY>` of `x-api-key`),
  of `https://iknowright.be/api/mcp/<GROKBOT_API_KEY>` voor apps die geen headers kunnen instellen.
- Grokbot werkt als Casper, op de database met de service role, via dezelfde logica als het dashboard.
- Tools: leads (lijst, fiche, aanmaken, bijwerken, notitie, fase, lost, verwijderen), cold mails, inbox (lijst,
  wegklikken), mailconcepten (aanmaken, bijwerken, verwijderen), weekly (overzicht, vorige, to-do aanmaken/bijwerken/af/notitie/doorschuiven/verwijderen,
  inplannen, afsluiten). Geen toegang tot Google-tokens.
- Elke wijziging (en elke fout) wordt gelogd in `bot_actions`.
- Code: `src/lib/admin/mcp/server.ts`.

### Grokbot als AI-uitvoerder

- `IKR_AI_ENGINE=grokbot`: AI-taken (zoals antwoorden in de inbox) gaan niet naar de API maar blijven open
  staan. Grokbot haalt ze op met `ai_taken_open` en zet het resultaat terug met `ai_taak_klaarzetten`.
- Porren: maak in Grok een Automation met een **Webhook**-trigger (docs.x.ai/grok/automations/webhooks) en zet
  de endpoint als `GROK_WEBHOOK_URL` en het signing secret als `GROK_WEBHOOK_SECRET`. Bij elke nieuwe taak stuurt
  het dashboard een ondertekende POST (Standard Webhooks).
- Prompt van de automation: "Haal de open AI-taken op met ai_taken_open van de connector ikr-dashboard, voer
  elke taak uit volgens de instructies en zet het resultaat terug met ai_taak_klaarzetten. Verstuur geen mails."

### Mailconcepten (nieuwe uitgaande mails)

- MCP: `mail_concept_aanmaken`, `mail_concept_bijwerken`, `mail_concept_verwijderen`. Tabel `mail_drafts`.
- **Een bot verstuurt nooit zelf.** De MCP-server heeft geen enkele verzendtool (ook `inbox_versturen` is weg);
  versturen kan enkel via de knop Verstuur in het dashboard (server action, ingelogd als Casper).
- Concepten staan in de inbox (tab Concepten) en op de leadfiche (Mailconcepten): bewerken, versturen, verwijderen.
- Afzender is altijd casper@ (er wordt niet meer via contact@ verstuurd).
- Tests: `npm test` (Vitest, `src/lib/admin/mcp/server.test.ts`).

### Schrijfstijl

- Eén profiel (`style_profiles`, key `casper`): gids + voorbeelden, door de AI (Grokbot of API) gemaakt uit Caspers
  echte verzonden antwoorden van casper@ en contact@ (laatste 6 maanden, zonder Apollo-mails) en uit
  `style_feedback` (AI-voorstel tegenover wat echt verstuurd werd).
- Gaat mee in elke mailtaak; MCP-tool `schrijfstijl`. Instellingen → Schrijfstijl: lezen, aanpassen, Bijwerken.
  Elke maandag automatisch (`/api/cron/style-profiles`).
- contact@ heeft leesrechten nodig (opnieuw koppelen) om de oude verzonden mails te kunnen lezen.

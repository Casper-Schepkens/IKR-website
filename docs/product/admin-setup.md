# IKR Admin — setup

`/admin` is het interne dashboard van IKR. Het wordt per persoon gebouwd, op basis van de
workflows in Lucidchart ("IKR Customer Journey – Volledige Flow"). Kernregel: enkel wat in
de workflow staat, geen extra features.

## Stand (2 nov 2026)

- **Sales (Casper)**, enkel voor `casper@iknowright.be`:
  - `/admin/sales/cold-mails`: cold mails-dashboard (Apollo, enkel lezen). Toont het aantal nieuwe
    adressen dat nog gemaild moet worden in de actieve sequence (oranje onder 20 → Grokbot vragen),
    verstuurd → reacties → leads → setter calls → sales calls → gewonnen, en een overzicht per sequence;
  - `/admin/sales`:
  - leads-overzicht met de funnel;
  - knop "Nieuwe lead";
  - leadfiche met gegevens, volgende actie, opvolgdatum, notities, fase (voorlopig manueel)
    en "Lead lost" met reden en notitie;
  - lopende leads gesorteerd op opvolgdatum; achterstallige opvolging in het oranje.
- Andere teamleden (@iknowright.be) kunnen inloggen en zien een lege startpagina tot hun
  workflow in kaart is gebracht.

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

## Volgende stappen (sales)

Volgens de sales-workflow in Lucid:
1. ~~cold mails-dashboard (Apollo)~~ klaar;
2. sales-inbox (Gmail + AI-antwoorden);
3. boekingspagina en agenda;
4. lead-scan en scripts;
5. Record, Fireflies, Drive en analyse;
6. sales call plannen met reminders;
7. opvolging.

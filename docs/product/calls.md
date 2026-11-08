# Calls (admin `/admin/sales/calls`, enkel Casper)

## Wat Casper vroeg (7 nov 2026)
Alles rond setter- en sales calls op één plek (nu verspreid):
- Setter call = kort telefoontje. Record-knop, opname naar Fireflies; geen ppt; vaak wordt er al een datum
  voor de sales call gekozen die dan in de agenda moet. Lead bijwerken + feedback wel.
- Sales call = Google Meet. Lijst met komende calls (Meet-link, sales-ppt, context lead, later een script).
  "Call starten": Meet open + Fireflies via addToLiveMeeting (geen auto-join, "flimsy"); "Check Fireflies"
  met knop om toe te voegen als hij er niet in zit. Casper zegt mondeling dat er opgenomen wordt.
- "Call afgerond" / "Kwam niet opdagen" (no-show → mail klaarzetten om opnieuw te plannen). Cijfers bijhouden
  (opvraagbaar, niet tonen).
- Na de call: bedankmail ("bedankt voor de call, hier is de beloofde ppt") als concept, kort persoonlijk;
  ppt als Drive-link. Casper verstuurt zelf.
- Fireflies-webhook → transcript in de Drive (Sales / Sales calls / Fireflies) → lead bijwerken (context,
  volgende stap) → analyse door Grok Bot (hoe ging de call, wat goed / beter; generiek tot er een script is).
- Inbox: "Verstuur en plan in agenda" als er een datum afgesproken wordt; gewone Verstuur blijft. Later
  vervangen door een boekingspagina.
- Agenda: contact-agenda + uitnodiging voor tandloosispam (Casper maakt calls nu zelf in de contact-agenda en
  stuurt de Meet-link in zijn mail). Later een aparte "agenda"-feature (contact-agenda) — andere scope.

## Delen
1. **Klaar (PR):** calls-tabel, Calls-pagina, inplannen (inbox + pagina), detectie uit de contact-agenda,
   Call starten + Fireflies-check/toevoegen, Record (setter), afgerond / no-show (+ concept) / annuleren,
   cijfers (`calls_cijfers`), MCP-tools voor elke actie, contact@ volledige Drive-scope.
2. **Klaar:** bedankmail-concept na "Call afgerond" (sales), persoonlijk gemaakt zodra het transcript er is
   (enkel als Casper er nog niet aan zat).
3. **Klaar:** Fireflies-webhook `/api/fireflies/webhook` (HMAC, `FIREFLIES_WEBHOOK_SECRET`) → koppelen aan de call
   (client-referentie, Meet, deelnemer + tijd, titel + tijd; anders "ongekoppeld" voor Grok Bot) → Google Doc in
   Sales / Sales calls / Fireflies → call afronden als dat vergeten werd → AI-taak `call_verwerken`.
   Setter-opname: tijdelijk publiek voor Fireflies (`uploadAudio`), ingetrokken bij het transcript of na 24 uur.
4. **Klaar:** analyse in dezelfde taak (samenvatting, goed, beter, score, tips), op de Calls-pagina onder
   "Feedback van Grok Bot".
5. Later: script per soort call, boekingspagina.

## Regels
- Grok Bot verstuurt niets en nodigt niemand uit: `call_registreren` maakt geen agenda-item; annuleren via de
  bot haalt niets uit de agenda. Uitnodigen/annuleren in de agenda doet Casper met de knoppen.
- Fases enkel vooruit: gepland → setter/sales call gepland; afgerond → setter/sales call gehouden.

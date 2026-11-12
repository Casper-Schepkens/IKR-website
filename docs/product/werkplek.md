# Werkplek van Grok Bot

`/admin/werkplek` (zijbalk: **Grok Bot**): elk teamlid heeft een eigen plek waar Grok Bot dingen klaarzet en waar je per onderwerp verder kan praten.
- Iedereen ziet enkel zijn eigen werkplek.
- Casper kan voorlopig ook die van Cédric en Milan bekijken, als "(temp)".

## Kaarten
- **Soorten:** Wil ik bespreken, Brainstorm, Vraag, Update, Opdracht.
- **Status:** open, besproken, archief.
- **Draadje:** elke kaart heeft er een. Antwoord je, dan krijgt Grok Bot een AI-taak (`werkplek`) en antwoordt hij in het draadje.
- **Voorgestelde actie:** de knoppen **Doe maar** en **Nee**. Bij "Doe maar" voert Grok Bot de actie uit. Hij zet altijd enkel dingen klaar (concepten, to-do's, SOP-voorstellen …) en **verstuurt nooit iets**.
- **Opdracht** (bovenaan): wordt een kaart "Opdracht" en Grok Bot gaat ermee aan de slag.

## Na elke weekly
1. De weekly wordt afgesloten in het dashboard.
2. Fireflies verwerkt de opname (een paar minuten) en stuurt een webhook naar `/api/fireflies/webhook`. Een dagelijkse cron om 6u dient als vangnet.
3. Het dashboard herkent de weekly aan de titel en maakt de AI-taak `weekly_sops` (weekly verwerken). Met `IKR_AI_ENGINE=grokbot` wordt Cursor geport.
4. Grok Bot verwerkt het transcript:
   - **Per persoon** (Casper, Cédric, Milan) een kaart **"Verwerking weekly dd/mm"**: wat voor jou afgesproken is, 0-3 tips en, als het echt nuttig is, een actie met **Doe maar**.
   - **"@grokbot nieuwe SOP …"** wordt een SOP-voorstel.
   - **Elke andere "@grokbot …"** wordt een **Opdracht** bij wie het vroeg. Grok Bot gaat er meteen mee aan de slag en zet het resultaat in het draadje.

Dit werkt enkel voor online weeklies, met Fireflies in de Meet. Live weeklies worden opgenomen in de Drive, maar (nog) niet door Fireflies uitgeschreven.

## Proactief (geplande automation in Cursor)
Maak in Cursor een **geplande automation**, 2 à 3 keer per dag (bv. 8u, 13u en 17u), met de connector ikr-dashboard en deze prompt:

> Je bent Grok Bot van IKnowRight. Kijk of je iets kan doen voor Casper, Cédric en Milan.
> 1. Bekijk met werkplek_lijst wat er al open staat, zodat je niets dubbel klaarzet.
> 2. Kijk rond met de tools: productie_volgende_stappen (wat is te laat of moet deze week), weekly_overzicht, kalender, financien_betalingen, wachten_op_antwoord_lijst (enkel voor Casper), sops_zoeken.
> 3. Zet per persoon enkel wat echt nuttig is klaar met werkplek_kaart_aanmaken (bespreken, brainstorm, vraag of update). Wil je iets doen, geef dan een actie mee; de persoon klikt "Doe maar".
> 4. Max. 3 nieuwe kaarten per persoon per ronde. Verstuur nooit iets.

Antwoorden en goedgekeurde acties lopen via de bestaande AI-taken (webhook naar Cursor, `IKR_AI_ENGINE=grokbot`).

## MCP

| Tool | Doet |
|---|---|
| `werkplek_lijst` | kaarten per teamlid en status |
| `werkplek_kaart` | één kaart met het hele draadje |
| `werkplek_kaart_aanmaken` | iets klaarzetten, optioneel met een actie |
| `werkplek_reageren` | bericht in het draadje |
| `werkplek_kaart_bijwerken` | titel, tekst, status, actie aanpassen of als uitgevoerd markeren |

## Database
- Tabellen `bot_cards` en `bot_card_messages`.
- Schrijven gebeurt enkel via de server.
- Lezen (voor live verversen): enkel je eigen kaarten; Casper ziet alles.

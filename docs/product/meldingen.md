# Meldingsbadges

In de zijbalk staat een bolletje met een getal naast elk item waar iets op **jou** wacht.
- Bij 0 staat er niets, boven 9 staat er "9+".
- Het totaal staat ook in de tabtitel, bv. "(5) Klanten · IKR Admin".

| Pagina | Telt | Voor wie |
|---|---|---|
| Grok Bot | eigen open kaarten die nieuw zijn of een nieuw botbericht hebben (tot je ze opent), plus kaarten die op "Doe maar"/"Nee" wachten | iedereen |
| SOP's | voorstellen die nog op ✓/✕ wachten | iedereen |
| Weekly | eigen to-do's die niet af waren op een afgesloten weekly | iedereen |
| Productie | eigen stappen die te laat zijn (Milan ook die van de freelancer, Cédric die van de klant) | iedereen |
| Inbox | mailconcepten om te versturen | Casper |
| Calls | voorbije calls die nog afgerond moeten worden, plus transcripts die nog gekoppeld moeten worden | Casper |
| Leads | open leads met een opvolgdatum vandaag of eerder | Casper |
| Klanten | contracten die binnen 30 dagen aflopen of verlopen zijn | Casper |
| Financiën | klanten met een achterstallige betaling | Casper |

- **Berekening:** `src/lib/admin/notifications/` (pure telfuncties in `core.ts`, met tests), per gebruiker via `GET /api/meldingen`.
- **Gelezen:** bij de werkplek via `bot_cards.unread`. De bot zet die aan bij een nieuw bericht; de eigenaar die de kaart opent, zet ze uit.
- **Verversen:**
  - bij het laden en bij navigeren;
  - elke 30 seconden;
  - live via Realtime (`bot_cards`, `bot_card_messages`, `sops`, `weekly_todos`, `mail_drafts`, `calls`, `production_steps`);
  - meteen na het openen van een kaart of het beslissen over een voorstel.
- **MCP:** `meldingen_overzicht` (per teamlid, enkel lezen).

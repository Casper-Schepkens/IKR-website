# Financiën

`/admin/financien`: overzicht van de cijfers van IKR per maand, kwartaal of jaar. Zichtbaar voor het hele team.

## Bron
- **Odoo** (iknowright.odoo.com), JSON-2 API, **enkel lezen** (`search_read`). Odoo wordt nooit aangepast.
- In Odoo zijn de bankregels niet afgeletterd (alles staat op 499000 Suspense) en er zijn bijna geen facturen. Daarom deelt het dashboard de **banktransacties** zelf in met regels (kasbasis).
- De sync gebeurt bij het openen van de pagina, hoogstens om de 30 minuten, of meteen met de knop "Odoo bijwerken". Transacties en indeling staan in `finance_transactions`, het banksaldo in `finance_state`.

## Indeling
- Inkomsten: klant, inbreng vennoot, terugbetaling, andere inkomsten.
- Uitgaven: freelancers, boosting, marketing, tools, boekhouder, onkosten vennoten (betalingen aan Casper/Cedric/Milan), vervoer, eten en andere onkosten, materiaal, overheid, andere uitgaven, en btw (apart).
- Standaardregels staan in `src/lib/admin/finance/core.ts`. Eigen regels (`finance_rules`, "voortaan altijd zo") gaan altijd voor.
- Wat geen regel heeft, staat onder **Nog in te delen**. Een handmatige indeling blijft staan bij elke sync.

## Cijfers
- Omzet = betalingen van klanten **excl. btw** (÷ 1,21). Btw op de omzet en btw-betalingen staan apart en zijn geen kost.
- "Over" = omzet − alle kosten (zonder btw) + terugbetalingen + andere inkomsten. Inbreng van vennoten telt niet mee.
- **Per klant**:
  - ontvangen = volgens de bank;
  - contract, freelancer en boosting = volgens het contract (Klanten-pagina), maal het aantal actieve contractmaanden in de periode.

## Betalingen klanten
Per klant met een maandbedrag en een contractstart controleert het dashboard elke maand of het contractbedrag binnenkwam (maandbedrag × 1,21).
- De betalingen worden op volgorde over de contractmaanden verdeeld, dus een late of dubbele betaling vult eerst de oudste open maand.
- Een maand is **achterstallig** als hij 21 dagen na het einde van de maand (de betalingstermijn uit de contracten) niet helemaal betaald is.
- Een betaling die geen 1-, 2- of 3-voud van het maandbedrag is, komt bij **afwijkend bedrag**.
- MCP: `financien_betalingen`.

## Contract per klant (Klanten)
De velden zijn: contractstart, maandbedrag (excl. btw), freelancer per maand, boosting per maand en de naam op de bank als die afwijkt (bv. Oh!Ma betaalt als "V.S.A. Foods").

## MCP
| Tool | Doet |
|---|---|
| `financien_overzicht` | cijfers per periode |
| `financien_transacties` | lijst met filters |
| `financien_indelen` | één transactie indelen, optioneel als regel |
| `financien_betalingen` | betalingscheck per klant |
| `financien_bijwerken` | nu syncen |

`klant_aanmaken`/`klant_bijwerken` kennen `maandbedrag`, `freelancer_kost`, `boosting`, `contract_start` en `bank_naam`.

## Instellen
Zet `ODOO_API_KEY` in Vercel (Sensitive, Production). Optioneel: `ODOO_URL` en `ODOO_DB`.

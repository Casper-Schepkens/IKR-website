# Productie

`/admin/productie`: het contentproces per klant zoals Cédric het uitlegde. Het is de single source of truth voor wat de volgende stap is.
- Gemaakt voor **Cédric** (strategie) en **Milan** (creatief).
- **Casper** (contract) ziet alles voorlopig ook. Wat later voor hem verdwijnt, staat als "(temp)".

## Proces
**Opstart** (één keer per klant):

| Stap | Wie | Deadline |
|---|---|---|
| Contract in de groep en de Drive | Casper | getekend + 7 d |
| WhatsApp-groep | Cédric | getekend + 7 d |
| Freelancer regelen | Milan | getekend + 7 d |
| Kick-off plannen | Cédric | vanzelf af zodra de kick-off-datum ingevuld is |
| Kick-off | Cédric | kick-off |
| Strategie + ppt | Cédric | kick-off + 14 d |
| Eerste ideeën | Milan | kick-off + 14 d |
| Strategiemeeting | Cédric | ingevulde datum, anders kick-off + 14 d |
| Feedbackronde verwerken | Cédric | strategiemeeting + 7 d |

**Per draaidag** (cyclus, herbegint telkens):

| Stap | Wie | Deadline |
|---|---|---|
| Draaidag plannen | Cédric | vanzelf af zodra de datum ingevuld is |
| Ideeën uitschrijven | Milan | draaidag − 8 |
| Briefing | Cédric | draaidag − 7 |
| Greenlight | klant | draaidag − 5 |
| Draaidag | freelancer | draaidag |
| Montage | freelancer | draaidag + 7 |
| Revisieronde | klant | draaidag + 14 |
| Aanpassingen, eerste video online en contentplanning | freelancer | draaidag + 21 |

Je vult enkel de ankerdata in (getekend, kick-off, strategiemeeting, draaidag). De rest wordt berekend. Elke stap kan een eigen deadline, link of notitie krijgen.

## Pagina
- **Volgende stappen** per persoon (Cédric / Milan / Casper), op deadline:
  - Milan volgt de stappen van de freelancer op, Cédric die van de klant.
  - Je ziet enkel wat nu aan de beurt is, niet het hele proces.
- **Per klant:**
  - de fase, een voortgangsbalk, de volgende stap met wie en de deadline;
  - open je een klant: alle stappen, de data, de draaidagen, "We zitten nu bij …" en pauzeren;
  - afgewerkte blokken staan ingeklapt.
- **Draaidagen** komen als hele-dag-item in de contact@-agenda, met uitnodigingen voor het team (zie de uitnodigingsadressen in Instellingen).

## Grokbot (MCP)

| Tool | Doet |
|---|---|
| `productie_overzicht` | fase en wat nu aan de beurt is, voor alle klanten |
| `productie_klant` | alle stappen van één klant |
| `productie_volgende_stappen` | wat één teamlid nu moet doen |
| `productie_starten` | productie starten voor een klant |
| `productie_startpunt` | "we zitten nu hier" |
| `productie_datum` | een ankerdatum zetten |
| `productie_draaidag_toevoegen` | nieuwe draaidag |
| `productie_draaidag_verwijderen` | draaidag weg |
| `productie_stap` | afvinken, deadline, link, notitie |
| `productie_pauzeren` | productie (de)activeren |

Voorbeeld: "grokbot, Tempus zit aan de briefing voor draaidag 4, draaidag is 17/11 om 9u30".

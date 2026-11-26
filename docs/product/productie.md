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

## Ideeëndoc na elke draaidag (Grok Bot)
Na elke draaidag zet het dashboard zelf een AI-taak `ideeendoc` klaar. Grok Bot maakt dan in de klantmap een Google Doc
"[Klant] – contentideeën draaidag [n+1]" (5 à 6 formats met hook, structuur, wie/wat in beeld, wat nodig is en 2 à 3
gecontroleerde TikTok-referenties; geen verzonnen cijfers). Er wordt niets verstuurd.

- **Trigger:** dagelijkse cron `/api/cron/ideeendocs` (06:15 UTC). Een draaidag is voorbij als de datum vóór vandaag ligt
  **of** de stap van de draaidag zelf op af staat (wat eerst komt). Beide, omdat de draaidagstap van de freelancer vaak niet
  afgevinkt wordt (dan telt de datum), en een draaidag zonder datum enkel via het afvinken voorbij kan zijn. Enkel de laatste
  voorbije draaidag per klant telt, en hoogstens 14 dagen geleden: oude draaidagen krijgen bij de eerste run geen taak.
  Gepauzeerde producties worden overgeslagen.
- **Idempotent:** één taak per klant + draaidag via `ref = ideeendoc:<client_id>:<nr>` en de unieke index op
  `ai_jobs (type, ref)`. De taak wordt eerst geclaimd; pas daarna maakt die ene run draaidag n+1 aan. Ook een weggeklikte taak
  telt als "bestaat al".
- **Draaidag n+1:** bestaat hij nog niet, dan wordt hij aangemaakt (in het wijzigingslog): zonder datum, of met een ritme meteen
  met de berekende datum (zodat de ritmeplanning niet overgeslagen wordt).
- **Opdracht:** klant, draaidag n en n+1, klantfiche (doel, niche, doelgroep, beschikbaar), wat al gefilmd/gepost is (notities en
  links van eerdere draaidagen + eerdere ideeëndocs), de Drive-map en de stap `ideeen_uitwerken` van n+1.
- **Resultaat** (`doc_url`, `doc_titel`, `samenvatting`, `map_id`): het dashboard zet `doc_url` als link op
  `ideeen_uitwerken` van draaidag n+1 met de notitie "Ideeëndoc klaar door Grok Bot" (achter een bestaande notitie) en zet een
  prikbordkaartje voor @milan. Verder wordt niets aangepast.
- **Engine:** `ideeendoc` loopt altijd via Grok Bot (ook als `IKR_AI_ENGINE` op api staat): het heeft Drive-tools nodig.
- **Klantfiche:** nieuwe kolommen op `clients` (`content_goal`, `niche`, `audience`, `available`, `drive_folder_id`), te zetten
  met `klant_bijwerken`. Leeg = Grok Bot zoekt het zelf op in de Drive.
- **MCP:** `drive_doc_aanmaken` (map_id, titel, markdown → doc_url; bestaat er al een doc met die titel in de map, dan wordt dat
  teruggegeven).

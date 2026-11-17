# IKR WhatsApp-bridge (read-only)

Leest WhatsApp mee als **gekoppeld apparaat** (Baileys) en bewaart berichten in Supabase, zodat het
dashboard en Grok Bot (`whatsapp_gesprekken`) gesprekken met leads en klanten kunnen lezen.

**Read-only, zonder uitzondering:**

- De bridge verstuurt nooit berichten. Alle methodes die iets versturen, als gelezen markeren, je
  status of profiel aanpassen of groepen wijzigen, zijn na het opstarten uitgeschakeld (`lockDown`).
  Een test in CI controleert ook de broncode.
- `markOnlineOnConnect: false`: je staat nooit "online" door de bridge. WhatsApp krijgt enkel de
  automatische ontvangstbevestiging van een inactief toestel, nooit "gelezen" (blauwe vinkjes).
- Enkel chats die in het dashboard (**WhatsApp**) op **actief** staan, worden bewaard. Van andere chats
  komt enkel de naam en het tijdstip van het laatste bericht in `whatsapp_chats` (om ze te kunnen
  koppelen), nooit de inhoud. Hetzelfde geldt voor de historiek-sync.
- Status-updates, nieuwsbrieven en broadcastlijsten worden genegeerd.

## Hoe het werkt

1. De bridge detecteert chats (personen en groepen) en zet ze in `whatsapp_chats` met `actief = false`.
2. In het dashboard (**WhatsApp**) koppel je een chat aan een lead of klant en zet je hem op actief.
3. Binnen 30 seconden bewaart de bridge nieuwe berichten van die chat in `whatsapp_berichten`.

Oudere berichten van een chat die je later actief zet, komen niet vanzelf binnen. Twee opties:

- `HISTORIEK_OPVRAGEN=true`: voor een pas geactiveerde chat vraagt de bridge je **eigen telefoon** om
  de laatste 50 berichten (WhatsApp "history sync on demand"). Dat is een synchronisatieverzoek naar je
  eigen toestel, geen bericht aan iemand anders, maar het staat standaard uit. Je telefoon moet online zijn.
- Of: zet de chats eerst actief en koppel de bridge daarna opnieuw (eventueel met
  `VOLLEDIGE_HISTORIEK=true`); de historiek-sync bij het koppelen bewaart dan die chats.

## Namen

- Groepsnamen haalt de bridge zelf op bij het verbinden en elke 6 uur (een leesvraag aan WhatsApp; verstuurt niets).
- Namen van personen komen uit je adresboek (gaat voor) of uit hun WhatsApp-naam, en worden bewaard in
  `/data/namen.json`, zodat ze een herstart overleven. WhatsApp stuurt het adresboek maar één keer: bij
  het koppelen. Ontbreken er namen na een update, koppel dan één keer opnieuw.
- Chats met een anoniem id (`@lid`) krijgen het echte nummer zodra WhatsApp het meegeeft.
- In het dashboard kan je elke chat ook zelf een naam geven.

## Deployen op fly.io

Eén machine (WhatsApp laat één sessie per koppeling toe) met een volume op `/data` voor de koppeling.

```bash
cd whatsapp-bridge
fly apps create ikr-whatsapp-bridge
fly volumes create wa_auth --region lhr --size 1
fly secrets set SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… QR_SECRET=…
fly deploy --ha=false
fly scale count 1
```

- `QR_SECRET`: minstens 16 tekens (bv. `openssl rand -hex 24`). Zonder secret is `/qr` uit.
- Koppelen: open `https://ikr-whatsapp-bridge.fly.dev/qr?secret=<QR_SECRET>` (of kijk naar de QR-code
  in `fly logs`) en scan via WhatsApp → Instellingen → Gekoppelde apparaten → Apparaat koppelen.
- Ontkoppelen kan altijd op de telefoon (Gekoppelde apparaten). De bridge wist dan zijn sleutels en
  toont een nieuwe QR-code.

### Omgevingsvariabelen

| Naam | Verplicht | Uitleg |
| --- | --- | --- |
| `SUPABASE_URL` | ja | URL van het Supabase-project |
| `SUPABASE_SERVICE_ROLE_KEY` | ja | service role (schrijft enkel naar `whatsapp_chats` en `whatsapp_berichten`) |
| `QR_SECRET` | aanbevolen | beschermt `/qr` (header `Authorization: Bearer …`, `x-qr-secret` of `?secret=`) |
| `AUTH_DIR` | nee | standaard `/data/auth` |
| `PORT` | nee | standaard `8080` |
| `HISTORIEK_OPVRAGEN` | nee | `true` = oudere berichten opvragen bij het activeren van een chat (standaard uit) |
| `VOLLEDIGE_HISTORIEK` | nee | `true` = volledige historiek-sync bij het koppelen (standaard uit) |
| `TEAM_NUMMERS` | nee | nummers van de andere teamleden, komma-gescheiden (bv. `+32470…,+32471…`): groepen waar het hele team in zit, komen bovenaan in het dashboard |
| `LOG_LEVEL` | nee | standaard `info` |

### Routes

- `GET /health`: status (geen gegevens), voor de fly-check.
- `GET /qr`: QR-code om te koppelen, enkel met `QR_SECRET`.

## Lokaal

```bash
npm install
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… QR_SECRET=… AUTH_DIR=./auth npm run dev
npm test
```

## Let op

Baileys is geen officiële WhatsApp-API. WhatsApp kan gekoppelde apparaten van onofficiële clients in
uitzonderlijke gevallen blokkeren. Omdat de bridge enkel leest en nooit verstuurt, is dat risico klein,
maar niet nul.

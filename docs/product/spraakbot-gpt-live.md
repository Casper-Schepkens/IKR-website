# Spraakbot op GPT-Live (plan, nog niet gebouwd)

Status: uitgewerkt op 20 nov 2026. De spraakbot draait nu op de Realtime API (`gpt-realtime`, zie `src/lib/admin/voice/` en `src/components/admin/voice/`). Dit plan beschrijft de overstap naar GPT-Live.

**Let op:** de volledige OpenAI-documentatie kon niet gelezen worden vanuit de sessie waarin dit plan geschreven werd. Wat hieronder staat komt uit zoekresultaten (OpenAI, Microsoft Foundry). Alles onder "Nakijken in de docs" moet bevestigd worden voor we bouwen.

## Wat GPT-Live anders maakt

- **Full-duplex:** luistert en praat tegelijk. Voelt als bellen: je kan "mm-hm" zeggen of onderbreken zonder dat hij stilvalt.
- **Eigen protocol:** `POST /v1/live/sessions`, niet de Realtime API. Modellen: `gpt-live-1`, en volgens de modelpagina ook `gpt-live-1.1`.
- **Denkt en gebruikt geen tools zelf.** Het werk gaat naar een **backend agent** (delegatie). Er zijn twee soorten:
  - `{ type: "client" }` (standaard): het gedelegeerde werk komt bij onze app binnen via het datakanaal.
  - `{ type: "responses", responses: {…} }`: OpenAI draait de agent zelf via de Responses API.
- **Het model bepaalt zelf zijn beurten:** de app kan geen antwoord starten of afbreken.
- **Geen tijdelijke sleutel in de browser** (volgens Microsoft): de browser maakt een SDP-offer, onze server wisselt die uit bij OpenAI met de API-sleutel. Bij het opstarten wordt 15 seconden aangerekend.
- **Sideband:** een server kan zich met een websocket aan een lopende sessie hangen (`/sessions/{id}/attach`).
- **Prijs:** $0,05 per minuut voor de spraaklaag (Vercel vermeldt $3 per sessie-uur). Daarbovenop komt de backend agent (tokens van het model dat we kiezen).

## Hoe het bij ons zou werken

```
Browser (microfoon, WebRTC)
  │ 1. SDP-offer → /api/spraak/sessie
  │                    └─ server: POST /v1/live/sessions (API-sleutel, instructies, delegatie: client)
  │ 2. audio ⇄ OpenAI (GPT-Live, full-duplex)
  │ 3. datakanaal: "gedelegeerde taak" ──→ /api/spraak/opdracht (onze backend agent)
  │                                          └─ model + 112 MCP-tools (zelfde als nu)
  │ 4. resultaat ←──────────────────────────┘ terug in het datakanaal
  │ 5. transcripts → /api/spraak/bericht (chat met 🎙, zoals nu)
```

1. **Sessie starten** (`/api/spraak/sessie`): eerst limiet nakijken (zoals nu), dan stuurt de browser zijn SDP-offer mee en zet de server de sessie op bij OpenAI. Het antwoord-SDP gaat terug. De API-sleutel blijft op de server (dat is nu ook al zo).
2. **Delegatie: `client`** (aanrader). Komt er een taak binnen via het datakanaal, dan stuurt de browser die naar `/api/spraak/opdracht`. Dat werkt op Vercel, zoals nu.
   - *Sideband* (server hangt zich aan de sessie) is netter, maar heeft een langlopende websocket nodig. Op Vercel kan dat niet; het zou een aparte dienst moeten worden zoals de WhatsApp-bridge op fly.io. Niet nodig voor de eerste versie.
   - *`responses`* (OpenAI draait de agent zelf, met onze MCP-server als tool) is het minste werk, maar dan bepaalt OpenAI wanneer er gewijzigd wordt en kunnen wij de bevestiging niet afdwingen. Niet doen.
3. **Backend agent** (`/api/spraak/opdracht`, nieuw): een korte tool-loop op onze server met een snel tekstmodel en dezelfde 112 tools (via `toolCatalog()` / `runMcpTool()` uit `src/lib/admin/voice/tools.ts`). Hij geeft een kort antwoord terug dat GPT-Live uitspreekt.
   - Modelkeuze: snel en goedkoop (bv. een mini-model van OpenAI, of Claude via de bestaande Anthropic SDK). Latency is belangrijker dan diepgang; zwaar werk gaat naar Grok Bot.
4. **Bevestiging (blijft afgedwongen door de server):** schrijftools geven `wacht_op_bevestiging` terug, de kaart met Bevestig / Annuleer verschijnt, en GPT-Live vraagt "is dat oké?". Op een "ja" komt er een nieuwe taak binnen; de agent roept `actie_bevestigen` aan en de server voert pas dan uit (`claimPending` / `runAction`, zoals nu).
5. **Grok Bot:** `grokbot_vragen` blijft een tool van de backend agent. Het antwoord van Grok Bot moet tijdens het gesprek in de context van GPT-Live komen; hoe dat gaat zonder dat de app een antwoord kan starten, moet nog uit de docs blijken (zie onder).
6. **Afschrift en verbruik:** transcripts uit het datakanaal → `/api/spraak/bericht`. Verbruik wordt **per minuut** (spraaklaag) plus **tokens** (backend agent). `voice_usage.kind` krijgt er `live_minuten` en `agent` bij; `pricing.ts` krijgt een minuutprijs.

## Kosten

- Spraaklaag: $0,05/min ≈ $3 per uur dat het gesprek openstaat. **Als stilte ook meetelt** (nakijken!), kost een vergeten open microfoon het meest. Daarom: stop automatisch na 60–90 s stilte in plaats van 2 min, en de limiet blijft.
- Backend agent: per vraag ~15k teksttokens aan tooldefinities (gecachet goedkoop) plus de toolresultaten. Met een mini-model is dat ~$0,002–0,01 per vraag.
- €2 per dag ≈ 40 minuten open gesprek voor het hele team. Op Realtime is dat nu ~25–35 vragen.

## Wat blijft en wat verandert

| Blijft | Verandert |
|---|---|
| Alle tools, bevestiging via de server, `grokbot_vragen`, `open_pagina` | `/api/spraak/sessie` (SDP via de server in plaats van een tijdelijke sleutel) |
| Daglimiet, Instellingen-overzicht, afschrift met 🎙 | `useVoice.ts`: ander protocol en andere events |
| Tabellen (`voice_*`) | Nieuwe route `/api/spraak/opdracht` (backend agent) |
| Microfoonknop en kaartjes | `pricing.ts`: per minuut + tokens van de agent |

Inschatting: 2 à 4 dagen, waarvan de helft testen met echte gesprekken.

## Nakijken in de docs voor we bouwen

1. Exacte event-namen en JSON van het datakanaal: gedelegeerde taak, resultaat terugsturen, transcripts, verbruik. Bron: [Microsoft GPT-Live event reference](https://learn.microsoft.com/en-us/azure/foundry/openai/gpt-live-reference), [OpenAI WebRTC-gids (Live)](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live).
2. **Informatie meegeven tijdens het gesprek** (Grok Bot antwoordde, knop bevestigd) als de app geen antwoord kan starten: kan dat met een context-event of een sessie-update, en spreekt hij het dan uit?
3. **Aanrekening:** telt stilte mee in de minuutprijs?
4. Nederlands/Vlaams en de beschikbare stemmen; kunnen we de stem in Instellingen blijven kiezen?
5. `gpt-live-1` of `gpt-live-1.1`: welke is beschikbaar voor ons account, en wat zijn de limieten op gelijktijdige sessies?
6. Maximale gesprekduur en hoe een sessie netjes afsluit.

Bronnen: [OpenAI modelpagina GPT-Live-1](https://developers.openai.com/api/docs/models/gpt-live-1), [GPT-Live-1.1](https://developers.openai.com/api/docs/models/gpt-live-1.1), [aankondiging](https://openai.com/index/introducing-gpt-live-1-in-the-api/), [Microsoft: GPT-Live via WebRTC](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/gpt-live-webrtc), [Pydantic AI](https://pydantic.dev/docs/ai/realtime/openai-live/), [LiveKit](https://docs.livekit.io/agents/models/realtime/gpt-live).

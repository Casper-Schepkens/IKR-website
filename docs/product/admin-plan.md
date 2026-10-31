# IKR Admin: plan & status

> **Status (31 okt 2026):** fase 1 en grote delen van fase 2–4 zijn gebouwd. Setup in [`admin-setup.md`](admin-setup.md).
> Dit plan vervangt het eerdere CMS-achtige plan (magic link, media library, cases uit de DB). Dat valt nu onder "later".

## Wat het is

Een intern dashboard op `iknowright.be/admin`. Het is niet vindbaar (`robots.txt` disallow, `noindex`-header en metadata, geen sitemap-entry) en afgeschermd met Google-login (alleen `@iknowright.be` + whitelist). Elke klant heeft een dossier waar alles aan hangt: fase, contacten, notities, contract, facturen, ideeën, decks, draaidagen en resultaten. Overal zit AI (Claude) in, met gedeelde IKR-context.

## Architectuur

```
iknowright.be (Next.js 16 op Vercel)
├─ publieke site (ongewijzigd)  ──formulieren──▶ lead + form_submission (service role, via after())
└─ /admin  (src/app/admin)
     ├─ proxy.ts: sessie verversen + niet-ingelogd → /admin/login, X-Robots-Tag
     ├─ (app)/layout: requireAdmin() → sidebar
     ├─ actions.ts: alle server actions (CRUD + AI)
     └─ lib/admin
          ├─ data/repo.ts   interface; supabase.ts (RLS, sessie van gebruiker) | demo.ts (geheugen)
          ├─ ai/run.ts      IKR-brein (gecachet) + klantcontext + taak → gestructureerde output, gelogd in ai_runs
          ├─ ai/tasks.ts    ideeën, uitwerken, samenvatten, mails, briefing, draaiboek, assistent, analyse
          ├─ ai/decks.ts    pptx via Claude code execution + pptx-skill (+ template via Files API)
          ├─ integrations/  billit.ts, tiktok.ts
          ├─ todos.ts       actiepunten berekend uit de data (geen aparte takenlijst)
          └─ billing.ts     factuurdata, looptijd
Supabase: Postgres + Auth (Google) + Storage (templates, decks). Schema: supabase/migrations/.
Cron: /api/cron/admin-daily (facturen klaarzetten, te laat markeren, TikTok-stats).
```

**AI-context in 3 lagen:** (1) IKR-kennis uit `/admin/kennis`, met prompt caching; (2) klantprofiel + eerdere ideeën (incl. afgekeurde met reden) + recente activiteit; (3) de taak. Afgekeurde ideeën met feedback komen automatisch in het klantprofiel (leerlus).

## Status per module

| Module | Status |
|---|---|
| Login (Google via Supabase), noindex, demomodus | ✅ |
| Vandaag: AI-briefing, KPI's, actiepunten met AI-knoppen, agenda, pipeline | ✅ |
| Klanten + dossier (overzicht, ideeën, decks, contract, notities, gegevens/AI-profiel) | ✅ |
| Pipeline-kanban (slepen + dropdown, dagen in fase, AI-tip voor blijvende leads) | ✅ |
| Formulieren → lead (contact: alleen bedrijven; pricing: altijd) | ✅ |
| Ideeën: genereren, uitwerken, herschrijven, bewerken, goed-/afkeuren met leerlus | ✅ |
| Decks: "Maak presentatie" (achtergrond, polling, download) + template-upload | ✅ (te testen met echte API-sleutel + template) |
| Kalender: weekweergave, afspraken, AI-draaiboek, facturen op de kalender | ✅ eigen kalender · ⏳ Google Calendar-sync |
| Contracten: looptijd, volgende factuur, facturen klaarzetten, statussen | ✅ |
| Billit: concept-factuur aanmaken | ✅ code · ⚠️ headers/flow verifiëren met sandbox |
| Resultaten: KPI's, views/week, top-video's, per klant, AI-analyse | ✅ UI · ⏳ echte data na TikTok-app |
| TikTok OAuth per klant + dagelijkse sync | ✅ code · ⏳ TikTok-app + review |
| IKR-kennis (bewerkbaar) | ✅ |
| Instellingen: koppelingsstatus, toegang, templates | ✅ |
| Assistent (⌘K) | ✅ alleen lezen · ⏳ acties uitvoeren (tool use) |

## Volgende stappen

1. **Setup** volgens `admin-setup.md` (Supabase, Google, Claude-sleutel). Daarna echte klanten invoeren.
2. **IKR-kennis invullen.** Dit bepaalt hoe goed alle AI-output is.
3. **Google Calendar-sync:** draaidagen en calls tweerichtingen syncen (service account op een gedeelde agenda).
4. **Assistent met acties:** ⌘K mag ook dingen doen ("plan draaidag", "zet Wasbar op Live"), met bevestiging.
5. **Maandrapport-deck** uit resultaten (zelfde deck-pipeline, ander template).
6. **MCP-server / claude.ai-connector** zodat het dashboard ook vanuit de Claude-app bevraagd kan worden.
7. **Klant-deellinks** om ideeën te laten goedkeuren.
8. Later: cases/testimonials uit de DB (oud plan), media library.

## Risico's / aandachtspunten

- **Vercel Hobby** is niet voor commercieel gebruik en heeft kortere functietijden. Decks (1–4 min) hebben Pro nodig (`maxDuration = 300`).
- **Kosten Claude API:** maandlimiet zetten. Decks zijn de duurste taak.
- **TikTok Display API** vraagt app-review. Diepere stats (watch time) vragen mogelijk de Business API.
- **Klantdata naar Anthropic:** opnemen in het verwerkersregister.

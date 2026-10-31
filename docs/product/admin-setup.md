# IKR Admin — setup

Stap voor stap om `/admin` live te zetten. Zonder deze stappen draait `/admin` **lokaal in demomodus** (voorbeelddata, niets wordt bewaard). In productie toont `/admin` zonder Supabase alleen een "niet geconfigureerd"-melding.

Alle variabelen staan ook in [`.env.example`](../../.env.example). Zet ze in **Vercel → Project → Settings → Environment Variables** (Production + Preview) en lokaal in `.env.local`.

---

## 1. Supabase (database + login) — verplicht

> ✅ **Gedaan (31 okt 2026):** project `IKR` (`inmhplytfppamsriipuo`, eu-west-1). Beide migraties zijn toegepast. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `SUPABASE_SERVICE_ROLE_KEY` staan in Vercel. Nog te doen: stap 2 (Google-login) en e-mail/wachtwoord-login uitzetten in Supabase.

1. Maak een project op [supabase.com](https://supabase.com) (regio: Frankfurt `eu-central-1`, dicht bij België en GDPR-vriendelijk).
2. **SQL Editor** → plak en draai [`supabase/migrations/20261031000000_admin_core.sql`](../../supabase/migrations/20261031000000_admin_core.sql).
   - Maakt alle tabellen, RLS-regels, de opslagbuckets `templates` en `decks`, en startinhoud voor het IKR-brein.
   - Gebruik je een niet-`@iknowright.be`-adres (bv. gmail)? Voeg het toe onderaan de migratie:
     `insert into public.admin_users (email, name) values ('jij@gmail.com', 'Casper');`
3. **Project Settings → API**: kopieer
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (geheim, nooit in de browser)

## 2. Google-login — verplicht

1. [Google Cloud Console](https://console.cloud.google.com) → nieuw project "IKR Admin" → **APIs & Services → OAuth consent screen**: type **Internal** (alleen jullie Workspace-accounts).
2. **Credentials → Create OAuth client ID → Web application**
   - Authorized redirect URI: `https://<jouw-project>.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Providers → Google**: plak Client ID + Secret, zet aan.
4. Supabase → **Authentication → URL Configuration**:
   - Site URL: `https://iknowright.be`
   - Redirect URLs: `https://iknowright.be/admin/auth/callback`, `http://localhost:3000/admin/auth/callback`, en eventueel je Vercel-preview-URL's (Supabase ondersteunt wildcards, bv. `https://ikr-website-*.vercel.app/admin/auth/callback`).
5. Toegang: iedereen met `@iknowright.be` mag binnen. Extra adressen → `IKR_ADMIN_EMAILS` (komma-gescheiden) **én** de tabel `admin_users`.

## 3. Claude API (alle AI-knoppen)

1. [platform.claude.com](https://platform.claude.com) → API Keys → nieuwe sleutel → `ANTHROPIC_API_KEY`.
2. Zet een **maandlimiet** in de Console (Billing → Limits).
3. Let op: dit staat los van jullie claude.ai-abonnementen. De API wordt per gebruik betaald.
4. Optioneel: `IKR_AI_MODEL` om een ander model te kiezen (standaard `claude-opus-5-5`).

## 4. Dagelijkse job

`CRON_SECRET` bestaat al (wekelijkse analytics-mail). De nieuwe job `/api/cron/admin-daily` (elke dag 05:00 UTC, zie `vercel.json`) gebruikt dezelfde sleutel en:
- zet facturen van de komende 14 dagen klaar,
- zet verstuurde facturen van > 30 dagen oud op "te laat",
- haalt TikTok-statistieken op.

## 5. Billit (facturen) — optioneel

1. MyBillit → je **API-sleutel** en **PartyID** (sandbox en productie hebben een andere PartyID).
2. Zet `BILLIT_API_KEY` en `BILLIT_PARTY_ID`. Test eerst met `BILLIT_API_BASE=https://api.sandbox.billit.be`.
3. Vul per klant het **btw-nummer** en **facturatie-e-mail** in (Klantdossier → Gegevens).
4. "Concept in Billit" maakt een verkoopfactuur aan (`POST /v1/orders`). Verzenden via Peppol doe je in Billit zelf.
5. ⚠️ Te verifiëren met de sandbox: de headernamen `ApiKey` / `PartyID` (Billit-docs noemen ze niet letterlijk). Werkt het niet, pas `src/lib/admin/integrations/billit.ts` aan.
6. Billit vermeldt dat API-sleutels voor "niet-commerciële integraties" zijn. Voor een eigen intern dashboard is dat normaal ok, maar check het met Billit support. Alternatief is hun OAuth-flow.

## 6. TikTok (resultaten) — optioneel

1. [developers.tiktok.com](https://developers.tiktok.com) → app aanmaken → producten **Login Kit** + **Display API** (scopes `user.info.basic`, `video.list`).
2. Redirect URI: `https://iknowright.be/admin/auth/tiktok/callback`.
3. `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET` instellen. TikTok laat de app eerst reviewen voor productie.
4. Per klant: Klantdossier → Gegevens → **Koppel TikTok-account** → inloggen met het account van de klant.

## 7. Templates voor decks

Instellingen → **Presentatie-templates** → upload jullie .pptx. Tip: zet plaatshouders zoals `{{klant}}` en `{{idee_titel}}` in de slides. Dan blijft de lay-out exact behouden.

---

## Lokaal ontwikkelen

```bash
npm run dev
```

Open `http://localhost:3000/admin`. Zonder `.env.local`-Supabase-variabelen krijg je de demomodus. Met `ANTHROPIC_API_KEY` in `.env.local` werken de AI-knoppen ook in demomodus.

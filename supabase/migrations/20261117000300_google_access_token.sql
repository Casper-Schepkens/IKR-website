-- Audit P11: het Google-access token delen tussen serverinstanties (versleuteld met IKR_TOKEN_KEY), zodat een
-- koude start niet eerst Google om een nieuw token moet vragen (1.236 keer in 16 dagen). Zonder deze kolommen
-- werkt de app zoals vroeger.
alter table public.google_connections add column if not exists access_token_enc text;
alter table public.google_connections add column if not exists access_token_expires_at timestamptz;

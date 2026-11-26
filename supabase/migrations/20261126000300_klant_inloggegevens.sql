-- Inloggegevens per klant (TikTok, Instagram, Meta Business, ...): op één plek voor het vaste team.
--
-- Beveiliging:
-- * Het wachtwoord staat enkel versleuteld in password_enc (AES-256-GCM in de app, sleutel IKR_CREDENTIALS_KEY
--   in Vercel; zie src/lib/admin/crypto.ts). De database kent de sleutel niet en weigert alles wat niet in
--   het versleutelde formaat staat (check hieronder), dus klare tekst kan er niet per ongeluk in.
-- * has_password laat de lijst zien óf er een wachtwoord is zonder password_enc op te halen.
-- * RLS: enkel Casper, Cédric en Milan (actief in team_members). Niet voor extra admins via
--   IKR_EXTRA_ADMIN_EMAILS, freelancers of klanten. Niet in supabase_realtime.
-- * De MCP-tools (Grok Bot) hebben geen toegang: er is geen tool voor deze tabel.

create or replace function public.is_core_team()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_team_member()
    and lower(coalesce(auth.jwt() ->> 'email', '')) in ('casper@iknowright.be', 'cedric@iknowright.be', 'milan@iknowright.be')
$$;
revoke execute on function public.is_core_team() from public, anon;
grant execute on function public.is_core_team() to authenticated, service_role;

create table if not exists public.klant_inloggegevens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  platform text not null check (char_length(platform) between 1 and 100),
  username text check (char_length(username) <= 320),
  -- c1.<iv>.<tag>.<data> (base64url); nooit klare tekst.
  password_enc text check (password_enc ~ '^c1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$' and char_length(password_enc) <= 4000),
  has_password boolean generated always as (password_enc is not null) stored,
  note text check (char_length(note) <= 2000),
  created_by text,
  created_at timestamptz not null default now(),
  updated_by text,
  updated_at timestamptz not null default now()
);
create index if not exists klant_inloggegevens_client_idx on public.klant_inloggegevens (client_id);

alter table public.klant_inloggegevens enable row level security;
revoke all on table public.klant_inloggegevens from anon;
drop policy if exists core_team_all on public.klant_inloggegevens;
create policy core_team_all on public.klant_inloggegevens for all to authenticated
  using (public.is_core_team()) with check (public.is_core_team());

drop trigger if exists touch_updated_at on public.klant_inloggegevens;
create trigger touch_updated_at before update on public.klant_inloggegevens
  for each row execute function public.touch_updated_at();

-- Schrijfstijl: een profiel voor casper@ ('casper') en één IKR-profiel voor contact@ ('ikr').
-- Gemaakt door de AI (Grokbot) uit verzonden mails en uit Caspers aanpassingen op AI-voorstellen.
create table if not exists public.style_profiles (
  key text primary key check (key in ('casper', 'ikr')),
  guide text not null,
  examples jsonb not null default '[]'::jsonb,
  mail_count int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);
-- Wat de AI voorstelde tegenover wat Casper echt verstuurde.
create table if not exists public.style_feedback (
  id uuid primary key default gen_random_uuid(),
  key text not null check (key in ('casper', 'ikr')),
  ai_text text not null,
  sent_text text not null,
  created_at timestamptz not null default now()
);
create index if not exists style_feedback_key_idx on public.style_feedback (key, created_at desc);
-- Oorspronkelijke tekst van een concept (om te zien wat Casper aanpaste voor hij verstuurde).
alter table public.mail_drafts add column if not exists original_body text;

alter table public.style_profiles enable row level security;
alter table public.style_feedback enable row level security;
drop policy if exists style_profiles_sales on public.style_profiles;
create policy style_profiles_sales on public.style_profiles for all to authenticated
  using (public.is_sales_user()) with check (public.is_sales_user());
drop policy if exists style_feedback_sales on public.style_feedback;
create policy style_feedback_sales on public.style_feedback for select to authenticated using (public.is_sales_user());

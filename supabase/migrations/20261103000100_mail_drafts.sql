-- Nieuwe uitgaande mails als concept (bv. klaargezet door Grokbot via MCP). Er wordt nooit
-- automatisch verstuurd: enkel Casper verstuurt, via een knop in het dashboard.
create table if not exists public.mail_drafts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_email text not null default 'casper@iknowright.be'
    check (from_email in ('casper@iknowright.be', 'contact@iknowright.be')),
  to_email text not null,
  cc text[] not null default '{}',
  subject text not null,
  body text not null,
  is_html boolean not null default false,
  thread_id text,
  in_reply_to text,
  status text not null default 'concept' check (status in ('concept', 'verstuurd')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_by text
);
create index if not exists mail_drafts_lead_idx on public.mail_drafts (lead_id, created_at desc);
create index if not exists mail_drafts_status_idx on public.mail_drafts (status, created_at desc);

alter table public.mail_drafts enable row level security;
drop policy if exists mail_drafts_sales_only on public.mail_drafts;
create policy mail_drafts_sales_only on public.mail_drafts for all to authenticated
  using (public.is_sales_user()) with check (public.is_sales_user());

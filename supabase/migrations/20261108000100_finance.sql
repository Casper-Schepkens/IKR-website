-- Financiën: banktransacties uit Odoo (enkel lezen) + eigen indeling, en contractbedragen per klant.

-- Contract per klant (bedragen per maand, excl. btw). Vastgelegd in het contract, dus op voorhand gekend.
alter table public.clients add column if not exists contract_start date;
alter table public.clients add column if not exists monthly_fee numeric(10, 2);
alter table public.clients add column if not exists freelancer_cost numeric(10, 2);
alter table public.clients add column if not exists boosting_budget numeric(10, 2);
-- Naam van de klant zoals die op de bank verschijnt (bv. "Tempus Thuisverpleging"), als die afwijkt.
alter table public.clients add column if not exists bank_name text;

-- Banktransacties (kopie uit Odoo, account.bank.statement.line). Odoo zelf wordt nooit aangepast.
create table if not exists public.finance_transactions (
  odoo_id integer primary key,
  date date not null,
  amount numeric(12, 2) not null,
  counterparty text not null default '',
  description text not null default '',
  category text not null default 'onbekend',
  client_id uuid references public.clients (id) on delete set null,
  -- true = handmatig ingedeeld (regels overschrijven dat niet meer)
  manual boolean not null default false,
  rule_id uuid,
  synced_at timestamptz not null default now()
);
create index if not exists finance_tx_date_idx on public.finance_transactions (date);

-- Regels: tegenpartij of omschrijving bevat `pattern` → categorie (en eventueel klant). Hoogste prioriteit wint.
create table if not exists public.finance_rules (
  id uuid primary key default gen_random_uuid(),
  pattern text not null,
  category text not null,
  client_id uuid references public.clients (id) on delete cascade,
  priority integer not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_state (
  key text primary key,
  synced_at timestamptz,
  bank_balance numeric(12, 2),
  error text
);

alter table public.finance_transactions enable row level security;
alter table public.finance_rules enable row level security;
alter table public.finance_state enable row level security;
drop policy if exists team_all on public.finance_transactions;
create policy team_all on public.finance_transactions for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
drop policy if exists team_all on public.finance_rules;
create policy team_all on public.finance_rules for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
drop policy if exists team_all on public.finance_state;
create policy team_all on public.finance_state for all to authenticated using (public.is_team_member()) with check (public.is_team_member());

do $$
declare t text;
begin
  foreach t in array array['finance_transactions', 'finance_rules'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

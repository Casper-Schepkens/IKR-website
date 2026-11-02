-- Adressen die geen lead zijn (bv. een freelancer): de inbox maakt er geen lead van en toont ze niet.
create table if not exists public.sales_ignored_emails (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.sales_ignored_emails enable row level security;
drop policy if exists sales_only on public.sales_ignored_emails;
create policy sales_only on public.sales_ignored_emails for all to authenticated
  using (public.is_sales_user()) with check (public.is_sales_user());

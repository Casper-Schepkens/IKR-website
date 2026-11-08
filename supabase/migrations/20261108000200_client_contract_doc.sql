-- Klanten: link naar het contract en de laatste "leid af uit het contract"-taak.
alter table public.clients
  add column if not exists contract_url text,
  add column if not exists contract_job_id uuid references public.ai_jobs(id) on delete set null;

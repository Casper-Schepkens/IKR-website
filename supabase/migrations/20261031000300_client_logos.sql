-- Logo per klant: externe https-URL, of pad in de privé bucket 'logos'
-- (geserveerd via /admin/klanten/[id]/logo).
alter table public.clients add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', false)
on conflict (id) do nothing;

drop policy if exists ikr_admin_storage on storage.objects;
create policy ikr_admin_storage on storage.objects for all to authenticated
  using (bucket_id in ('templates','decks','logos') and public.is_ikr_admin())
  with check (bucket_id in ('templates','decks','logos') and public.is_ikr_admin());

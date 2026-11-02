-- Opruimen: de eerste versie van /admin wordt niet meer gebruikt (beslist door Casper, 2 nov 2026).
drop policy if exists ikr_admin_storage on storage.objects;

drop table if exists
  public.ai_runs,
  public.video_stats_snapshots,
  public.videos,
  public.tiktok_accounts,
  public.decks,
  public.templates,
  public.content_ideas,
  public.calendar_events,
  public.invoices,
  public.contracts,
  public.form_submissions,
  public.client_profiles,
  public.pipeline_events,
  public.activities,
  public.contacts,
  public.knowledge_docs,
  public.clients,
  public.admin_users
cascade;

drop function if exists public.is_ikr_admin() cascade;
drop function if exists public.touch_updated_at() cascade;

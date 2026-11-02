-- Inbox: een mail die geen antwoord nodig heeft wegklikken (status 'dismissed').
alter table public.ai_jobs drop constraint if exists ai_jobs_status_check;
alter table public.ai_jobs add constraint ai_jobs_status_check
  check (status in ('pending', 'running', 'done', 'error', 'waiting_limit', 'dismissed'));

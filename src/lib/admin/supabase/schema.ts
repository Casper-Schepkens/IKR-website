/**
 * Het echte databaseschema (kolommen en vaste waarden uit de check-constraints), zoals op 17 november 2026
 * in Supabase. schema-check.ts vergelijkt de TypeScript-types hiermee: loopt een type uit de pas met de
 * database (zoals vroeger 'sent' tegenover 'verstuurd'), dan faalt `npm run typecheck`.
 *
 * Bijwerken na een migratie: kolommen via `select table_name, column_name from information_schema.columns
 * where table_schema = 'public'`, waarden uit de check-constraints van de migratie.
 */
export const COLUMNS = {
  leads: ['id', 'name', 'company', 'email', 'phone', 'source', 'stage', 'lost_reason', 'lost_note', 'stage_changed_at', 'created_at', 'updated_at', 'next_action', 'follow_up_on', 'notes', 'owner'],
  mail_drafts: ['id', 'lead_id', 'from_email', 'to_email', 'cc', 'subject', 'body', 'is_html', 'thread_id', 'in_reply_to', 'status', 'created_by', 'created_at', 'updated_at', 'sent_at', 'sent_by', 'context', 'original_body', 'follow_up_action', 'follow_up_on'],
  calls: ['id', 'lead_id', 'kind', 'starts_at', 'ends_at', 'status', 'meet_url', 'calendar_event_id', 'calendar_error', 'invited', 'recording_url', 'started_at', 'fireflies_added_at', 'finished_at', 'note', 'created_by', 'created_via', 'created_at', 'updated_at', 'thank_you_draft_id', 'fireflies_id', 'transcript_url', 'transcript_received_at', 'analysis', 'recording_file_id', 'recording_public_permission', 'sales_ppt_url', 'bot_context', 'bot_context_updated_at', 'bot_context_updated_by', 'owner'],
  clients: ['id', 'name', 'freelancer', 'contract_end', 'created_by', 'created_at', 'updated_at', 'contract_indefinite', 'contract_start', 'monthly_fee', 'freelancer_cost', 'boosting_budget', 'bank_name', 'contract_url', 'contract_job_id', 'content_goal', 'niche', 'audience', 'available', 'drive_folder_id'],
  freelancers: ['id', 'name', 'email', 'phone', 'score', 'assignments', 'client_ids', 'portfolio_url', 'notes', 'created_by', 'created_at', 'updated_at'],
  klant_inloggegevens: ['id', 'client_id', 'platform', 'username', 'password_enc', 'has_password', 'note', 'created_by', 'created_at', 'updated_by', 'updated_at'],
  bot_cards: ['id', 'owner_email', 'kind', 'title', 'body', 'status', 'client_id', 'link', 'action_label', 'action_detail', 'action_status', 'bot_busy_since', 'unread', 'created_by', 'created_at', 'updated_at'],
  ai_jobs: ['id', 'type', 'ref', 'input', 'status', 'output', 'error', 'engine', 'model', 'input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens', 'cost_usd', 'created_by', 'created_at', 'started_at', 'finished_at'],
} as const

/** Vaste waarden uit de check-constraints. */
export const CHECKS = {
  'leads.stage': ['lead', 'setter_planned', 'setter_done', 'sales_planned', 'sales_done', 'next_steps', 'won', 'lost'],
  'leads.source': ['cold_mail', 'website', 'event', 'linkedin', 'referral', 'other'],
  'leads.lost_reason': ['no_reply', 'not_interested', 'not_for_me'],
  'mail_drafts.status': ['concept', 'verstuurd'],
  'calls.status': ['gepland', 'afgerond', 'no_show', 'geannuleerd'],
  'calls.kind': ['setter', 'sales'],
  'calls.created_via': ['dashboard', 'inbox', 'grokbot', 'agenda', 'boeking'],
  'freelancers.score': ['rood', 'oranje', 'groen', 'zekerheid'],
  'bot_cards.status': ['open', 'besproken', 'archief'],
  'bot_cards.action_status': ['voorgesteld', 'goedgekeurd', 'uitgevoerd', 'afgewezen'],
  'bot_cards.kind': ['bespreken', 'brainstorm', 'vraag', 'update', 'opdracht'],
  'ai_jobs.status': ['pending', 'running', 'done', 'error', 'waiting_limit', 'dismissed'],
} as const

export type Columns<T extends keyof typeof COLUMNS> = (typeof COLUMNS)[T][number]
export type CheckValues<K extends keyof typeof CHECKS> = (typeof CHECKS)[K][number]

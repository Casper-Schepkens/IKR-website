/**
 * Controle bij het compileren: TypeScript-types tegenover het echte schema (schema.ts).
 * Faalt een regel hieronder, dan loopt een type uit de pas met de database: pas het type of schema.ts aan.
 * Dit bestand doet niets bij het draaien.
 */
import type { CheckValues, Columns } from './schema'
import type { Lead, Stage, Source, LostReason } from '../sales/types'
import type { MailDraft } from '../sales/drafts'
import type { Call, CallStatus, CallKind } from '../calls/types'
import type { Client } from '../clients/types'
import type { Card, CardStatus } from '../workspace/types'
import type { AiJob } from '../ai/jobs'

/** Exact gelijk (beide richtingen). */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
/** Elk veld van het type bestaat als kolom. */
type KnownColumns<T, Cols> = Exclude<keyof T, Cols> extends never ? true : Exclude<keyof T, Cols>
const ok = <T extends true>(v: T) => v

export const schemaChecks = [
  ok<KnownColumns<Lead, Columns<'leads'>>>(true),
  ok<KnownColumns<MailDraft, Columns<'mail_drafts'>>>(true),
  ok<KnownColumns<Call, Columns<'calls'>>>(true),
  ok<KnownColumns<Client, Columns<'clients'>>>(true),
  ok<KnownColumns<Card, Columns<'bot_cards'>>>(true),
  ok<KnownColumns<AiJob, Columns<'ai_jobs'>>>(true),
  ok<Same<Stage, CheckValues<'leads.stage'>>>(true),
  ok<Same<Source, CheckValues<'leads.source'>>>(true),
  ok<Same<LostReason, CheckValues<'leads.lost_reason'>>>(true),
  ok<Same<MailDraft['status'], CheckValues<'mail_drafts.status'>>>(true),
  ok<Same<CallStatus, CheckValues<'calls.status'>>>(true),
  ok<Same<CallKind, CheckValues<'calls.kind'>>>(true),
  ok<Same<Call['created_via'], CheckValues<'calls.created_via'>>>(true),
  ok<Same<CardStatus, CheckValues<'bot_cards.status'>>>(true),
  ok<Same<NonNullable<Card['action_status']>, CheckValues<'bot_cards.action_status'>>>(true),
  ok<Same<Card['kind'], CheckValues<'bot_cards.kind'>>>(true),
  ok<Same<AiJob['status'], CheckValues<'ai_jobs.status'>>>(true),
]

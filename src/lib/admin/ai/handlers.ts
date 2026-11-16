import 'server-only'

/**
 * Alle AI-taken: per taak de instructies, de vraag, de vorm van het antwoord en wat er daarna gebeurt.
 * Elke taak staat in een eigen bestand in ./tasks; dit bestand voegt ze samen.
 */
export * from './tasks/schemas'
import { inbox_replyTask } from './tasks/inbox-reply'
import { na_verzendingTask } from './tasks/na-verzending'
import { call_verwerkenTask } from './tasks/call-verwerken'
import { mail_rewriteTask } from './tasks/mail-rewrite'
import { chatTask } from './tasks/chat'
import { werkplekTask } from './tasks/werkplek'
import { contract_afleidenTask } from './tasks/contract-afleiden'
import { weekly_sopsTask } from './tasks/weekly-sops'
import { style_profileTask } from './tasks/style-profile'
import type { Handler } from './tasks/schemas'

export const HANDLERS = {
  inbox_reply: inbox_replyTask,
  na_verzending: na_verzendingTask,
  call_verwerken: call_verwerkenTask,
  mail_rewrite: mail_rewriteTask,
  chat: chatTask,
  werkplek: werkplekTask,
  contract_afleiden: contract_afleidenTask,
  weekly_sops: weekly_sopsTask,
  style_profile: style_profileTask,
} satisfies Record<string, Handler>

export type JobType = keyof typeof HANDLERS

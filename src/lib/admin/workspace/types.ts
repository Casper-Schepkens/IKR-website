/** Werkplek van Grok Bot: per teamlid kaarten met een draadje en optioneel een voorgestelde actie. */
export const CARD_KINDS = {
  bespreken: 'Wil ik bespreken',
  brainstorm: 'Brainstorm',
  vraag: 'Vraag',
  update: 'Update',
  opdracht: 'Opdracht',
} as const
export type CardKind = keyof typeof CARD_KINDS
export const CARD_STATUSES = ['open', 'besproken', 'archief'] as const
export type CardStatus = (typeof CARD_STATUSES)[number]
export type ActionStatus = 'voorgesteld' | 'goedgekeurd' | 'uitgevoerd' | 'afgewezen'

export type Card = {
  id: string
  owner_email: string
  kind: CardKind
  title: string
  body: string
  status: CardStatus
  client_id: string | null
  link: string | null
  action_label: string | null
  action_detail: string | null
  action_status: ActionStatus | null
  bot_busy_since: string | null
  unread: boolean
  created_by: string
  created_at: string
  updated_at: string
}
export type CardMessage = { id: string; card_id: string; author: string; body: string; created_at: string }
export type CardWithMessages = Card & { messages: CardMessage[] }

export const isCardKind = (k: unknown): k is CardKind => typeof k === 'string' && k in CARD_KINDS
/** Grok Bot denkt nog na (max. 15 minuten, daarna tonen we het niet meer als bezig). */
export const isBusy = (c: Pick<Card, 'bot_busy_since'>, now = Date.now()) => Boolean(c.bot_busy_since && now - Date.parse(c.bot_busy_since) < 15 * 60_000)

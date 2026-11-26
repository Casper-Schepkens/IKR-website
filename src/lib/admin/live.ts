/**
 * Servertekst overnemen zolang de gebruiker niet afweek van de vorige servertekst.
 * Zo verschijnt een AI-wijziging, zonder een half getypte mail te overschrijven.
 */
export function keepEdited(current: string, previousServer: string, nextServer: string) {
  return current === previousServer ? nextServer : current
}

/** Drempel: "bijna onderaan" telt nog als vastgeplakt aan het nieuwste bericht. */
export const NEAR_BOTTOM_PX = 96

export function isNearBottom(
  el: { scrollHeight: number; scrollTop: number; clientHeight: number },
  threshold = NEAR_BOTTOM_PX,
) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}

/** Verandert als er een bericht bij komt of de "denkt na"-regel verschijnt/verdwijnt. */
export function chatContentKey(messages: { id: string }[], thinking: boolean) {
  return `${messages.length}:${messages.at(-1)?.id ?? ''}:${thinking ? 1 : 0}`
}

export type ChatSnap = { lastBotId: string | null; thinking: boolean }

export function chatSnap(messages: { id: string; role: string }[], thinking: boolean): ChatSnap {
  let lastBotId: string | null = null
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'bot') {
      lastBotId = messages[i].id
      break
    }
  }
  return { lastBotId, thinking }
}

/**
 * De open pagina opnieuw laden nadat Grok Bot geantwoord heeft of klaar is met nadenken.
 * Een eigen bericht (thinking gaat aan) is nog geen reden: de data verandert pas daarna.
 */
export function shouldRefreshForChat(prev: ChatSnap, next: ChatSnap) {
  if (prev.lastBotId !== next.lastBotId) return true
  return prev.thinking && !next.thinking
}

/** Het pad van de pagina, gezet door de proxy voor de admin-layout (die het zelf niet kent). */
export const PATH_HEADER = 'x-ikr-path'

/** Tabellen waarvan een wijziging de open pagina laat verversen (in de supabase_realtime-publicatie). */
export const LIVE_TABLES = ['leads', 'mail_drafts', 'weeklies', 'weekly_todos', 'weekly_todo_notes', 'weekly_pins', 'clients', 'freelancers', 'calls', 'finance_transactions', 'finance_rules', 'sops', 'production', 'production_cycles', 'production_steps', 'production_client_steps', 'production_template_steps', 'production_internal_tasks', 'production_internal_done', 'production_changes', 'bot_cards', 'bot_card_messages', 'whatsapp_chats', 'whatsapp_berichten'] as const
export type LiveTable = (typeof LIVE_TABLES)[number]

const PRODUCTION_TABLES: LiveTable[] = ['clients', 'production', 'production_cycles', 'production_steps', 'production_client_steps', 'production_template_steps', 'production_internal_tasks', 'production_internal_done', 'production_changes']

/**
 * Welke tabellen een pagina toont. Een wijziging elders (bv. het log van Grok Bot of een to-do terwijl je
 * op Financiën zit) herlaadt de pagina niet meer: elke herlading kost de layout en de pagina opnieuw.
 * bot_actions en ai_jobs staan nergens: de chat en de inbox volgen hun eigen taak.
 */
export function tablesFor(pathname: string): LiveTable[] {
  if (pathname.startsWith('/admin/sales/calls')) return ['calls', 'leads', 'mail_drafts']
  if (pathname.startsWith('/admin/sales/inbox')) return ['mail_drafts', 'leads']
  if (pathname === '/admin/sales' || pathname.startsWith('/admin/sales/')) return ['leads', 'mail_drafts', 'calls']
  if (pathname === '/admin/klanten') return ['clients', 'finance_transactions']
  if (pathname === '/admin/financien') return ['finance_transactions', 'finance_rules', 'clients']
  if (pathname === '/admin/sops') return ['sops']
  if (pathname === '/admin/freelancers') return ['freelancers', 'clients']
  if (pathname === '/admin/productie') return PRODUCTION_TABLES
  if (pathname === '/admin/whatsapp') return ['whatsapp_chats', 'whatsapp_berichten']
  if (pathname === '/admin/werkplek') return ['bot_cards', 'bot_card_messages']
  if (pathname === '/admin/weekly' || pathname.startsWith('/admin/weekly/')) return ['weeklies', 'weekly_todos', 'weekly_todo_notes', 'weekly_pins', 'sops']
  return []
}

/** Pagina's waarvan de AI de getoonde data kan wijzigen. */
export function isLivePath(pathname: string) {
  return tablesFor(pathname).length > 0 && (
    pathname === '/admin/sales' ||
    pathname.startsWith('/admin/sales/') ||
    pathname === '/admin/klanten' ||
    pathname === '/admin/financien' ||
    pathname === '/admin/sops' ||
    pathname === '/admin/freelancers' ||
    pathname === '/admin/productie' ||
    pathname === '/admin/werkplek' ||
    pathname === '/admin/weekly' ||
    pathname.startsWith('/admin/weekly/')
  )
}

/** Korte, stabiele vingerafdruk (geen beveiliging, enkel vergelijken). */
export function fnv(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export function stampFromParts(parts: Record<string, string>) {
  return Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k]}`)
    .join(';')
}

let refreshedAt = 0

/** Voorkomt dat chat-poll en data-poll dezelfde wijziging twee keer verversen. */
export function refreshSoon(refresh: () => void, minGapMs = 1000) {
  const now = Date.now()
  if (now - refreshedAt < minGapMs) return false
  refreshedAt = now
  refresh()
  return true
}

export function resetRefreshSoon() {
  refreshedAt = 0
}

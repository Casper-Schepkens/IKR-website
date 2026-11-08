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

/** Tabellen waarvan een wijziging de open pagina laat verversen (in de supabase_realtime-publicatie). */
export const LIVE_TABLES = ['bot_actions', 'ai_jobs', 'leads', 'mail_drafts', 'weeklies', 'weekly_todos', 'weekly_todo_notes', 'weekly_pins', 'clients', 'calls', 'finance_transactions', 'finance_rules'] as const

/** Pagina's waarvan de AI de getoonde data kan wijzigen. */
export function isLivePath(pathname: string) {
  return (
    pathname === '/admin/sales' ||
    pathname.startsWith('/admin/sales/') ||
    pathname === '/admin/klanten' ||
    pathname === '/admin/financien' ||
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

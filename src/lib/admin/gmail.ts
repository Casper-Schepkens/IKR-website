import 'server-only'
import { accessToken, forgetAccessToken } from './google'

/** Gmail van Casper: sales-mails lezen en antwoorden versturen. */

export type Mail = {
  id: string
  threadId: string
  messageId: string | null
  references: string | null
  fromName: string
  fromEmail: string
  to: string
  cc?: string
  subject: string
  date: string
  text: string
  /** Automatisch antwoord (afwezigheid, out of office, autoresponder). */
  auto?: boolean
}

export type Thread = { id: string; mails: Mail[] }

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[]; headers?: { name: string; value: string }[] }
type RawMessage = { id: string; threadId: string; internalDate: string; payload: Part }

const API = 'https://gmail.googleapis.com/gmail/v1/users/me'

async function gmail<T>(owner: string, path: string, init?: RequestInit, retry = true): Promise<T> {
  const at = await accessToken(owner)
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  })
  // Gecachet token ongeldig (bv. ingetrokken): vergeten en één keer opnieuw met een vers token.
  if (res.status === 401 && retry) {
    forgetAccessToken(owner)
    return gmail<T>(owner, path, init, false)
  }
  // Gmail-quotum per seconde: even wachten en één keer opnieuw proberen.
  if ((res.status === 429 || res.status === 403) && retry) {
    const body = await res.clone().text()
    if (res.status === 429 || /quota|rate/i.test(body)) {
      await new Promise((r) => setTimeout(r, 2000))
      return gmail<T>(owner, path, init, false)
    }
  }
  const json = (await res.json()) as T & { error?: { message?: string } }
  if (!res.ok) {
    if (res.status === 429 || /quota/i.test(json.error?.message ?? ''))
      throw new Error('Gmail is even te druk bevraagd. Wacht een minuutje en herlaad de inbox.')
    throw new Error(`Gmail: ${json.error?.message ?? res.status}`)
  }
  return json
}

/** Voert taken uit met hooguit `n` tegelijk (Gmail laat per seconde maar een beperkt aantal toe). */
async function limited<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}

const decode = (d?: string) => (d ? Buffer.from(d, 'base64url').toString('utf8') : '')

function findText(p: Part): string {
  if (p.mimeType === 'text/plain' && p.body?.data) return decode(p.body.data)
  for (const c of p.parts ?? []) {
    const t = findText(c)
    if (t) return t
  }
  if (p.mimeType === 'text/html' && p.body?.data)
    return decode(p.body.data).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
  return ''
}

/** Enkel de nieuwe tekst van een mail: geciteerde vorige mails en handtekening-scheiding weg. */
function stripQuoted(text: string) {
  const lines = text.replace(/\r/g, '').split('\n')
  const cut = lines.findIndex(
    (l) => /^(Op|On) .+(schreef|wrote|a écrit).*:?\s*$/i.test(l.trim()) || /^-{2,}\s*Original Message/i.test(l) || /^From: /.test(l),
  )
  return (cut > 0 ? lines.slice(0, cut) : lines)
    .filter((l) => !l.startsWith('>'))
    .join('\n')
    .trim()
    .slice(0, 4000)
}

function parseAddress(v: string) {
  const m = v.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/)
  return m ? { name: m[1].trim() || m[2], email: m[2].trim().toLowerCase() } : { name: v.trim(), email: v.trim().toLowerCase() }
}

function toMail(m: RawMessage): Mail {
  const h = (n: string) => m.payload.headers?.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? ''
  const from = parseAddress(h('From'))
  return {
    id: m.id,
    threadId: m.threadId,
    messageId: h('Message-ID') || null,
    references: h('References') || null,
    fromName: from.name,
    fromEmail: from.email,
    to: h('To'),
    cc: h('Cc'),
    subject: h('Subject'),
    date: new Date(Number(m.internalDate)).toISOString(),
    text: stripQuoted(findText(m.payload)),
    auto: isAutoReply(h),
  }
}

const AUTO_SUBJECT =
  /^(automatisch antwoord|automatische? (reactie|antwoord)|afwezig|out of (the )?office|automatic reply|auto(matic)?[- ]?reply|autoreply|abwesenheit|automatische antwort|réponse automatique|absence)\b|\b(out of office|afwezigheidsmelding|niet op kantoor)\b/i

/** Afwezigheidsmelding of autoresponder (headers volgens RFC 3834 + gangbare onderwerpen). */
export function isAutoReply(h: (name: string) => string) {
  const auto = h('Auto-Submitted').toLowerCase()
  if (auto && auto !== 'no') return true
  if (h('X-Autoreply') || h('X-Autorespond') || h('X-Auto-Response-Suppress').toLowerCase().includes('oof')) return true
  if (/^(auto_reply|auto-reply)$/i.test(h('Precedence').trim())) return true
  return AUTO_SUBJECT.test(h('Subject').trim())
}

const g = globalThis as unknown as { __ikrThreads?: Map<string, { historyId: string; thread: Thread }> }
function threadCache() {
  if (!g.__ikrThreads) g.__ikrThreads = new Map()
  if (g.__ikrThreads.size > 500) g.__ikrThreads.clear()
  return g.__ikrThreads
}

/** Recente inbox-threads (30 dagen) met minstens één mail die niet van jezelf is. */
export async function recentThreads(owner: string, max = 25): Promise<Thread[]> {
  const list = await gmail<{ threads?: { id: string; historyId: string }[] }>(
    owner,
    `/threads?maxResults=${max}&q=${encodeURIComponent('in:inbox newer_than:30d -from:me')}`,
  )
  // Enkel threads ophalen die veranderd zijn sinds de vorige keer (historyId), de rest uit het geheugen.
  const cache = threadCache()
  return limited(list.threads ?? [], 4, async (t) => {
    const hit = cache.get(t.id)
    if (hit && hit.historyId === t.historyId) return hit.thread
    const raw = await gmail<{ id: string; messages: RawMessage[] }>(owner, `/threads/${t.id}?format=full`)
    const thread = { id: raw.id, mails: raw.messages.map(toMail) }
    cache.set(t.id, { historyId: t.historyId, thread })
    return thread
  })
}

/**
 * Threads van de laatste `days` dagen met één van deze adressen (van, aan of cc), in alle mappen.
 * Gebruikt dezelfde historyId-cache als recentThreads: ongewijzigde threads worden niet opnieuw opgehaald.
 */
export async function threadsWith(owner: string, emails: string[], days = 120): Promise<Thread[]> {
  const cache = threadCache()
  const seen = new Map<string, { id: string; historyId: string }>()
  // Per 15 adressen één zoekopdracht, zodat de query kort blijft.
  for (let i = 0; i < emails.length; i += 15) {
    const part = emails.slice(i, i + 15).map((e) => `from:${e} to:${e} cc:${e}`).join(' ')
    const list = await gmail<{ threads?: { id: string; historyId: string }[] }>(
      owner,
      `/threads?maxResults=100&q=${encodeURIComponent(`newer_than:${days}d {${part}}`)}`,
    )
    for (const t of list.threads ?? []) seen.set(t.id, t)
  }
  return limited([...seen.values()], 4, async (t) => {
    const key = `${owner}:${t.id}`
    const hit = cache.get(key)
    if (hit && hit.historyId === t.historyId) return hit.thread
    const raw = await gmail<{ id: string; messages: RawMessage[] }>(owner, `/threads/${t.id}?format=full`)
    const thread = { id: raw.id, mails: raw.messages.map(toMail) }
    cache.set(key, { historyId: t.historyId, thread })
    return thread
  })
}

const encodeHeader = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v).toString('base64')}?=`)

/** Verstuurt een mail vanaf het Gmail-account van `owner` (optioneel in een bestaande thread). */
export async function sendMail(
  owner: string,
  opts: {
    to: string
    cc?: string[]
    subject: string
    body: string
    html?: boolean
    threadId?: string | null
    inReplyTo?: string | null
    references?: string | null
  },
) {
  const headers = [
    `To: ${opts.to}`,
    ...(opts.cc?.length ? [`Cc: ${opts.cc.join(', ')}`] : []),
    `Subject: ${encodeHeader(opts.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: ${opts.html ? 'text/html' : 'text/plain'}; charset=UTF-8`,
    'Content-Transfer-Encoding: base64',
    ...(opts.inReplyTo ? [`In-Reply-To: ${opts.inReplyTo}`, `References: ${[opts.references, opts.inReplyTo].filter(Boolean).join(' ')}`] : []),
  ]
  const raw = `${headers.join('\r\n')}\r\n\r\n${Buffer.from(opts.body, 'utf8').toString('base64')}`
  await gmail(owner, '/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: Buffer.from(raw).toString('base64url'), ...(opts.threadId ? { threadId: opts.threadId } : {}) }),
  })
}

/** Antwoord in dezelfde thread (Re: …). */
export async function sendReply(owner: string, opts: { threadId: string; to: string; subject: string; inReplyTo: string | null; references: string | null; body: string }) {
  const subject = /^re:/i.test(opts.subject) ? opts.subject : `Re: ${opts.subject}`
  await sendMail(owner, { to: opts.to, subject, body: opts.body, threadId: opts.threadId, inReplyTo: opts.inReplyTo, references: opts.references })
}

export async function getThread(owner: string, id: string): Promise<Thread> {
  const t = await gmail<{ id: string; messages: RawMessage[] }>(owner, `/threads/${encodeURIComponent(id)}?format=full`)
  return { id: t.id, mails: t.messages.map(toMail) }
}

/**
 * Echte antwoorden van `owner` uit de laatste `days` dagen: mails die hij stuurde als reactie op iemand
 * anders. Eerste mails van een thread en mails na zijn eigen mail (cold mails en opvolgingen van
 * Apollo) vallen weg.
 */
export async function sentReplies(owner: string, opts: { days: number; maxThreads: number; maxReplies: number }) {
  const ids: string[] = []
  let pageToken: string | undefined
  do {
    const q = encodeURIComponent(`in:sent newer_than:${opts.days}d`)
    const page = await gmail<{ threads?: { id: string }[]; nextPageToken?: string }>(
      owner,
      `/threads?maxResults=100&q=${q}${pageToken ? `&pageToken=${pageToken}` : ''}`,
    )
    ids.push(...(page.threads ?? []).map((t) => t.id))
    pageToken = page.nextPageToken
  } while (pageToken && ids.length < opts.maxThreads)

  const threads = await limited(ids.slice(0, opts.maxThreads), 4, (id) =>
    gmail<{ id: string; messages: RawMessage[] }>(owner, `/threads/${id}?format=full`).then((t) => t.messages.map(toMail)),
  )
  const me = owner.toLowerCase()
  const replies: { subject: string; date: string; text: string }[] = []
  for (const mails of threads) {
    mails.forEach((m, i) => {
      if (i === 0 || m.fromEmail !== me || mails[i - 1].fromEmail === me) return
      if (m.text.length < 20) return
      replies.push({ subject: m.subject, date: m.date, text: m.text.slice(0, 1200) })
    })
  }
  return replies.sort((a, b) => b.date.localeCompare(a.date)).slice(0, opts.maxReplies)
}

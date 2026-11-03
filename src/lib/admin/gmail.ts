import 'server-only'
import { accessToken } from './google'

/** Gmail van Casper: sales-mails lezen en antwoorden versturen. */

export type Mail = {
  id: string
  threadId: string
  messageId: string | null
  references: string | null
  fromName: string
  fromEmail: string
  to: string
  subject: string
  date: string
  text: string
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
    subject: h('Subject'),
    date: new Date(Number(m.internalDate)).toISOString(),
    text: stripQuoted(findText(m.payload)),
  }
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

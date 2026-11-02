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

async function gmail<T>(owner: string, path: string, init?: RequestInit): Promise<T> {
  const at = await accessToken(owner)
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  })
  const json = (await res.json()) as T & { error?: { message?: string } }
  if (!res.ok) throw new Error(`Gmail: ${json.error?.message ?? res.status}`)
  return json
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

/** Recente inbox-threads van de laatste 45 dagen. */
export async function recentThreads(owner: string, max = 40): Promise<Thread[]> {
  const list = await gmail<{ threads?: { id: string }[] }>(
    owner,
    `/threads?maxResults=${max}&q=${encodeURIComponent('in:inbox newer_than:45d')}`,
  )
  const threads = await Promise.all(
    (list.threads ?? []).map((t) => gmail<{ id: string; messages: RawMessage[] }>(owner, `/threads/${t.id}?format=full`)),
  )
  return threads.map((t) => ({ id: t.id, mails: t.messages.map(toMail) }))
}

const encodeHeader = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v).toString('base64')}?=`)

/** Verstuurt een antwoord in dezelfde thread, vanaf het Gmail-account van `owner`. */
export async function sendReply(owner: string, opts: { threadId: string; to: string; subject: string; inReplyTo: string | null; references: string | null; body: string }) {
  const subject = /^re:/i.test(opts.subject) ? opts.subject : `Re: ${opts.subject}`
  const headers = [
    `To: ${opts.to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    ...(opts.inReplyTo ? [`In-Reply-To: ${opts.inReplyTo}`, `References: ${[opts.references, opts.inReplyTo].filter(Boolean).join(' ')}`] : []),
  ]
  const raw = `${headers.join('\r\n')}\r\n\r\n${Buffer.from(opts.body, 'utf8').toString('base64')}`
  await gmail(owner, '/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: Buffer.from(raw).toString('base64url'), threadId: opts.threadId }),
  })
}

export async function getThread(owner: string, id: string): Promise<Thread> {
  const t = await gmail<{ id: string; messages: RawMessage[] }>(owner, `/threads/${encodeURIComponent(id)}?format=full`)
  return { id: t.id, mails: t.messages.map(toMail) }
}

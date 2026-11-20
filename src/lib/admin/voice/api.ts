import 'server-only'
import { NextResponse } from 'next/server'
import { requireAdmin, type AdminSession } from '../session'
import { isVoiceConfigured, sessionOf } from './store'

const UUID = /^[0-9a-f-]{36}$/i

/** Gemeenschappelijk voor /api/spraak/*: ingelogd, niet in demomodus, ingesteld; fouten als JSON. */
export function voiceRoute(handler: (session: AdminSession, body: Record<string, unknown>) => Promise<unknown>) {
  return async (req: Request) => {
    const session = await requireAdmin()
    if (session.mode === 'demo') return json({ error: 'De spraakbot werkt niet in demomodus.' }, 400)
    if (!isVoiceConfigured()) return json({ error: 'De spraakbot is nog niet ingesteld (OPENAI_API_KEY ontbreekt).' }, 503)
    try {
      const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
      return json(await handler(session, body))
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'Mislukt.' }, 400)
    }
  }
}

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

/** Het gesprek moet van deze gebruiker zijn (en nog lopen, tenzij `allowEnded`). */
export async function ownSession(session: AdminSession, id: unknown, allowEnded = false) {
  if (typeof id !== 'string' || !UUID.test(id)) throw new Error('Onbekend gesprek.')
  const s = await sessionOf(id, session.user.email)
  if (!s || (!allowEnded && s.ended_at)) throw new Error('Dit gesprek is afgelopen.')
  return s
}

export const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '')
export const safePage = (v: unknown) => (typeof v === 'string' && v.startsWith('/admin') ? v.slice(0, 300) : null)

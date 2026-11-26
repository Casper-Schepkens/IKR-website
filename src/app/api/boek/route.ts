import { NextResponse } from 'next/server'
import { BookingError } from '@/lib/booking/core'
import { clientIp, hashIp, serverBookingDeps, softLimit } from '@/lib/booking/deps'
import { bookSlot, publicSlots } from '@/lib/booking/service'

/**
 * Publieke API voor /boek.
 *  GET  → vrije momenten (enkel tijdstippen; geen namen of agenda-inhoud)
 *  POST → een moment boeken (server controleert alles opnieuw)
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const noStore = { 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  const ip = hashIp(clientIp(request.headers)) ?? 'onbekend'
  if (!softLimit(`get:${ip}`, 60, 60_000)) return NextResponse.json({ error: 'Even geduld, probeer zo opnieuw.' }, { status: 429, headers: noStore })
  const deps = serverBookingDeps()
  if (!deps) return NextResponse.json({ error: 'Boeken is tijdelijk niet mogelijk.' }, { status: 503, headers: noStore })
  try {
    return NextResponse.json(await publicSlots(deps), { headers: noStore })
  } catch (e) {
    console.error('boek: slots', e)
    return NextResponse.json({ error: 'De beschikbare momenten konden niet geladen worden. Probeer later opnieuw.' }, { status: 500, headers: noStore })
  }
}

const STATUS: Record<BookingError['code'], number> = { invalid: 400, spam: 400, taken: 409, rate_limited: 429, unavailable: 503 }

export async function POST(request: Request) {
  const ipHash = hashIp(clientIp(request.headers))
  if (!softLimit(`post:${ipHash ?? 'onbekend'}`, 10, 10 * 60_000))
    return NextResponse.json({ error: 'Te veel pogingen. Probeer het later opnieuw.' }, { status: 429, headers: noStore })
  const deps = serverBookingDeps()
  if (!deps) return NextResponse.json({ error: 'Boeken is tijdelijk niet mogelijk.' }, { status: 503, headers: noStore })
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400, headers: noStore })
  }
  try {
    const r = await bookSlot(deps, body, { ipHash, honeypot: body.website })
    // Enkel wat de lead zelf mag zien: wanneer en hoe lang. Geen naam van het teamlid.
    return NextResponse.json({ ok: true, start: r.startsAt, end: r.endsAt, callName: r.callName }, { headers: noStore })
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message, code: e.code }, { status: STATUS[e.code], headers: noStore })
    console.error('boek: boeken', e)
    return NextResponse.json({ error: 'Er ging iets mis. Probeer later opnieuw.' }, { status: 500, headers: noStore })
  }
}

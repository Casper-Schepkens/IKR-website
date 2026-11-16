import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/session'
import { cachedNotificationsFor } from '@/lib/admin/notifications/service'

export const dynamic = 'force-dynamic'

/** Meldingsbadges voor de ingelogde gebruiker (zijbalk). Enkel lezen; niet ingelogd = naar de login. */
export async function GET(request: Request) {
  const { user } = await requireAdmin()
  const fresh = new URL(request.url).searchParams.has('vers')
  return NextResponse.json(await cachedNotificationsFor(user.email, { fresh }), { headers: { 'Cache-Control': 'no-store' } })
}

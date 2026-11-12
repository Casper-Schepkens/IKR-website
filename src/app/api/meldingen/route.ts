import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/session'
import { notificationsFor } from '@/lib/admin/notifications/service'

export const dynamic = 'force-dynamic'

/** Meldingsbadges voor de ingelogde gebruiker (zijbalk). Enkel lezen; niet ingelogd = naar de login. */
export async function GET() {
  const { user } = await requireAdmin()
  return NextResponse.json(await notificationsFor(user.email), { headers: { 'Cache-Control': 'no-store' } })
}

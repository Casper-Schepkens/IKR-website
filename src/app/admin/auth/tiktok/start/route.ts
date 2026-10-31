import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/session'
import { isTikTokConfigured, tiktokAuthorizeUrl } from '@/lib/admin/integrations/tiktok'

/** Start de TikTok-koppeling voor een klant (?client=<id>). */
export async function GET(request: NextRequest) {
  await requireAdmin()
  const clientId = request.nextUrl.searchParams.get('client')
  const origin = request.nextUrl.origin
  if (!clientId) return NextResponse.redirect(new URL('/admin/klanten', origin))
  if (!isTikTokConfigured()) {
    return NextResponse.redirect(
      new URL(`/admin/klanten/${clientId}?tab=gegevens&tiktok=niet-ingesteld`, origin),
    )
  }
  const state = crypto.randomUUID()
  const res = NextResponse.redirect(tiktokAuthorizeUrl(origin, state))
  res.cookies.set('ikr_tiktok_state', JSON.stringify({ state, clientId }), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/admin/auth/tiktok',
    maxAge: 600,
  })
  return res
}

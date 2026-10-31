import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/session'
import { exchangeTikTokCode, fetchTikTokProfile } from '@/lib/admin/integrations/tiktok'
import { createServiceSupabase } from '@/lib/admin/supabase/server'
import { isServiceRoleConfigured } from '@/lib/admin/env'

export async function GET(request: NextRequest) {
  const session = await requireAdmin()
  const origin = request.nextUrl.origin
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  let saved: { state: string; clientId: string } | null = null
  try {
    saved = JSON.parse(request.cookies.get('ikr_tiktok_state')?.value ?? 'null')
  } catch {}
  if (!code || !saved || saved.state !== state) {
    return NextResponse.redirect(new URL('/admin/klanten?tiktok=mislukt', origin))
  }
  const back = (status: string) => {
    const res = NextResponse.redirect(
      new URL(`/admin/klanten/${saved!.clientId}?tab=gegevens&tiktok=${status}`, origin),
    )
    res.cookies.delete({ name: 'ikr_tiktok_state', path: '/admin/auth/tiktok' })
    return res
  }
  try {
    if (!isServiceRoleConfigured()) throw new Error('Supabase service role ontbreekt')
    const token = await exchangeTikTokCode(code, origin)
    const profile = await fetchTikTokProfile(token.access_token).catch(() => null)
    const db = createServiceSupabase()
    const { error } = await db.from('tiktok_accounts').upsert(
      {
        client_id: saved.clientId,
        open_id: token.open_id,
        handle: profile?.username ? `@${profile.username}` : null,
        display_name: profile?.display_name ?? null,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        scopes: token.scope,
      },
      { onConflict: 'open_id' },
    )
    if (error) throw error
    if (profile?.username)
      await session.repo.updateClient(saved.clientId, { tiktok_handle: `@${profile.username}` })
    await session.repo.addActivity({
      client_id: saved.clientId,
      kind: 'system',
      title: 'TikTok-account gekoppeld',
      created_by: session.user.name,
    })
    return back('gekoppeld')
  } catch (err) {
    console.error('[tiktok] koppelen mislukt', err)
    return back('mislukt')
  }
}

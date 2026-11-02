import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/session'
import { exchangeCode, saveConnection } from '@/lib/admin/google'
import { CONTACT_EMAIL } from '@/lib/admin/weekly/types'

export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  const back = new URL('/admin/instellingen', req.nextUrl.origin)
  const fail = (msg: string) => {
    back.searchParams.set('fout', msg)
    const r = NextResponse.redirect(back)
    r.cookies.delete({ name: 'ikr_google_state', path: '/admin/auth/google' })
    return r
  }

  const [state, target] = (req.cookies.get('ikr_google_state')?.value ?? '').split(':')
  const code = req.nextUrl.searchParams.get('code')
  if (req.nextUrl.searchParams.get('error')) return fail('Koppelen geannuleerd.')
  if (!code || !state || state !== req.nextUrl.searchParams.get('state')) return fail('Koppelen verlopen. Probeer opnieuw.')

  try {
    const { email, refreshToken, scopes } = await exchangeCode(code, `${req.nextUrl.origin}/admin/auth/google/callback`)
    const expected = target === 'contact' ? CONTACT_EMAIL : user.email.toLowerCase()
    if (email !== expected) return fail(`Je koppelde ${email}, maar het moet ${expected} zijn.`)
    await saveConnection(email, refreshToken, scopes, user.email)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Koppelen mislukt.')
  }
  back.searchParams.set('ok', '1')
  const r = NextResponse.redirect(back)
  r.cookies.delete({ name: 'ikr_google_state', path: '/admin/auth/google' })
  return r
}

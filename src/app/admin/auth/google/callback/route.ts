import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin/session'
import { exchangeCode, saveConnection } from '@/lib/admin/google'
import { CONTACT_EMAIL } from '@/lib/admin/weekly/types'
import { retryOpenCalendars } from '@/lib/admin/weekly/schedule'
import { saveTeamConnection } from '@/lib/admin/team/connections'
import { listCalendarsWithToken } from '@/lib/admin/team/google-read'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  const { user } = session
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

  // Mijn koppelingen (mail of agenda per teamlid): apart opgeslagen, versleuteld, alleen lezen.
  if (target === 'team-mail' || target === 'team-agenda') {
    const mail = target === 'team-mail'
    back.hash = 'koppelingen'
    try {
      const { email, refreshToken, scopes, accessToken } = await exchangeCode(code, `${req.nextUrl.origin}/admin/auth/google/callback`)
      if (mail && email !== user.email.toLowerCase()) return fail(`Koppel je eigen mailbox (${user.email}), niet ${email}.`)
      const calendars = mail ? undefined : await listCalendarsWithToken(accessToken)
      await saveTeamConnection({ member: user.email, kind: mail ? 'mail' : 'agenda', googleEmail: email, refreshToken, scopes, calendars })
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Koppelen mislukt.')
    }
    back.searchParams.set('ok', mail ? 'mail' : 'agenda')
    const r = NextResponse.redirect(back)
    r.cookies.delete({ name: 'ikr_google_state', path: '/admin/auth/google' })
    return r
  }

  try {
    const { email, refreshToken, scopes } = await exchangeCode(code, `${req.nextUrl.origin}/admin/auth/google/callback`)
    const expected = target === 'contact' ? CONTACT_EMAIL : user.email.toLowerCase()
    if (email !== expected) return fail(`Je koppelde ${email}, maar het moet ${expected} zijn.`)
    await saveConnection(email, refreshToken, scopes, user.email)
    // Contact-agenda net gekoppeld: weeklies die eerder zonder agenda-item/Meet bleven, alsnog aanmaken.
    if (email === CONTACT_EMAIL) await retryOpenCalendars(session.weekly).catch((e) => console.error('[weekly] agenda opnieuw', e))
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Koppelen mislukt.')
  }
  back.searchParams.set('ok', '1')
  const r = NextResponse.redirect(back)
  r.cookies.delete({ name: 'ikr_google_state', path: '/admin/auth/google' })
  return r
}

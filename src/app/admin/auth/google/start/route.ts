import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'node:crypto'
import { requireAdmin } from '@/lib/admin/session'
import { authUrl, isGoogleConfigured, SCOPES, TEAM_SCOPES } from '@/lib/admin/google'
import { tokenKeyProblem } from '@/lib/admin/crypto'
import { CONTACT_EMAIL } from '@/lib/admin/weekly/types'
import { canSeeSales } from '@/lib/admin/env'

/** Start "Connect calendar": voor jezelf (?voor=mij) of voor de contact-agenda (?voor=contact). */
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  const back = new URL('/admin/instellingen', req.nextUrl.origin)
  if (!isGoogleConfigured()) {
    back.searchParams.set('fout', 'Google is nog niet ingesteld (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).')
    return NextResponse.redirect(back)
  }
  const voor = req.nextUrl.searchParams.get('voor')
  const state = randomBytes(24).toString('hex')
  const cookie = (target: string) => ({
    name: 'ikr_google_state',
    value: `${state}:${target}`,
    options: { httpOnly: true, secure: req.nextUrl.protocol === 'https:', sameSite: 'lax' as const, path: '/admin/auth/google', maxAge: 600 },
  })

  // Mijn koppelingen: eigen mailbox (alleen lezen) of agenda('s) (alleen lezen), elk apart en met minimale rechten.
  if (voor === 'team-mail' || voor === 'team-agenda') {
    const keyProblem = tokenKeyProblem()
    if (keyProblem) {
      back.searchParams.set('fout', keyProblem)
      return NextResponse.redirect(back)
    }
    const mail = voor === 'team-mail'
    const res = NextResponse.redirect(
      authUrl({
        redirectUri: `${req.nextUrl.origin}/admin/auth/google/callback`,
        state,
        scopes: mail ? TEAM_SCOPES.mail : TEAM_SCOPES.agenda,
        // Mail = je eigen adres; voor de agenda mag je een ander (IKR-)account kiezen.
        loginHint: mail ? user.email : undefined,
        chooseAccount: !mail,
        includeGranted: false,
      }),
    )
    const c = cookie(voor)
    res.cookies.set(c.name, c.value, c.options)
    return res
  }

  const forContact = voor === 'contact'
  const res = NextResponse.redirect(
    authUrl({
      redirectUri: `${req.nextUrl.origin}/admin/auth/google/callback`,
      state,
      loginHint: forContact ? CONTACT_EMAIL : user.email,
      // contact@: agenda + Drive (opnames en transcripts) + mails lezen (oude verzonden mails voor de schrijfstijl).
      // Casper: enkel Gmail (sales-inbox); zijn agenda is persoonlijk en krijgt uitnodigingen.
      // Cedric en Milan: hun agenda.
      scopes: forContact
        ? [SCOPES.calendar, SCOPES.drive, SCOPES.driveFull, SCOPES.gmailRead]
        : canSeeSales(user.email)
          ? [SCOPES.gmailRead, SCOPES.gmailSend]
          : [SCOPES.calendar],
    }),
  )
  res.cookies.set('ikr_google_state', `${state}:${forContact ? 'contact' : 'mij'}`, {
    httpOnly: true,
    secure: req.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/admin/auth/google',
    maxAge: 600,
  })
  return res
}

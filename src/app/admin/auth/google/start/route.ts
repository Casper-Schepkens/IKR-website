import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'node:crypto'
import { requireAdmin } from '@/lib/admin/session'
import { authUrl, isGoogleConfigured, SCOPES } from '@/lib/admin/google'
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
  const forContact = req.nextUrl.searchParams.get('voor') === 'contact'
  const state = randomBytes(24).toString('hex')
  const res = NextResponse.redirect(
    authUrl({
      redirectUri: `${req.nextUrl.origin}/admin/auth/google/callback`,
      state,
      loginHint: forContact ? CONTACT_EMAIL : user.email,
      // contact@: agenda + Drive (opnames en transcripts) + mails lezen (oude verzonden mails voor de schrijfstijl).
      // Casper: enkel Gmail (sales-inbox); zijn agenda is persoonlijk en krijgt uitnodigingen.
      // Cedric en Milan: hun agenda.
      scopes: forContact
        ? [SCOPES.calendar, SCOPES.drive, SCOPES.gmailRead]
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

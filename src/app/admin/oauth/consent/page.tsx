import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/session'
import { createServerSupabase } from '@/lib/admin/supabase/server'
import { SubmitButton } from '@/components/admin/SubmitButton'
import { Icon } from '@/components/admin/ui'
import { decideOAuthAction } from './actions'

export const metadata: Metadata = { title: 'Toegang geven' }

const SCOPES: Record<string, string> = {
  openid: 'Je identiteit bevestigen',
  email: 'Je e-mailadres',
  profile: 'Je naam',
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ikr-navy p-4">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl bg-ikr-cream-light p-8">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[44px] leading-none font-black tracking-[-0.03em]">IKR.</span>
          <span className="rounded-full bg-ikr-cyan px-2.5 py-1 text-xs font-semibold">ADMIN</span>
        </div>
        {children}
      </div>
    </div>
  )
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string; fout?: string }>
}) {
  const { authorization_id: id, fout } = await searchParams
  const session = await requireAdmin()

  if (!id) {
    return (
      <Shell>
        <p className="m-0 text-sm">Deze link is onvolledig. Start het koppelen opnieuw vanuit Claude.</p>
      </Shell>
    )
  }
  if (session.mode !== 'supabase') {
    return (
      <Shell>
        <p className="m-0 text-sm">Koppelen met Claude werkt alleen met de echte database, niet in de demomodus.</p>
      </Shell>
    )
  }

  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id)
  if (error || !data) {
    return (
      <Shell>
        <p role="alert" className="m-0 rounded-2xl bg-[#FCE3D2] p-4 text-sm text-[#6E2E09]">
          Deze aanvraag is verlopen of ongeldig. Probeer opnieuw te koppelen vanuit Claude.
        </p>
      </Shell>
    )
  }
  // Al eerder toegestaan: meteen terug naar de app.
  if (!('authorization_id' in data)) redirect(data.redirect_url)

  const clientName = data.client?.name || 'Een app'
  let redirectHost = ''
  try {
    redirectHost = new URL(data.redirect_uri).host
  } catch {}
  const scopes = (data.scope ?? '').split(' ').filter(Boolean)

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-ikr-navy text-ikr-cyan">
          <Icon.sparkle size={22} />
        </span>
        <div>
          <h1 className="m-0 font-display text-2xl font-black uppercase">{clientName}</h1>
          <p className="m-0 text-sm text-[#5E5670]">wil toegang tot IKR Admin</p>
        </div>
      </div>
      {fout && (
        <p role="alert" className="m-0 rounded-2xl bg-[#FCE3D2] p-4 text-sm text-[#6E2E09]">
          Dat lukte niet. Probeer het opnieuw.
        </p>
      )}
      <div className="flex flex-col gap-2 rounded-2xl bg-ikr-cream p-4 text-sm">
        <span className="font-semibold">
          Als je toestaat, kan {clientName} namens <strong>{session.user.email}</strong>:
        </span>
        <ul className="m-0 pl-5 leading-relaxed">
          <li>klanten, ideeën, kalender en resultaten lezen</li>
          <li>ideeën, notities, afspraken en draaiboeken toevoegen of aanpassen</li>
          {scopes.map((s) => (
            <li key={s}>{SCOPES[s] ?? s}</li>
          ))}
        </ul>
        <span className="text-xs text-[#5E5670]">
          Klanten verwijderen of facturen versturen kan niet via deze koppeling.
          {redirectHost && ` Je wordt teruggestuurd naar ${redirectHost}.`}
        </span>
      </div>
      <div className="flex gap-3">
        <form action={decideOAuthAction.bind(null, id, true)} className="flex-1">
          <SubmitButton className="ikr-btn inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ikr-cyan px-5 text-sm font-semibold text-ikr-navy" pendingText="Bezig…">
            Toestaan
          </SubmitButton>
        </form>
        <form action={decideOAuthAction.bind(null, id, false)}>
          <SubmitButton variant="soft" pendingText="Bezig…">
            Weigeren
          </SubmitButton>
        </form>
      </div>
    </Shell>
  )
}

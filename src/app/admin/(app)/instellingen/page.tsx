import { requireAdmin } from '@/lib/admin/session'
import { isGoogleConfigured, listConnections } from '@/lib/admin/google'
import { CONTACT_EMAIL, TEAM } from '@/lib/admin/weekly/types'
import { fmtDate } from '@/lib/admin/format'
import { buttonClass, Card, muted, PageHeader, Pill, Title } from '@/components/admin/ui'
import { cn } from '@/utilities/ui'
import { canSeeSales } from '@/lib/admin/env'
import { AiCosts } from './AiCosts'
import { StyleProfiles } from './StyleProfiles'

export const metadata = { title: 'Instellingen' }

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; fout?: string }> }) {
  const { ok, fout } = await searchParams
  const { user } = await requireAdmin()
  const connections = await listConnections()
  const status = (email: string) => connections.find((c) => c.email === email)
  const rows = [
    ...TEAM.map((t) => ({
      label: t.key === 'casper' ? 'Casper · Gmail (sales-inbox)' : t.name,
      email: t.email,
      note: t.calendar !== t.email ? `Agenda-uitnodigingen gaan naar ${t.calendar}` : null,
      button: t.key === 'casper' ? 'Connect Gmail' : 'Connect calendar',
      mine: t.email === user.email.toLowerCase(),
      contact: false,
    })),
    { label: 'Contact-agenda', email: CONTACT_EMAIL, note: null, button: 'Connect calendar', mine: false, contact: true },
  ]

  return (
    <>
      <PageHeader eyebrow={`Ingelogd als ${user.email}`} title="Instellingen" />
      {ok && <p className="m-0 rounded-2xl bg-[#DDF2DF] p-4 text-sm text-[#1E5B27]">Gekoppeld.</p>}
      {fout && (
        <p role="alert" className="m-0 rounded-2xl bg-[#FCE3D2] p-4 text-sm text-[#6E2E09]">
          {fout}
        </p>
      )}
      <Card className="flex flex-col gap-1">
        <Title className="m-0 mb-1 text-2xl">Koppelingen</Title>
        <p className={cn('m-0 mb-2 text-sm', muted)}>
          Elke weekly komt in de contact-agenda, met een uitnodiging voor Casper; Cedric en Milan krijgen ze zodra hun agenda
          gekoppeld is. Iedereen koppelt zijn eigen account; de contact-agenda koppel je één keer met contact@iknowright.be.
        </p>
        {!isGoogleConfigured() && (
          <p className="m-0 mb-2 text-sm text-[#A3470F]">Google is nog niet ingesteld (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).</p>
        )}
        {rows.map((r) => {
          const c = status(r.email)
          return (
            <div key={r.email} className="flex flex-wrap items-center gap-3 border-t border-[#E6DFD2] py-3.5">
              <div className="flex flex-[1_1_240px] flex-col">
                <span className="font-semibold">{r.label}</span>
                <span className={cn('text-xs', muted)}>{r.email}</span>
                {r.note && <span className={cn('text-xs', muted)}>{r.note}</span>}
              </div>
              {c ? (
                <Pill tone="green">Gekoppeld · {fmtDate(c.connected_at)}</Pill>
              ) : (
                <Pill tone="orange">Niet gekoppeld</Pill>
              )}
              {(r.mine || r.contact) && (
                <a
                  href={`/admin/auth/google/start?voor=${r.contact ? 'contact' : 'mij'}`}
                  className={buttonClass(c ? 'soft' : 'navy', true)}
                >
                  {c ? 'Opnieuw koppelen' : r.button}
                </a>
              )}
            </div>
          )
        })}
      </Card>
      {canSeeSales(user.email) && process.env.SUPABASE_SERVICE_ROLE_KEY && <StyleProfiles />}
      {canSeeSales(user.email) && process.env.SUPABASE_SERVICE_ROLE_KEY && <AiCosts />}
    </>
  )
}

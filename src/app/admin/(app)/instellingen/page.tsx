import { requireAdmin } from '@/lib/admin/session'
import { isGoogleConfigured, listConnections } from '@/lib/admin/google'
import { CONTACT_EMAIL, TEAM } from '@/lib/admin/weekly/types'
import { fmtDate } from '@/lib/admin/format'
import { buttonClass, Card, muted, PageHeader, Pill, Title } from '@/components/admin/ui'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Instellingen' }

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; fout?: string }> }) {
  const { ok, fout } = await searchParams
  const { user } = await requireAdmin()
  const connections = await listConnections()
  const status = (email: string) => connections.find((c) => c.email === email)
  const rows = [
    ...TEAM.map((t) => ({ label: t.name, email: t.email, mine: t.email === user.email.toLowerCase(), contact: false })),
    { label: 'Contact-agenda', email: CONTACT_EMAIL, mine: false, contact: true },
  ]

  return (
    <>
      <PageHeader eyebrow={`Ingelogd als ${user.email}`} title="Instellingen" />
      {ok && <p className="m-0 rounded-2xl bg-[#DDF2DF] p-4 text-sm text-[#1E5B27]">Agenda gekoppeld.</p>}
      {fout && (
        <p role="alert" className="m-0 rounded-2xl bg-[#FCE3D2] p-4 text-sm text-[#6E2E09]">
          {fout}
        </p>
      )}
      <Card className="flex flex-col gap-1">
        <Title className="m-0 mb-1 text-2xl">Agenda&apos;s</Title>
        <p className={cn('m-0 mb-2 text-sm', muted)}>
          Elke weekly komt in de contact-agenda en in die van Casper; Cedric en Milan krijgen ze zodra hun agenda gekoppeld is.
          Iedereen koppelt zijn eigen agenda; de contact-agenda koppel je één keer met contact@iknowright.be.
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
                  {c ? 'Opnieuw koppelen' : 'Connect calendar'}
                </a>
              )}
            </div>
          )
        })}
      </Card>
    </>
  )
}

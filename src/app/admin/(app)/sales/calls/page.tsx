import { requireSales } from '@/lib/admin/session'
import { syncCallsFromCalendar } from '@/lib/admin/calls/service'
import { leadContext } from '@/lib/admin/sales/waiting-core'
import { OPEN_STAGES } from '@/lib/admin/sales/types'
import { Card, Empty, muted, PageHeader, Title } from '@/components/admin/ui'
import { CallCard, type CallLead } from '@/components/admin/calls/CallCard'
import { NewCallForm, SyncCallsButton } from '@/components/admin/calls/CallForms'
import { BackgroundSync } from '@/components/admin/BackgroundSync'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Calls' }

/** Tijdstip van deze render (servercomponent, één keer per verzoek). */
function clock() {
  return Date.now()
}

/** Setter- en sales calls op één plek: komende calls met context, Meet, ppt, opname en afronden. */
export default async function CallsPage() {
  const { calls, leads } = await requireSales()
  const [all, allLeads] = await Promise.all([calls.list(), leads.list()])
  const byId = new Map(allLeads.map((l) => [l.id, l]))
  const view = (id: string): CallLead | null => {
    const l = byId.get(id)
    return l ? { id: l.id, name: l.name, company: l.company, phone: l.phone, context: leadContext(l) } : null
  }
  const now = clock()
  const open = all.filter((c) => c.status === 'gepland')
  const recent = all.filter((c) => c.status !== 'gepland' && now - new Date(c.starts_at).getTime() < 30 * 86_400_000).slice(0, 15)
  const leadOptions = allLeads.filter((l) => OPEN_STAGES.includes(l.stage)).map((l) => ({ id: l.id, label: l.company ? `${l.company} (${l.name})` : l.name }))

  return (
    <>
      <PageHeader eyebrow={`${open.length} ${open.length === 1 ? 'call' : 'calls'} gepland`} title="Calls">
        <SyncCallsButton />
      </PageHeader>
      {/* Zelf ingeplande calls uit de contact-agenda ophalen (hoogstens om de 5 min), zonder dat de pagina erop wacht. */}
      <BackgroundSync
        run={async () => {
          const r = await syncCallsFromCalendar({ calls, leads })
          return { changed: r.nieuw + r.bijgewerkt > 0 }
        }}
        label="Contact-agenda nakijken…"
        errorPrefix="Contact-agenda niet gelezen"
      />

      <section aria-label="Komende calls" className="flex flex-col gap-3">
        {!open.length && (
          <Card>
            <Empty>Geen geplande calls. Plan er een vanuit de inbox (&quot;Verstuur en plan in agenda&quot;) of hieronder.</Empty>
          </Card>
        )}
        {open.map((c) => (
          <CallCard key={c.id} call={c} lead={view(c.lead_id)} overdue={new Date(c.ends_at).getTime() < now} />
        ))}
      </section>

      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Call toevoegen</Title>
        <p className={cn('m-0 text-sm', muted)}>
          Komt in de contact-agenda met een uitnodiging voor jou; sales call = met Google Meet. Calls die je zelf in de contact-agenda zet, verschijnen hier vanzelf.
        </p>
        <NewCallForm leads={leadOptions} />
      </Card>

      {recent.length > 0 && (
        <section aria-label="Recente calls" className="flex flex-col gap-3">
          <Title className="m-0 text-2xl">Recent</Title>
          {recent.map((c) => (
            <CallCard key={c.id} call={c} lead={view(c.lead_id)} overdue={false} />
          ))}
        </section>
      )}
    </>
  )
}

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { daysBetween, euro } from '@/lib/admin/format'
import { Kanban, type KanbanCard } from '@/components/admin/Kanban'
import { EmailDraftButton } from '@/components/admin/EmailDraftButton'
import { buttonClass, Icon, PageHeader } from '@/components/admin/ui'

export const metadata = { title: 'Pipeline' }

export default async function PipelinePage() {
  const { repo } = await requireAdmin()
  const [clients, contracts] = await Promise.all([repo.listClients(), repo.listContracts()])
  const now = new Date()
  const visible = clients.filter((c) => c.stage !== 'churned')

  const cards: KanbanCard[] = visible.map((c) => {
    const contract = contracts.find((k) => k.client_id === c.id && k.status === 'active')
    return {
      id: c.id,
      name: c.name,
      stage: c.stage,
      daysInStage: Math.max(0, daysBetween(c.stage_changed_at, now)),
      meta:
        c.source && (c.stage === 'lead' || c.stage === 'sales_call') ? `via ${c.source}` : c.sector,
      amount: contract ? `${euro(contract.monthly_amount_cents)} / mnd` : null,
    }
  })

  const stuckLead = visible
    .filter((c) => c.stage === 'lead')
    .map((c) => ({ c, days: daysBetween(c.stage_changed_at, now) }))
    .sort((a, b) => b.days - a.days)[0]

  return (
    <>
      <PageHeader
        eyebrow={`${visible.length} klanten in het proces · sleep een kaart naar een andere fase`}
        title="Pipeline"
      >
        <Link href="/admin/klanten?nieuw=1" className={buttonClass('cyan')}>
          + Lead
        </Link>
      </PageHeader>

      <Kanban cards={cards} />

      {stuckLead && stuckLead.days >= 3 && (
        <section
          aria-label="AI-suggestie"
          className="flex flex-wrap items-center gap-4 rounded-[22px] bg-ikr-cream-light px-6 py-5"
        >
          <Icon.sparkle size={22} className="text-[#0B7F93]" />
          <p className="m-0 flex-[1_1_360px] text-[15px] leading-normal">
            <strong>IKR AI:</strong> {stuckLead.c.name} staat al {stuckLead.days} dagen als lead
            zonder opvolging. Zal ik een eerste mail opstellen?
          </p>
          <EmailDraftButton
            clientId={stuckLead.c.id}
            clientName={stuckLead.c.name}
            purpose="lead_intro"
            label="Mail opstellen"
            variant="cyan"
          />
        </section>
      )}
    </>
  )
}

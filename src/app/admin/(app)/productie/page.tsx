import { requireAdmin } from '@/lib/admin/session'
import { isSalesOwner } from '@/lib/admin/env'
import { myInternalItems, myNextSteps, type TeamMember } from '@/lib/admin/production/core'
import { listChanges, loadProduction, today } from '@/lib/admin/production/service'
import { ownerOf } from '@/lib/admin/weekly/types'
import { PageHeader } from '@/components/admin/ui'
import { NextSteps, type PersonSteps } from '@/components/admin/production/NextSteps'
import { ProductionBoard, TemplateCard } from '@/components/admin/production/ProductionBoard'
import { InternalBlock } from '@/components/admin/production/InternalBlock'
import { ChangeLog } from '@/components/admin/production/ChangeLog'

export const metadata = { title: 'Productie' }

/**
 * Productie (voor Cédric en Milan): het contentproces per klant als single source of truth.
 * Stappen, eigenaars en deadlineregels staan in de database (sjabloon + kopie per klant).
 * Casper ziet alles voorlopig ook, met "(temp)" bij wat later voor hem verdwijnt.
 */
export default async function ProductionPage() {
  const { clients, production, user } = await requireAdmin()
  const day = today()
  const [clientList, changes] = await Promise.all([clients.list(), listChanges(production, { limit: 40 }).catch(() => [])])
  const { list, notStarted, internal, template } = await loadProduction(production, clientList.map((c) => ({ id: c.id, name: c.name })), day)
  const temp = isSalesOwner(user.email)
  const me = ownerOf(user.email) as TeamMember | null
  const people: PersonSteps[] = (
    [
      ['cedric', 'Cédric'],
      ['milan', 'Milan'],
      ['casper', 'Casper'],
    ] as const
  ).map(([key, name]) => ({
    key,
    name,
    items: [
      ...myNextSteps(list, key).map(({ client, step }) => ({ kind: 'step' as const, clientId: client.client_id, clientName: client.name, step })),
      ...myInternalItems(internal, key).map((item) => ({ kind: 'intern' as const, item })),
    ],
  }))
  const late = list.reduce((n, c) => n + (c.production.active ? c.open.filter((s) => s.overdue).length : 0), 0) + internal.filter((i) => i.overdue).length
  return (
    <>
      <PageHeader eyebrow={`${list.filter((c) => c.production.active).length} klanten in productie${late ? ` · ${late} stap${late > 1 ? 'pen' : ''} te laat` : ''}`} title={temp ? 'Productie (temp)' : 'Productie'} />
      <NextSteps people={people} me={me} today={day} temp={false} />
      <ProductionBoard list={list} notStarted={notStarted} today={day} temp={false} />
      <InternalBlock items={internal} today={day} me={me} />
      {template && <TemplateCard steps={template.steps} name={template.template.name} />}
      <ChangeLog
        changes={changes.map((c) => ({ id: c.id, at: c.created_at, by: c.by, summary: c.summary, rows: c.changes.length, reverted: c.reverted_at, isRevert: Boolean(c.revert_of) }))}
      />
    </>
  )
}

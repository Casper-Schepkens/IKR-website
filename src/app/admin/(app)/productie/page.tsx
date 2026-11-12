import { requireAdmin } from '@/lib/admin/session'
import { canSeeSales } from '@/lib/admin/env'
import { myNextSteps } from '@/lib/admin/production/core'
import { loadProduction, today } from '@/lib/admin/production/service'
import { ownerOf } from '@/lib/admin/weekly/types'
import { PageHeader } from '@/components/admin/ui'
import { NextSteps, type PersonSteps } from '@/components/admin/production/NextSteps'
import { ProductionBoard } from '@/components/admin/production/ProductionBoard'

export const metadata = { title: 'Productie' }

/**
 * Productie (voor Cédric en Milan): het contentproces per klant als single source of truth.
 * Casper ziet alles voorlopig ook, met "(temp)" bij wat later voor hem verdwijnt.
 */
export default async function ProductionPage() {
  const { clients, production, user } = await requireAdmin()
  const day = today()
  const { list, notStarted } = await loadProduction(production, (await clients.list()).map((c) => ({ id: c.id, name: c.name })), day)
  const temp = canSeeSales(user.email)
  const people: PersonSteps[] = (
    [
      ['cedric', 'Cédric'],
      ['milan', 'Milan'],
      ['casper', 'Casper'],
    ] as const
  ).map(([key, name]) => ({ key, name, items: myNextSteps(list, key).map(({ client, step }) => ({ clientId: client.client_id, clientName: client.name, step })) }))
  const late = list.reduce((n, c) => n + (c.production.active ? c.open.filter((s) => s.overdue).length : 0), 0)
  return (
    <>
      <PageHeader eyebrow={`${list.filter((c) => c.production.active).length} klanten in productie${late ? ` · ${late} stap${late > 1 ? 'pen' : ''} te laat` : ''}`} title={temp ? 'Productie (temp)' : 'Productie'} />
      <NextSteps people={people} me={ownerOf(user.email)} today={day} temp={false} />
      <ProductionBoard list={list} notStarted={notStarted} today={day} temp={false} />
    </>
  )
}

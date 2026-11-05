import { requireAdmin } from '@/lib/admin/session'
import { contractTone, daysLeft } from '@/lib/admin/clients/types'
import { isoDay } from '@/lib/admin/format'
import { Card, Empty, muted, PageHeader, Title } from '@/components/admin/ui'
import { FormAction } from '@/components/admin/FormAction'
import { ClientRow } from '@/components/admin/clients/ClientRow'
import { ClientFields } from '@/components/admin/clients/ClientFields'
import { createClientAction } from '../../clients-actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Klanten' }

/** Overzicht van alle klanten: freelancer en wanneer het contract afloopt (eerst aflopend bovenaan). */
export default async function ClientsPage() {
  const { clients } = await requireAdmin()
  const list = await clients.list()
  const today = isoDay(new Date())
  const soon = list.filter((c) => contractTone(daysLeft(c, today)) === 'red').length

  return (
    <>
      <PageHeader
        eyebrow={`${list.length} ${list.length === 1 ? 'klant' : 'klanten'}${soon ? ` · ${soon} contract${soon === 1 ? '' : 'en'} loopt binnen 30 dagen af` : ''}`}
        title="Klanten"
      />

      <Card className="relative overflow-x-auto p-0">
        {!list.length ? (
          <div className="p-6">
            <Empty>Nog geen klanten. Voeg er hieronder een toe (of vraag het aan Grok Bot).</Empty>
          </div>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className={cn('text-xs', muted)}>
                <th scope="col" className="px-6 py-4 font-semibold">Klant</th>
                <th scope="col" className="px-3 py-4 font-semibold">Freelancer</th>
                <th scope="col" className="px-3 py-4 font-semibold">Contract</th>
                <th scope="col" className="px-3 py-4 font-semibold">Nog</th>
                <th scope="col" className="px-6 py-4"><span className="sr-only">Acties</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <ClientRow key={c.id} client={c} days={daysLeft(c, today)} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Nieuwe klant</Title>
        <FormAction action={createClientAction} submitLabel="Klant toevoegen" pendingText="Toevoegen…" resetOnSuccess>
          <ClientFields />
        </FormAction>
      </Card>
    </>
  )
}

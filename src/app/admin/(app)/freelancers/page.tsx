import { requireAdmin } from '@/lib/admin/session'
import { Card, muted, PageHeader, Title } from '@/components/admin/ui'
import { FormAction } from '@/components/admin/FormAction'
import { FreelancerTable } from '@/components/admin/freelancers/FreelancerTable'
import { FreelancerFields } from '@/components/admin/freelancers/FreelancerFields'
import { ScoreLegend } from '@/components/admin/freelancers/shared'
import { createFreelancerAction } from '../../freelancers-actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Freelancers' }

/**
 * Eén centrale lijst van onze freelancers: wie bij welke klant zit en wie het al bewezen heeft
 * (score = fase uit Milans kleurensysteem). Hele team kan alles aanpassen, ook Grok Bot via MCP.
 */
export default async function FreelancersPage() {
  const { freelancers, clients } = await requireAdmin()
  const [list, clientList] = await Promise.all([freelancers.list(), clients.list()])
  const clientOptions = clientList.map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name, 'nl'))
  const proven = list.filter((f) => f.score === 'groen' || f.score === 'zekerheid').length

  return (
    <>
      <PageHeader
        eyebrow={`${list.length} ${list.length === 1 ? 'freelancer' : 'freelancers'}${proven ? ` · ${proven} bewezen (groen of zekerheid)` : ''}`}
        title="Freelancers"
      >
        <a href="#nieuwe-freelancer" className="ikr-btn inline-flex min-h-11 items-center justify-center rounded-full bg-adm-inverse px-[18px] text-sm font-semibold text-ikr-cream-light no-underline hover:bg-adm-inverse-hover">
          Nieuwe freelancer
        </a>
      </PageHeader>

      <Card className="flex flex-col gap-2 py-4">
        <p className={cn('m-0 text-xs font-semibold', muted)}>Score (Milans kleurensysteem)</p>
        <ScoreLegend />
      </Card>

      <Card className="relative overflow-x-auto p-0">
        <FreelancerTable freelancers={list} clients={clientOptions} />
      </Card>

      <Card className="flex flex-col gap-3">
        <Title as="h2" className="m-0 text-2xl">
          <span id="nieuwe-freelancer" className="scroll-mt-24">Nieuwe freelancer</span>
        </Title>
        <FormAction action={createFreelancerAction} submitLabel="Freelancer toevoegen" pendingText="Toevoegen…" resetOnSuccess>
          <FreelancerFields clients={clientOptions} />
        </FormAction>
      </Card>
    </>
  )
}

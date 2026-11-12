import { requireAdmin } from '@/lib/admin/session'
import { Card, PageHeader, Title } from '@/components/admin/ui'
import { FormAction } from '@/components/admin/FormAction'
import { SopBrowser } from '@/components/admin/sops/SopBrowser'
import { SopFields } from '@/components/admin/sops/SopFields'
import { SopProposals } from '@/components/admin/sops/SopProposals'
import { createSopAction } from '../../sops-actions'

export const metadata = { title: "SOP's" }

/** SOP's: afspraken en best practices per categorie, doorzoekbaar (ook voor Grok Bot). Hele team. */
export default async function SopsPage() {
  const { sops } = await requireAdmin()
  const all = await sops.list()
  const proposals = all.filter((s) => s.status === 'voorstel')
  const valid = all.filter((s) => s.status === 'afgesproken').length
  return (
    <>
      <PageHeader eyebrow={`${valid} afspraken${proposals.length ? ` · ${proposals.length} voorstel${proposals.length > 1 ? 'len' : ''}` : ''}`} title="SOP's" />
      <SopProposals proposals={proposals} />
      <SopBrowser sops={all} />
      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Nieuwe SOP</Title>
        <FormAction action={createSopAction} submitLabel="SOP toevoegen" pendingText="Toevoegen…" resetOnSuccess>
          <SopFields />
        </FormAction>
      </Card>
    </>
  )
}

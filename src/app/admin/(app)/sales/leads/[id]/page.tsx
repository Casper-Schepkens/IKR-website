import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSales } from '@/lib/admin/session'
import { fmtDate } from '@/lib/admin/format'
import {
  LOST_REASON_LABELS,
  LOST_REASONS,
  SOURCE_LABELS,
  SOURCES,
  STAGE_LABELS,
  STAGES,
} from '@/lib/admin/sales/types'
import { FormAction } from '@/components/admin/FormAction'
import { Card, input, label, muted, Pill, Title } from '@/components/admin/ui'
import { markLostAction, setStageAction, updateLeadAction } from '../../../../actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Lead' }

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { leads } = await requireSales()
  const lead = await leads.get(id)
  if (!lead) notFound()
  const lost = lead.stage === 'lost'

  return (
    <>
      <nav aria-label="Kruimelpad" className={cn('text-sm', muted)}>
        <Link href="/admin/sales" className={cn(muted, 'no-underline hover:underline')}>
          Leads
        </Link>{' '}
        / <span className="font-semibold text-ikr-navy">{lead.name}</span>
      </nav>

      <div className="flex flex-col gap-2">
        <Title as="h1" className="m-0 text-5xl leading-[0.9] md:text-[72px] md:leading-[0.88]">
          {lead.name}
        </Title>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={lost ? 'orange' : lead.stage === 'won' ? 'green' : 'teal'}>{STAGE_LABELS[lead.stage]}</Pill>
          {lead.company && <Pill tone="light">{lead.company}</Pill>}
          <Pill tone="light">{SOURCE_LABELS[lead.source]}</Pill>
          <Pill tone="light">Lead sinds {fmtDate(lead.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</Pill>
        </div>
        {lost && lead.lost_reason && (
          <p className="m-0 mt-2 rounded-2xl bg-[#FCE3D2] p-4 text-sm text-[#6E2E09]">
            <strong>Lost:</strong> {LOST_REASON_LABELS[lead.lost_reason]}
            {lead.lost_note && <> · {lead.lost_note}</>}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <Card className="flex min-w-0 flex-[2_1_420px] flex-col gap-4">
          <Title className="m-0 text-2xl">Gegevens</Title>
          <FormAction action={updateLeadAction.bind(null, lead.id)}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <label className={label}>
                Naam
                <input name="name" defaultValue={lead.name} required className={input} />
              </label>
              <label className={label}>
                Bedrijf
                <input name="company" defaultValue={lead.company ?? ''} className={input} />
              </label>
              <label className={label}>
                E-mail
                <input name="email" type="email" defaultValue={lead.email ?? ''} className={input} />
              </label>
              <label className={label}>
                Telefoon
                <input name="phone" type="tel" defaultValue={lead.phone ?? ''} className={input} />
              </label>
              <label className={label}>
                Bron
                <select name="source" defaultValue={lead.source} className={input}>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </FormAction>
        </Card>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          <Card className="flex flex-col gap-3">
            <Title className="m-0 text-2xl">Fase</Title>
            <p className={cn('m-0 text-sm', muted)}>Voorlopig manueel; wordt automatisch zodra boekingen en calls gekoppeld zijn.</p>
            <FormAction action={setStageAction.bind(null, lead.id)} submitLabel={lost ? 'Heropenen' : 'Opslaan'}>
              <select name="stage" aria-label="Fase" defaultValue={lost ? 'lead' : lead.stage} className={input}>
                {STAGES.filter((s) => s !== 'lost').map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </FormAction>
          </Card>

          {!lost && (
            <Card className="flex flex-col gap-3">
              <Title className="m-0 text-2xl">Lead lost</Title>
              <FormAction action={markLostAction.bind(null, lead.id)} submitLabel="Markeer als lost" pendingText="Bezig…" submitVariant="soft">
                <label className={label}>
                  Reden
                  <select name="reason" required defaultValue="" className={input}>
                    <option value="" disabled>
                      Kies een reden
                    </option>
                    {LOST_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {LOST_REASON_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  Notitie
                  <textarea name="note" rows={2} className={cn(input, 'py-2')} />
                </label>
              </FormAction>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

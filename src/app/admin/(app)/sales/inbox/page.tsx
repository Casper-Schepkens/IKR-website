import Link from 'next/link'
import { after } from 'next/server'
import { requireSales } from '@/lib/admin/session'
import { loadInbox } from '@/lib/admin/sales/inbox'
import { isAiConfigured, runJob } from '@/lib/admin/ai/jobs'
import { buttonClass, Card, Empty, muted, PageHeader } from '@/components/admin/ui'
import { InboxCard, RefreshWhilePending } from '@/components/admin/sales/InboxCard'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Inbox' }
export const maxDuration = 120

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams
  const tab = tabParam === 'gemaild' ? 'gemaild' : 'nieuw'
  const session = await requireSales()

  let result: Awaited<ReturnType<typeof loadInbox>>
  try {
    result = await loadInbox(session)
  } catch (e) {
    return (
      <>
        <PageHeader title="Inbox" />
        <Card>
          <p role="alert" className="m-0 text-[#A3470F]">
            {e instanceof Error ? e.message : 'De inbox kon niet geladen worden.'}
          </p>
        </Card>
      </>
    )
  }

  if (result.status === 'not_connected') {
    return (
      <>
        <PageHeader title="Inbox" />
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className={cn('m-0', muted)}>{result.reason}</p>
          <Link href="/admin/instellingen" className={buttonClass('navy', true)}>
            Naar Instellingen
          </Link>
        </Card>
      </>
    )
  }

  // Antwoorden klaarzetten na het tonen van de pagina; de pagina ververst zichzelf tot ze klaar zijn.
  if (result.pendingJobIds.length && isAiConfigured()) {
    const ids = result.pendingJobIds
    after(async () => {
      for (const id of ids) await runJob(id)
    })
  }

  const items = result.items.filter((i) => i.tab === tab)
  const count = (t: 'nieuw' | 'gemaild') => result.items.filter((i) => i.tab === t).length
  const busy = result.items.some((i) => !i.job || i.job.status === 'pending' || i.job.status === 'running')

  return (
    <>
      <RefreshWhilePending active={busy} />
      <PageHeader eyebrow={`${result.items.length} sales-mails wachten op een antwoord`} title="Inbox" />
      {!isAiConfigured() && (
        <p className="m-0 rounded-2xl bg-[#FCE3D2] p-4 text-sm text-[#6E2E09]">
          ANTHROPIC_API_KEY ontbreekt in Vercel: er worden nog geen antwoorden klaargezet.
        </p>
      )}
      <nav aria-label="Tabs" className="flex flex-wrap gap-2">
        {(['nieuw', 'gemaild'] as const).map((t) => (
          <Link
            key={t}
            href={t === 'nieuw' ? '/admin/sales/inbox' : '/admin/sales/inbox?tab=gemaild'}
            aria-current={tab === t ? 'page' : undefined}
            className={buttonClass(tab === t ? 'navy' : 'light', true)}
          >
            {t === 'nieuw' ? 'Nieuwe leads' : 'Al gemaild'} <span className="opacity-60">{count(t)}</span>
          </Link>
        ))}
      </nav>
      {!items.length && (
        <Card>
          <Empty>Niets dat op een antwoord wacht.</Empty>
        </Card>
      )}
      {items.map((i) => (
        <InboxCard
          key={i.last.id}
          threadId={i.thread.id}
          leadId={i.lead.id}
          leadName={i.lead.name}
          company={i.lead.company}
          fromEmail={i.last.fromEmail}
          date={i.last.date}
          subject={i.last.subject}
          text={i.last.text}
          showContext={i.tab === 'gemaild'}
          job={i.job ? { id: i.job.id, status: i.job.status, error: i.job.error, output: i.job.output as never } : null}
        />
      ))}
    </>
  )
}

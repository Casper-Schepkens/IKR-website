import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { computeTodos, type TodoTag } from '@/lib/admin/todos'
import {
  addDays,
  compactNumber,
  euro,
  fmtDate,
  fmtLongDate,
  fmtTime,
  greeting,
} from '@/lib/admin/format'
import { summarizeResults } from '@/lib/admin/results'
import { BOARD_STAGES, STAGE_LABELS, type EventKind } from '@/lib/admin/types'
import { isBillitConfigured } from '@/lib/admin/integrations/billit'
import { CommandBar } from '@/components/admin/CommandBar'
import { ActionButton } from '@/components/admin/ActionButton'
import { EmailDraftButton } from '@/components/admin/EmailDraftButton'
import {
  Avatar,
  buttonClass,
  Card,
  Empty,
  Icon,
  muted,
  Pill,
  Stat,
  Title,
  type Tone,
} from '@/components/admin/ui'
import {
  dailyBriefingAction,
  pushInvoiceToBillitAction,
  setInvoiceStatusAction,
  shootBriefAction,
} from '../actions'
import { cn } from '@/utilities/ui'
import { claudePrompts } from '@/lib/admin/claude-prompts'

export const metadata = { title: 'Vandaag' }

const TAG: Record<TodoTag, { label: string; tone: Tone }> = {
  factuur: { label: 'Factuur', tone: 'orange' },
  ideeen: { label: 'Ideeën', tone: 'teal' },
  draaidag: { label: 'Draaidag', tone: 'purple' },
  contract: { label: 'Contract', tone: 'yellow' },
  lead: { label: 'Lead', tone: 'green' },
}

const EVENT_BAR: Record<EventKind, string> = {
  shoot: 'border-ikr-cyan',
  sales_call: 'border-ikr-navy',
  meeting: 'border-[#8C82A8]',
  deadline: 'border-[#E8955C]',
  other: 'border-[#B9B2C9]',
}

export default async function TodayPage() {
  const session = await requireAdmin()
  const { repo, user } = session
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const [todos, clients, contracts, invoices, events, videos, briefing] = await Promise.all([
    computeTodos(session),
    repo.listClients(),
    repo.listContracts(),
    repo.listInvoices({ statuses: ['to_send', 'draft', 'overdue'] }),
    repo.listEvents(now.toISOString(), addDays(now, 8).toISOString()),
    repo.listVideosWithStats({ sinceIso: addDays(now, -15).toISOString() }),
    repo.latestAiRun('daily_briefing', { sinceIso: startOfToday.toISOString() }),
  ])

  const activeStages = new Set(['signed', 'shoot_planned', 'editing', 'live'])
  const activeClients = clients.filter((c) => activeStages.has(c.stage))
  const mrr = contracts
    .filter((c) => c.status === 'active')
    .reduce((s, c) => s + c.monthly_amount_cents, 0)
  const results7 = summarizeResults(videos, 7, now)
  const toSend = invoices.filter((i) => i.status === 'to_send' || i.status === 'overdue')
  const nextInvoice = [...toSend].sort((a, b) => a.send_date.localeCompare(b.send_date))[0]
  const briefingText = (briefing?.output as { briefing?: string } | null)?.briefing
  const billit = isBillitConfigured()

  return (
    <>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[280px] flex-1">
          <CommandBar placeholder="Vraag IKR AI iets of zoek een klant…  bv. “wat staat er open bij Wasbar?”" />
        </div>
        <Link href="/admin/klanten?nieuw=1" className={buttonClass('navy')}>
          <Icon.plus size={16} /> Nieuwe klant
        </Link>
      </div>

      <div>
        <p className={cn('m-0 text-[15px] first-letter:uppercase', muted)}>{fmtLongDate(now)}</p>
        <Title as="h1" className="mt-1.5 text-5xl leading-[0.9] md:text-[72px] md:leading-[0.88]">
          {greeting(now)}, <span className="text-[#0B7F93]">{user.name}</span>
        </Title>
      </div>

      <section
        aria-label="AI-briefing"
        className="flex flex-wrap items-center gap-6 rounded-3xl bg-ikr-navy p-7 text-ikr-cream-light"
      >
        <div className="flex min-w-[280px] flex-[999_1_420px] flex-col gap-2.5">
          <Pill tone="cyan" className="self-start">
            <Icon.sparkle size={14} /> IKR AI · briefing
          </Pill>
          <p className="m-0 max-w-3xl text-lg leading-relaxed md:text-xl">
            {briefingText ??
              (todos.length
                ? `Er staan ${todos.length} actiepunten open. Laat IKR AI zeggen waar je best begint.`
                : 'Niets dringends vandaag. Tijd voor nieuwe ideeën?')}
          </p>
        </div>
        <div className="flex flex-[1_1_220px] flex-wrap justify-end gap-2.5">
          <ActionButton
            action={dailyBriefingAction}
            claudePrompt={claudePrompts.briefing()}
            variant="cyan"
            small={false}
            ai
            pendingText="Briefing maken…"
          >
            {briefingText ? 'Vernieuw briefing' : 'Maak briefing'}
          </ActionButton>
        </div>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <Stat
          label="Actieve klanten"
          value={activeClients.length}
          note={`${clients.filter((c) => c.stage === 'lead' || c.stage === 'sales_call').length} leads in de pijplijn`}
        />
        <Stat
          label="Maandelijkse omzet"
          value={euro(mrr)}
          note={`MRR uit ${contracts.filter((c) => c.status === 'active').length} contracten`}
        />
        <Stat
          label="Views · 7 dagen"
          value={videos.length ? compactNumber(results7.viewsPeriod) : '—'}
          note={
            videos.length
              ? results7.viewsChange != null
                ? `${results7.viewsChange >= 0 ? '+' : ''}${Math.round(results7.viewsChange * 100)}% t.o.v. vorige week`
                : 'over alle klanten'
              : 'TikTok nog niet gekoppeld'
          }
          noteTone={
            results7.viewsChange != null ? (results7.viewsChange >= 0 ? 'up' : 'down') : 'muted'
          }
        />
        <Stat
          label="Facturen te versturen"
          value={toSend.length}
          note={
            nextInvoice
              ? `${euro(toSend.reduce((s, i) => s + i.amount_cents, 0))} · eerste ${fmtDate(nextInvoice.send_date, { weekday: 'short', day: 'numeric', month: 'short' })}`
              : 'alles verstuurd'
          }
          noteTone={toSend.length ? 'down' : 'muted'}
        />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <Card className="flex min-w-0 flex-[3_1_440px] flex-col gap-1.5">
          <div className="mb-2 flex items-center justify-between">
            <Title className="m-0 text-[28px]">Te doen</Title>
            <span className={cn('text-[13px]', muted)}>{todos.length} open</span>
          </div>
          {!todos.length && <Empty>Alles is bij. Mooi zo.</Empty>}
          {todos.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-3.5 border-t border-[#E6DFD2] py-3.5"
            >
              <Link
                href={t.href}
                className="flex min-w-[220px] flex-[1_1_260px] flex-col gap-0.5 text-ikr-navy no-underline hover:text-[#0B7F93]"
              >
                <span className="text-[15px] font-semibold">{t.title}</span>
                <span className={cn('text-[13px]', muted)}>{t.detail}</span>
              </Link>
              <Pill tone={TAG[t.tag].tone}>{TAG[t.tag].label}</Pill>
              {t.owner && <Avatar text={t.owner.slice(0, 2).toUpperCase()} />}
              {t.action?.kind === 'invoice' &&
                (billit ? (
                  <ActionButton
                    action={pushInvoiceToBillitAction.bind(null, t.action.invoiceId)}
                    pendingText="Naar Billit…"
                  >
                    Concept in Billit
                  </ActionButton>
                ) : (
                  <ActionButton
                    action={setInvoiceStatusAction.bind(null, t.action.invoiceId, 'sent')}
                  >
                    Markeer verstuurd
                  </ActionButton>
                ))}
              {t.action?.kind === 'email' && (
                <EmailDraftButton
                  clientId={t.action.clientId}
                  clientName={t.action.clientName}
                  purpose={t.action.purpose}
                  label={t.action.purpose === 'renewal' ? 'Verlengingsvoorstel' : 'Mail opstellen'}
                />
              )}
              {t.action?.kind === 'brief' && (
                <ActionButton
                  action={shootBriefAction.bind(null, t.action.eventId)}
                  claudePrompt={claudePrompts.shootBrief(t.action.label)}
                  ai
                  pendingText="Draaiboek maken…"
                >
                  Genereer
                </ActionButton>
              )}
            </div>
          ))}
        </Card>

        <Card className="flex min-w-0 flex-[2_1_320px] flex-col gap-3">
          <div className="mb-1 flex items-center justify-between">
            <Title className="m-0 text-[28px]">Komende 7 dagen</Title>
            <Link href="/admin/kalender" className="text-sm font-semibold text-ikr-navy">
              Kalender →
            </Link>
          </div>
          {!events.length && <Empty>Niets gepland.</Empty>}
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/admin/kalender?event=${e.id}`}
              className="flex items-stretch gap-3.5 text-ikr-navy no-underline"
            >
              <div
                className={cn(
                  'flex w-[52px] shrink-0 flex-col justify-center rounded-[14px] py-2 text-center',
                  e.kind === 'shoot' ? 'bg-ikr-cyan' : 'bg-ikr-cream',
                )}
              >
                <span className="text-[11px] font-semibold uppercase">
                  {fmtDate(e.starts_at, { weekday: 'short' }).replace('.', '')}
                </span>
                <span className="font-display text-2xl leading-none font-black">
                  {fmtDate(e.starts_at, { day: 'numeric' })}
                </span>
              </div>
              <div
                className={cn(
                  'flex flex-1 flex-col gap-0.5 border-l-4 px-3 py-1.5',
                  EVENT_BAR[e.kind],
                )}
              >
                <span className="text-[15px] font-semibold">{e.title}</span>
                <span className={cn('text-[13px]', muted)}>
                  {fmtTime(e.starts_at)}
                  {e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ''}
                  {e.location ? ` · ${e.location}` : ''}
                  {e.kind === 'shoot' && !e.brief ? ' · geen draaiboek' : ''}
                </span>
              </div>
            </Link>
          ))}
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Title className="m-0 text-[28px]">Pipeline</Title>
          <Link href="/admin/pipeline" className="text-sm font-semibold text-ikr-navy">
            Open pipeline →
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
          {BOARD_STAGES.map((s) => {
            const n = clients.filter((c) => c.stage === s).length
            const live = s === 'live'
            return (
              <Link
                key={s}
                href="/admin/pipeline"
                className={cn(
                  'flex flex-col gap-1 rounded-[14px] p-3.5 no-underline',
                  live ? 'bg-ikr-navy text-ikr-cream-light' : 'bg-ikr-cream text-ikr-navy',
                )}
              >
                <span className={cn('text-xs font-semibold', live ? 'text-[#B9B2C9]' : muted)}>
                  {STAGE_LABELS[s]}
                </span>
                <span className="font-display text-3xl font-black">{n}</span>
              </Link>
            )
          })}
        </div>
      </Card>
    </>
  )
}

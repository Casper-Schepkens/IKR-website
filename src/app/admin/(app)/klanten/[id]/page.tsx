import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/session'
import { BOARD_STAGES, STAGE_LABELS, type InvoiceStatus } from '@/lib/admin/types'
import { euro, fmtDate, initials, isoDay } from '@/lib/admin/format'
import { contractProgress, nextSendDate } from '@/lib/admin/billing'
import { isBillitConfigured } from '@/lib/admin/integrations/billit'
import { CommandBar } from '@/components/admin/CommandBar'
import { IdeasPanel } from '@/components/admin/IdeasPanel'
import { StageSelect } from '@/components/admin/StageSelect'
import { ActionButton } from '@/components/admin/ActionButton'
import { FormAction } from '@/components/admin/FormAction'
import { EmailDraftButton } from '@/components/admin/EmailDraftButton'
import { AutoRefresh } from '@/components/admin/AutoRefresh'
import { STAGE_TONE } from '@/components/admin/stage'
import {
  buttonClass,
  Card,
  Empty,
  Icon,
  input,
  label,
  muted,
  Pill,
  Title,
  type Tone,
} from '@/components/admin/ui'
import {
  addContactAction,
  addNoteAction,
  pushInvoiceToBillitAction,
  saveContractAction,
  saveProfileAction,
  setInvoiceStatusAction,
  summarizeClientAction,
  updateClientAction,
} from '../../../actions'
import { cn } from '@/utilities/ui'
import { claudePrompts } from '@/lib/admin/claude-prompts'

const TABS = [
  { key: 'overzicht', label: 'Overzicht' },
  { key: 'ideeen', label: 'Ideeën' },
  { key: 'decks', label: 'Decks' },
  { key: 'contract', label: 'Contract & facturen' },
  { key: 'notities', label: 'Notities' },
  { key: 'gegevens', label: 'Gegevens & AI-profiel' },
] as const
type TabKey = (typeof TABS)[number]['key']

const INVOICE: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  to_send: { label: 'Te versturen', tone: 'orange' },
  draft: { label: 'Concept in Billit', tone: 'yellow' },
  sent: { label: 'Verstuurd', tone: 'teal' },
  paid: { label: 'Betaald', tone: 'green' },
  overdue: { label: 'Te laat', tone: 'orange' },
  cancelled: { label: 'Geannuleerd', tone: 'neutral' },
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { repo } = await requireAdmin()
  const c = await repo.getClient(id)
  return { title: c?.name ?? 'Klant' }
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; tiktok?: string }>
}) {
  const { id } = await params
  const { tab: rawTab, tiktok } = await searchParams
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : 'overzicht'
  const { repo } = await requireAdmin()
  const client = await repo.getClient(id)
  if (!client) notFound()

  const [contacts, activities, profile, contracts, invoices, ideas, templates, decks] =
    await Promise.all([
      repo.listContacts(id),
      repo.listActivities({ clientId: id, limit: 60 }),
      repo.getProfile(id),
      repo.listContracts(id),
      repo.listInvoices({ clientId: id }),
      repo.listIdeas(id),
      repo.listTemplates(),
      repo.listDecks(id),
    ])
  const today = isoDay(new Date())
  const contract = contracts.find((c) => c.status === 'active') ?? contracts[0] ?? null
  const progress = contract ? contractProgress(contract, today) : null
  const nextInvoice = contract ? nextSendDate(contract, today) : null
  const primary = contacts.find((c) => c.is_primary) ?? contacts[0]
  const stageIndex = BOARD_STAGES.indexOf(client.stage)
  const billit = isBillitConfigured()
  const generating = decks.some((d) => d.status === 'queued' || d.status === 'generating')
  const tabCount: Partial<Record<TabKey, number>> = {
    ideeen: ideas.filter((i) => i.status !== 'rejected').length,
    decks: decks.length,
  }

  const contractCard = (
    <Card className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <Title className="m-0 text-2xl">Contract</Title>
        {contract && (
          <Pill tone={contract.status === 'active' ? 'green' : 'neutral'}>
            {contract.status === 'active' ? 'Actief' : contract.status}
          </Pill>
        )}
      </div>
      {!contract ? (
        <Empty>
          Nog geen contract.{' '}
          <Link href={`?tab=contract`} className="font-semibold text-ikr-navy">
            Toevoegen →
          </Link>
        </Empty>
      ) : (
        <>
          <div className="flex justify-between text-sm">
            <span className={muted}>Pakket</span>
            <span className="font-semibold">{contract.package_name ?? '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className={muted}>Bedrag</span>
            <span className="font-semibold">{euro(contract.monthly_amount_cents)} / maand</span>
          </div>
          {progress && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className={muted}>Looptijd</span>
                <span className="font-semibold">
                  {progress.elapsed} van {progress.total} maanden
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Looptijd contract"
                aria-valuenow={Math.round((progress.elapsed / progress.total) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2.5 overflow-hidden rounded-full bg-ikr-cream"
              >
                <div
                  className="h-full bg-ikr-cyan"
                  style={{ width: `${(progress.elapsed / progress.total) * 100}%` }}
                />
              </div>
              <span className={cn('text-xs', muted)}>
                Loopt tot{' '}
                {fmtDate(contract.end_date!, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-2 rounded-[14px] bg-ikr-cream p-3.5">
            <div className="flex justify-between text-sm">
              <span className={muted}>Volgende factuur</span>
              <span className="font-bold">
                {nextInvoice
                  ? fmtDate(nextInvoice, { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </span>
            </div>
            {invoices.slice(0, 3).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <span className={muted}>{inv.label ?? fmtDate(inv.send_date)}</span>
                <Pill tone={INVOICE[inv.status].tone}>{INVOICE[inv.status].label}</Pill>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )

  return (
    <>
      <AutoRefresh active={generating} />
      <CommandBar placeholder={`Vraag iets over ${client.name}…`} />

      <nav aria-label="Kruimelpad" className={cn('text-sm', muted)}>
        <Link href="/admin/klanten" className={cn(muted, 'no-underline hover:underline')}>
          Klanten
        </Link>{' '}
        / <span className="font-semibold text-ikr-navy">{client.name}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-5">
        <span
          aria-hidden="true"
          className="flex size-[88px] shrink-0 items-center justify-center rounded-full bg-ikr-navy font-display text-4xl font-black text-ikr-cyan"
        >
          {initials(client.name)}
        </span>
        <div className="flex min-w-[280px] flex-1 flex-col gap-2">
          <Title as="h1" className="m-0 text-5xl leading-[0.9] md:text-[72px] md:leading-[0.88]">
            {client.name}
          </Title>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={STAGE_TONE[client.stage]}>{STAGE_LABELS[client.stage]}</Pill>
            {client.owner && <Pill tone="light" className="capitalize">Eigenaar: {client.owner}</Pill>}
            <Pill tone="light">
              Klant sinds {fmtDate(client.created_at, { month: 'short', year: 'numeric' })}
            </Pill>
            {client.tiktok_handle && <Pill tone="light">{client.tiktok_handle}</Pill>}
            {client.drive_folder_url && (
              <a
                href={client.drive_folder_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-ikr-navy"
              >
                Drive-map ↗
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <StageSelect clientId={client.id} stage={client.stage} />
          <Link href={`?tab=ideeen`} className={buttonClass('cyan')}>
            <Icon.sparkle size={16} /> Ideeën
          </Link>
          <Link
            href={`/admin/kalender?nieuw=1&client=${client.id}`}
            className={buttonClass('navy')}
          >
            Plan draaidag
          </Link>
        </div>
      </div>

      {client.stage !== 'churned' && (
        <div
          role="list"
          aria-label="Fase in het proces"
          className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-1.5"
        >
          {BOARD_STAGES.map((s, i) => (
            <div role="listitem" key={s} className="flex flex-col gap-1.5">
              <span
                className={cn(
                  'h-1.5 rounded-full',
                  i < stageIndex
                    ? 'bg-ikr-navy'
                    : i === stageIndex
                      ? 'bg-ikr-cyan'
                      : 'bg-[#D9D1C2]',
                )}
              />
              <span className={cn('text-xs', i === stageIndex ? 'font-bold text-ikr-navy' : muted)}>
                {STAGE_LABELS[s]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 border-b border-[#D9D1C2]">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'overzicht' ? `/admin/klanten/${id}` : `?tab=${t.key}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center border-b-[3px] px-1 text-[15px] no-underline',
              tab === t.key
                ? 'border-ikr-cyan font-bold text-ikr-navy'
                : 'border-transparent font-medium text-[#5E5670] hover:text-ikr-navy',
            )}
          >
            {t.label}
            {tabCount[t.key] ? ` (${tabCount[t.key]})` : ''}
          </Link>
        ))}
      </div>

      {tab === 'overzicht' && (
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex min-w-0 flex-[3_1_480px] flex-col gap-4">
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Title className="m-0 text-2xl">Waar staan we?</Title>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    action={summarizeClientAction.bind(null, id)}
                    claudePrompt={claudePrompts.summarize(client.name)}
                    ai
                    pendingText="Samenvatten…"
                  >
                    Vat samen
                  </ActionButton>
                  <EmailDraftButton clientId={id} clientName={client.name} purpose="follow_up" label="Opvolgmail" />
                </div>
              </div>
              {client.summary && (
                <p className="m-0 text-[15px] leading-relaxed">{client.summary}</p>
              )}
              {(() => {
                const ai = activities.find((a) => a.kind === 'ai' && a.body)
                return ai ? (
                  <div className="rounded-2xl bg-ikr-cream p-4 text-sm leading-relaxed whitespace-pre-line">
                    <span className={cn('mb-1 block text-xs font-semibold', muted)}>
                      IKR AI · {fmtDate(ai.created_at)}
                    </span>
                    {ai.body}
                  </div>
                ) : (
                  !client.summary && (
                    <Empty>
                      Nog geen samenvatting. Voeg notities toe of laat IKR AI samenvatten.
                    </Empty>
                  )
                )
              })()}
            </Card>
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Title className="m-0 text-2xl">Ideeën</Title>
                <Link href="?tab=ideeen" className="text-sm font-semibold text-ikr-navy">
                  Alle ideeën →
                </Link>
              </div>
              {!ideas.length && <Empty>Nog geen ideeën.</Empty>}
              {ideas
                .filter((i) => i.status !== 'rejected')
                .slice(0, 5)
                .map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-3 border-t border-[#E6DFD2] pt-3 text-sm"
                  >
                    <span className="font-semibold">{i.title}</span>
                    <Pill
                      tone={
                        i.status === 'approved'
                          ? 'green'
                          : i.status === 'developed'
                            ? 'teal'
                            : 'neutral'
                      }
                    >
                      {i.status === 'approved'
                        ? 'Goedgekeurd'
                        : i.status === 'developed'
                          ? 'Uitgewerkt'
                          : i.status === 'produced'
                            ? 'Gemaakt'
                            : 'Voorstel'}
                    </Pill>
                  </div>
                ))}
            </Card>
          </div>
          <aside className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
            {contractCard}
            <Card dark className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Icon.sparkle className="text-ikr-cyan" />
                <Title className="m-0 text-[22px]">Wat IKR AI weet</Title>
              </div>
              {profile &&
              (profile.tone_of_voice ||
                profile.what_works ||
                profile.avoid ||
                profile.learnings) ? (
                <ul className="m-0 pl-[18px] text-sm leading-relaxed text-[#E7E2F0]">
                  {profile.brand_summary && (
                    <li>
                      <strong className="text-ikr-cream-light">Merk:</strong>{' '}
                      {profile.brand_summary}
                    </li>
                  )}
                  {profile.tone_of_voice && (
                    <li>
                      <strong className="text-ikr-cream-light">Toon:</strong>{' '}
                      {profile.tone_of_voice}
                    </li>
                  )}
                  {profile.what_works && (
                    <li>
                      <strong className="text-ikr-cream-light">Werkt:</strong> {profile.what_works}
                    </li>
                  )}
                  {profile.avoid && (
                    <li>
                      <strong className="text-ikr-cream-light">Liever niet:</strong> {profile.avoid}
                    </li>
                  )}
                  {profile.learnings && (
                    <li className="whitespace-pre-line">
                      <strong className="text-ikr-cream-light">Geleerd:</strong> {profile.learnings}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="m-0 text-sm text-[#E7E2F0]">
                  Nog leeg. Hoe meer hier staat, hoe beter de ideeën.
                </p>
              )}
              <Link href="?tab=gegevens" className={buttonClass('ghostDark', true, 'self-start')}>
                Klantprofiel bewerken
              </Link>
            </Card>
            <Card className="flex flex-col gap-3">
              <Title className="m-0 text-2xl">Contact</Title>
              {primary ? (
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-ikr-cream text-sm font-bold">
                    {initials(primary.name)}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[15px] font-semibold">
                      {primary.name}
                      {primary.role ? ` · ${primary.role}` : ''}
                    </span>
                    <span className={cn('text-[13px]', muted)}>
                      {primary.email ? (
                        <a href={`mailto:${primary.email}`} className="text-inherit">
                          {primary.email}
                        </a>
                      ) : (
                        '[e-mail]'
                      )}{' '}
                      · {primary.phone ?? '[telefoon]'}
                    </span>
                  </div>
                </div>
              ) : (
                <Empty>Nog geen contactpersoon.</Empty>
              )}
            </Card>
            <Card className="flex flex-col gap-3">
              <Title className="m-0 text-2xl">Activiteit</Title>
              {activities.slice(0, 6).map((a) => (
                <div key={a.id} className="flex gap-3 text-sm">
                  <span className={cn('w-14 shrink-0', muted)}>{fmtDate(a.created_at)}</span>
                  <span>{a.title ?? a.kind}</span>
                </div>
              ))}
              {!activities.length && <Empty>Nog niets gebeurd.</Empty>}
            </Card>
          </aside>
        </div>
      )}

      {tab === 'ideeen' && <IdeasPanel clientId={id} clientName={client.name} ideas={ideas} templates={templates} />}

      {tab === 'decks' && (
        <Card className="flex flex-col gap-3">
          <Title className="m-0 text-2xl">Presentaties</Title>
          {!decks.length && (
            <Empty>
              Nog geen presentaties. Selecteer ideeën in het tabblad Ideeën en klik op “Maak
              presentatie”.
            </Empty>
          )}
          {decks.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center gap-3 border-t border-[#E6DFD2] py-3"
            >
              <div className="flex flex-[1_1_260px] flex-col">
                <span className="font-semibold">{d.title}</span>
                <span className={cn('text-[13px]', muted)}>
                  {fmtDate(d.created_at, {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {d.idea_ids.length} ideeën
                </span>
                {d.error && <span className="text-[13px] text-[#A3470F]">{d.error}</span>}
              </div>
              <Pill
                tone={d.status === 'ready' ? 'green' : d.status === 'failed' ? 'orange' : 'yellow'}
              >
                {d.status === 'ready'
                  ? 'Klaar'
                  : d.status === 'failed'
                    ? 'Mislukt'
                    : 'Wordt gemaakt…'}
              </Pill>
              {d.status === 'ready' && (
                <a
                  href={`/admin/klanten/${id}/decks/${d.id}`}
                  className={buttonClass('navy', true)}
                >
                  <Icon.download size={16} /> Download .pptx
                </a>
              )}
            </div>
          ))}
        </Card>
      )}

      {tab === 'contract' && (
        <div className="flex flex-wrap items-start gap-5">
          <Card className="flex min-w-0 flex-[3_1_480px] flex-col gap-4">
            <Title className="m-0 text-2xl">
              {contract ? 'Contract bewerken' : 'Nieuw contract'}
            </Title>
            <FormAction action={saveContractAction.bind(null, id)}>
              {contract && <input type="hidden" name="id" value={contract.id} />}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                <label className={label}>
                  Pakket
                  <input
                    name="package_name"
                    defaultValue={contract?.package_name ?? ''}
                    placeholder="bv. 8 video's / maand"
                    className={input}
                  />
                </label>
                <label className={label}>
                  Video's per maand
                  <input
                    name="videos_per_month"
                    type="number"
                    min={0}
                    defaultValue={contract?.videos_per_month ?? ''}
                    className={input}
                  />
                </label>
                <label className={label}>
                  Bedrag per maand (€, excl. btw)
                  <input
                    name="monthly_amount"
                    inputMode="decimal"
                    defaultValue={contract ? String(contract.monthly_amount_cents / 100) : ''}
                    className={input}
                    required
                  />
                </label>
                <label className={label}>
                  Facturatie
                  <select
                    name="billing_cycle"
                    defaultValue={contract?.billing_cycle ?? 'monthly'}
                    className={input}
                  >
                    <option value="monthly">Maandelijks</option>
                    <option value="quarterly">Per kwartaal</option>
                    <option value="one_off">Eenmalig</option>
                  </select>
                </label>
                <label className={label}>
                  Factuurdag (1–28)
                  <input
                    name="billing_day"
                    type="number"
                    min={1}
                    max={28}
                    defaultValue={contract?.billing_day ?? 1}
                    className={input}
                  />
                </label>
                <label className={label}>
                  Start
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={contract?.start_date ?? today}
                    className={input}
                    required
                  />
                </label>
                <label className={label}>
                  Einde
                  <input
                    name="end_date"
                    type="date"
                    defaultValue={contract?.end_date ?? ''}
                    className={input}
                  />
                </label>
                <label className={label}>
                  Seintje verlenging (dagen vooraf)
                  <input
                    name="renewal_notice_days"
                    type="number"
                    min={0}
                    defaultValue={contract?.renewal_notice_days ?? 30}
                    className={input}
                  />
                </label>
                <label className={label}>
                  Status
                  <select
                    name="status"
                    defaultValue={contract?.status ?? 'active'}
                    className={input}
                  >
                    <option value="active">Actief</option>
                    <option value="draft">Concept</option>
                    <option value="ended">Beëindigd</option>
                  </select>
                </label>
              </div>
              <label className={label}>
                Notities
                <textarea
                  name="notes"
                  defaultValue={contract?.notes ?? ''}
                  className={cn(input, 'min-h-20')}
                />
              </label>
            </FormAction>
          </Card>
          <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
            {contractCard}
            <Card className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Title className="m-0 text-2xl">Facturen</Title>
                {contract?.end_date && (
                  <EmailDraftButton
                    clientId={id}
                    clientName={client.name}
                    purpose="renewal"
                    label="Verlengingsvoorstel"
                  />
                )}
              </div>
              {!billit && (
                <p className={cn('m-0 text-xs', muted)}>
                  Billit is nog niet gekoppeld: facturen worden hier opgevolgd, maar niet
                  automatisch klaargezet.
                </p>
              )}
              {!invoices.length && (
                <Empty>
                  Nog geen facturen. Die worden automatisch klaargezet 14 dagen voor de
                  factuurdatum.
                </Empty>
              )}
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center gap-2 border-t border-[#E6DFD2] py-3 text-sm"
                >
                  <div className="flex flex-[1_1_160px] flex-col">
                    <span className="font-semibold">{inv.label ?? fmtDate(inv.send_date)}</span>
                    <span className={cn('text-xs', muted)}>
                      {euro(inv.amount_cents)} ·{' '}
                      {fmtDate(inv.send_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <Pill tone={INVOICE[inv.status].tone}>{INVOICE[inv.status].label}</Pill>
                  {inv.status === 'to_send' && billit && (
                    <ActionButton
                      action={pushInvoiceToBillitAction.bind(null, inv.id)}
                      pendingText="Naar Billit…"
                    >
                      Concept in Billit
                    </ActionButton>
                  )}
                  {(inv.status === 'to_send' || inv.status === 'draft') && (
                    <ActionButton action={setInvoiceStatusAction.bind(null, inv.id, 'sent')}>
                      Verstuurd
                    </ActionButton>
                  )}
                  {(inv.status === 'sent' || inv.status === 'overdue') && (
                    <ActionButton action={setInvoiceStatusAction.bind(null, inv.id, 'paid')}>
                      Betaald
                    </ActionButton>
                  )}
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {tab === 'notities' && (
        <div className="flex flex-wrap items-start gap-5">
          <Card className="flex min-w-0 flex-[2_1_360px] flex-col gap-3">
            <Title className="m-0 text-2xl">Nieuwe notitie</Title>
            <FormAction
              action={addNoteAction.bind(null, id)}
              resetOnSuccess
              submitLabel="Toevoegen"
              pendingText="Toevoegen…"
            >
              <div className="flex gap-3">
                <label className={cn(label, 'flex-1')}>
                  Titel
                  <input name="title" placeholder="bv. Call met Charlotte" className={input} />
                </label>
                <label className={label}>
                  Soort
                  <select name="kind" className={input} defaultValue="note">
                    <option value="note">Notitie</option>
                    <option value="call">Call</option>
                  </select>
                </label>
              </div>
              <label className={label}>
                Notitie
                <textarea
                  name="body"
                  required
                  className={cn(input, 'min-h-36')}
                  placeholder="Wat werd er gezegd? Wat zijn de afspraken?"
                />
              </label>
            </FormAction>
            <ActionButton
              action={summarizeClientAction.bind(null, id)}
              claudePrompt={claudePrompts.summarize(client.name)}
              ai
              pendingText="Samenvatten…"
            >
              Vat alles samen + volgende stappen
            </ActionButton>
          </Card>
          <Card className="flex min-w-0 flex-[3_1_440px] flex-col gap-1">
            <Title className="m-0 mb-2 text-2xl">Tijdlijn</Title>
            {!activities.length && <Empty>Nog niets.</Empty>}
            {activities.map((a) => (
              <div key={a.id} className="flex flex-col gap-1 border-t border-[#E6DFD2] py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={muted}>
                    {fmtDate(a.created_at, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <Pill
                    tone={
                      a.kind === 'ai'
                        ? 'cyan'
                        : a.kind === 'call'
                          ? 'purple'
                          : a.kind === 'system'
                            ? 'neutral'
                            : 'light'
                    }
                  >
                    {a.kind === 'ai'
                      ? 'IKR AI'
                      : a.kind === 'call'
                        ? 'Call'
                        : a.kind === 'system'
                          ? 'Systeem'
                          : 'Notitie'}
                  </Pill>
                  <span className="font-semibold">{a.title}</span>
                  {a.created_by && <span className={cn('text-xs', muted)}>· {a.created_by}</span>}
                </div>
                {a.body && (
                  <p className="m-0 text-sm leading-relaxed whitespace-pre-line">{a.body}</p>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === 'gegevens' && (
        <div className="flex flex-wrap items-start gap-5">
          <Card className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
            <Title className="m-0 text-2xl">Gegevens</Title>
            <FormAction action={updateClientAction.bind(null, id)}>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                <label className={label}>
                  Naam
                  <input name="name" defaultValue={client.name} className={input} required />
                </label>
                <label className={label}>
                  Eigenaar
                  <select name="owner" defaultValue={client.owner ?? ''} className={input}>
                    <option value="">—</option>
                    <option value="casper">Casper</option>
                    <option value="cedric">Cedric</option>
                  </select>
                </label>
                <label className={label}>
                  Sector
                  <input name="sector" defaultValue={client.sector ?? ''} className={input} />
                </label>
                <label className={label}>
                  Bron
                  <input name="source" defaultValue={client.source ?? ''} className={input} />
                </label>
                <label className={label}>
                  Website
                  <input name="website" defaultValue={client.website ?? ''} className={input} />
                </label>
                <label className={label}>
                  TikTok-handle
                  <input
                    name="tiktok_handle"
                    defaultValue={client.tiktok_handle ?? ''}
                    placeholder="@"
                    className={input}
                  />
                </label>
                <label className={label}>
                  Btw-nummer (Billit)
                  <input
                    name="vat_number"
                    defaultValue={client.vat_number ?? ''}
                    placeholder="BE0123456789"
                    className={input}
                  />
                </label>
                <label className={label}>
                  Facturatie-e-mail
                  <input
                    name="billing_email"
                    type="email"
                    defaultValue={client.billing_email ?? ''}
                    className={input}
                  />
                </label>
                <label className={label}>
                  Google Drive-map
                  <input
                    name="drive_folder_url"
                    defaultValue={client.drive_folder_url ?? ''}
                    placeholder="https://drive.google.com/…"
                    className={input}
                  />
                </label>
              </div>
              <label className={label}>
                Korte omschrijving
                <textarea
                  name="summary"
                  defaultValue={client.summary ?? ''}
                  className={cn(input, 'min-h-20')}
                />
              </label>
            </FormAction>
            <div className="flex flex-col gap-3 border-t border-[#E6DFD2] pt-4">
              <Title as="h3" className="m-0 text-xl">
                TikTok
              </Title>
              {tiktok && (
                <p role="status" className="m-0 rounded-xl bg-ikr-cream p-3 text-sm">
                  {tiktok === 'gekoppeld'
                    ? 'TikTok-account gekoppeld. De statistieken komen binnen bij de volgende dagelijkse sync.'
                    : tiktok === 'niet-ingesteld'
                      ? 'De TikTok-app is nog niet ingesteld (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET).'
                      : 'Koppelen is niet gelukt. Probeer opnieuw.'}
                </p>
              )}
              <p className={cn('m-0 text-sm', muted)}>
                Log in met het TikTok-account van {client.name}. Daarna haalt het dashboard elke dag
                de cijfers van alle video’s op.
              </p>
              <a
                href={`/admin/auth/tiktok/start?client=${id}`}
                className={buttonClass('navy', true, 'self-start')}
              >
                {client.tiktok_handle
                  ? `Opnieuw koppelen (${client.tiktok_handle})`
                  : 'Koppel TikTok-account'}
              </a>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#E6DFD2] pt-4">
              <Title as="h3" className="m-0 text-xl">
                Contactpersonen
              </Title>
              {contacts.map((c) => (
                <div key={c.id} className="text-sm">
                  <strong>{c.name}</strong>
                  {c.role ? ` · ${c.role}` : ''} · {c.email ?? '—'} · {c.phone ?? '—'}
                  {c.is_primary && (
                    <Pill tone="teal" className="ml-2">
                      Hoofdcontact
                    </Pill>
                  )}
                </div>
              ))}
              <FormAction
                action={addContactAction.bind(null, id)}
                resetOnSuccess
                submitLabel="Contact toevoegen"
                submitVariant="soft"
              >
                <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
                  <input
                    name="name"
                    placeholder="Naam"
                    aria-label="Naam"
                    required
                    className={input}
                  />
                  <input name="role" placeholder="Rol" aria-label="Rol" className={input} />
                  <input
                    name="email"
                    type="email"
                    placeholder="E-mail"
                    aria-label="E-mail"
                    className={input}
                  />
                  <input
                    name="phone"
                    placeholder="Telefoon"
                    aria-label="Telefoon"
                    className={input}
                  />
                </div>
              </FormAction>
            </div>
          </Card>
          <Card dark className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
            <div className="flex items-center gap-2">
              <Icon.sparkle className="text-ikr-cyan" />
              <Title className="m-0 text-2xl">AI-klantprofiel</Title>
            </div>
            <p className="m-0 text-sm text-[#E7E2F0]">
              Dit krijgt IKR AI mee bij elke taak voor {client.name}. Afgekeurde ideeën met een
              reden komen automatisch onder “Geleerd”.
            </p>
            <FormAction action={saveProfileAction.bind(null, id)} submitVariant="cyan">
              {(
                [
                  ['brand_summary', 'Merk in één zin'],
                  ['tone_of_voice', 'Tone of voice'],
                  ['target_audience', 'Doelgroep'],
                  ['what_works', 'Wat werkt'],
                  ['avoid', 'Liever niet'],
                  ['learnings', 'Geleerd'],
                ] as const
              ).map(([key, l]) => (
                <label
                  key={key}
                  className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#B9B2C9]"
                >
                  {l}
                  <textarea
                    name={key}
                    defaultValue={profile?.[key] ?? ''}
                    className={cn(input, 'min-h-16 bg-ikr-cream-light')}
                  />
                </label>
              ))}
            </FormAction>
          </Card>
        </div>
      )}
    </>
  )
}

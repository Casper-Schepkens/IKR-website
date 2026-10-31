import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { EVENT_KIND_LABELS, type EventKind } from '@/lib/admin/types'
import { addDays, fmtDate, fmtTime, isoDay, isoWeekNumber, startOfWeek } from '@/lib/admin/format'
import { ActionButton } from '@/components/admin/ActionButton'
import { FormAction } from '@/components/admin/FormAction'
import {
  buttonClass,
  Card,
  Empty,
  Icon,
  input,
  label,
  muted,
  PageHeader,
  Pill,
  Title,
} from '@/components/admin/ui'
import { createEventAction, deleteEventAction, shootBriefAction } from '../../actions'
import { integrationStatus } from '@/lib/admin/env'
import { cn } from '@/utilities/ui'
import { claudePrompts } from '@/lib/admin/claude-prompts'

export const metadata = { title: 'Kalender' }

const EVENT_STYLE: Record<EventKind, string> = {
  shoot: 'bg-ikr-cyan text-ikr-navy',
  sales_call: 'bg-ikr-navy text-ikr-cream-light',
  meeting: 'bg-[#E4E0F0] text-[#2B2050] shadow-[inset_0_0_0_1px_#8C82A8]',
  deadline: 'bg-[#FCE3D2] text-[#6E2E09]',
  other: 'bg-ikr-cream text-ikr-navy',
}

function parseWeek(param?: string) {
  const d = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? new Date(`${param}T12:00:00`) : new Date()
  return startOfWeek(d)
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; event?: string; nieuw?: string; client?: string }>
}) {
  const sp = await searchParams
  const { repo } = await requireAdmin()
  const monday = parseWeek(sp.week)
  const [events, clients, invoices] = await Promise.all([
    repo.listEvents(addDays(monday, -1).toISOString(), addDays(monday, 8).toISOString()),
    repo.listClients(),
    repo.listInvoices({ statuses: ['to_send', 'draft'] }),
  ])
  const selected = sp.event ? ((await repo.getEvent(sp.event)) ?? null) : null
  const selectedClient = selected?.client_id
    ? clients.find((c) => c.id === selected.client_id)
    : null
  const selectedIdeas = selectedClient
    ? (await repo.listIdeas(selectedClient.id)).filter(
        (i) => i.status === 'approved' || i.status === 'developed',
      )
    : []

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const todayIso = isoDay(new Date())
  const weekParam = (d: Date) => isoDay(d)
  const googleOk = integrationStatus().find((i) => i.key === 'google')?.ok
  const qs = (extra: Record<string, string>) =>
    `?${new URLSearchParams({ week: weekParam(monday), ...extra })}`

  return (
    <>
      <PageHeader
        eyebrow={`Week ${isoWeekNumber(monday)} · ${fmtDate(monday, { day: 'numeric', month: 'long' })} – ${fmtDate(addDays(monday, 6), { day: 'numeric', month: 'long', year: 'numeric' })}`}
        title="Kalender"
      >
        <Pill tone={googleOk ? 'green' : 'light'}>
          {googleOk ? 'Google Calendar gekoppeld' : 'Google Calendar nog niet gekoppeld'}
        </Pill>
        <Link
          href={`?week=${weekParam(addDays(monday, -7))}`}
          aria-label="Vorige week"
          className={buttonClass('light', false, 'px-3.5')}
        >
          ←
        </Link>
        <Link href="/admin/kalender" className={buttonClass('light')}>
          Deze week
        </Link>
        <Link
          href={`?week=${weekParam(addDays(monday, 7))}`}
          aria-label="Volgende week"
          className={buttonClass('light', false, 'px-3.5')}
        >
          →
        </Link>
        <Link href={qs({ nieuw: '1' })} className={buttonClass('cyan')}>
          + Afspraak
        </Link>
      </PageHeader>

      <div className={cn('flex flex-wrap items-center gap-4 text-[13px]', muted)}>
        {(Object.keys(EVENT_KIND_LABELS) as EventKind[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('size-3 rounded', EVENT_STYLE[k])} />
            {EVENT_KIND_LABELS[k]}
          </span>
        ))}
        {!selected && (
          <span className="ml-auto">Klik op een afspraak voor details en het draaiboek.</span>
        )}
      </div>

      {sp.nieuw && (
        <Card>
          <Title className="mb-4 text-2xl">Nieuwe afspraak</Title>
          <FormAction
            action={createEventAction}
            submitLabel="Toevoegen"
            pendingText="Toevoegen…"
            resetOnSuccess
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
              <label className={label}>
                Soort
                <select
                  name="kind"
                  defaultValue={sp.client ? 'shoot' : 'meeting'}
                  className={input}
                >
                  {(Object.keys(EVENT_KIND_LABELS) as EventKind[]).map((k) => (
                    <option key={k} value={k}>
                      {EVENT_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                Klant
                <select name="client_id" defaultValue={sp.client ?? ''} className={input}>
                  <option value="">—</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={cn(label, 'col-span-full sm:col-span-2')}>
                Titel *
                <input
                  name="title"
                  required
                  defaultValue={
                    sp.client
                      ? `Draaidag · ${clients.find((c) => c.id === sp.client)?.name ?? ''}`
                      : ''
                  }
                  className={input}
                />
              </label>
              <label className={label}>
                Datum *
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={
                    days.some((d) => isoDay(d) === todayIso) ? todayIso : isoDay(monday)
                  }
                  className={input}
                />
              </label>
              <label className={label}>
                Van
                <input name="start" type="time" defaultValue="09:00" className={input} />
              </label>
              <label className={label}>
                Tot
                <input name="end" type="time" defaultValue="12:00" className={input} />
              </label>
              <label className={label}>
                Locatie
                <input name="location" className={input} />
              </label>
            </div>
            <fieldset className="flex flex-wrap gap-4 border-0 p-0">
              <legend className={cn('mb-1.5 text-[13px] font-semibold', muted)}>
                Wie gaat mee
              </legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="attendees"
                  value="casper"
                  className="size-5 accent-[#0FC1DE]"
                />{' '}
                Casper
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="attendees"
                  value="cedric"
                  className="size-5 accent-[#0FC1DE]"
                />{' '}
                Cedric
              </label>
            </fieldset>
            <label className={label}>
              Notities
              <textarea name="notes" className={cn(input, 'min-h-16')} />
            </label>
          </FormAction>
        </Card>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="grid min-w-[800px] grid-cols-7 gap-2">
            {days.map((d, i) => {
              const iso = isoDay(d)
              const dayEvents = events.filter((e) => isoDay(new Date(e.starts_at)) === iso)
              const dayInvoices = invoices.filter((inv) => inv.send_date === iso)
              const weekend = i >= 5
              const isToday = iso === todayIso
              return (
                <div
                  key={iso}
                  className={cn(
                    'flex min-h-[420px] flex-col gap-2 rounded-[18px] p-3',
                    weekend ? 'bg-[#F7F2E9]' : 'bg-ikr-cream-light',
                    isToday && 'shadow-[inset_0_0_0_2px_#0FC1DE]',
                  )}
                >
                  <span className={cn('text-xs font-semibold uppercase', muted)}>
                    {fmtDate(d, { weekday: 'short' }).replace('.', '')}
                  </span>
                  <span
                    className={cn(
                      'font-display text-3xl leading-none font-black',
                      weekend && 'text-[#8A8296]',
                    )}
                  >
                    {fmtDate(d, { day: 'numeric' })}
                  </span>
                  {dayInvoices.length > 2 ? (
                    <Link
                      href="/admin/contracten"
                      className={cn(
                        'flex flex-col gap-0.5 rounded-xl p-2.5 text-[13px] no-underline',
                        EVENT_STYLE.deadline,
                      )}
                    >
                      <span className="font-bold">{dayInvoices.length} facturen</span>
                      <span>te versturen</span>
                    </Link>
                  ) : (
                    dayInvoices.map((inv) => (
                      <Link
                        key={inv.id}
                        href={`/admin/klanten/${inv.client_id}?tab=contract`}
                        className={cn(
                          'flex flex-col gap-0.5 rounded-xl p-2.5 text-[13px] no-underline',
                          EVENT_STYLE.deadline,
                        )}
                      >
                        <span className="font-bold">
                          Factuur {clients.find((c) => c.id === inv.client_id)?.name}
                        </span>
                        <span>{inv.status === 'draft' ? 'Concept in Billit' : 'Te versturen'}</span>
                      </Link>
                    ))
                  )}
                  {dayEvents.map((e) => (
                    <Link
                      key={e.id}
                      href={qs({ event: e.id })}
                      className={cn(
                        'flex flex-col gap-0.5 rounded-xl p-2.5 text-[13px] no-underline',
                        EVENT_STYLE[e.kind],
                        e.kind === 'shoot' && 'min-h-24',
                        selected?.id === e.id && 'shadow-[0_0_0_3px_#201737]',
                      )}
                    >
                      <span className="font-bold">{e.title}</span>
                      <span className={e.kind === 'sales_call' ? 'text-[#C9C2DA]' : undefined}>
                        {fmtTime(e.starts_at)}
                        {e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ''}
                      </span>
                      {e.attendees.length > 0 && <span className="capitalize">{e.attendees.join(' + ')}</span>}
                      {e.kind === 'shoot' && (
                        <span className="mt-auto font-semibold">
                          {e.brief ? 'Draaiboek klaar' : 'Geen draaiboek'}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {selected && (
          <aside
            aria-label="Details afspraak"
            className="fixed inset-x-3 top-3 bottom-3 z-40 flex flex-col gap-4 overflow-y-auto rounded-[22px] bg-ikr-cream-light p-[22px] shadow-[0_20px_60px_rgba(32,23,55,0.35)] sm:left-auto sm:w-[400px]"
          >
            <Link
              href={qs({})}
              aria-label="Sluiten"
              className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full text-ikr-navy hover:bg-ikr-cream"
            >
              <Icon.close />
            </Link>
            {selected && (
              <>
                <Pill tone={selected.kind === 'shoot' ? 'cyan' : 'neutral'} className="self-start">
                  {EVENT_KIND_LABELS[selected.kind]}
                </Pill>
                <div>
                  <Title className="m-0 text-[34px] leading-[0.95]">
                    {selectedClient?.name ?? selected.title}
                  </Title>
                  <p className={cn('mt-1.5 mb-0 text-sm', muted)}>
                    {fmtDate(selected.starts_at, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {fmtTime(selected.starts_at)}
                    {selected.ends_at ? ` – ${fmtTime(selected.ends_at)}` : ''}
                    {selected.location ? ` · ${selected.location}` : ''}
                  </p>
                </div>
                {selected.notes && <p className="m-0 text-sm">{selected.notes}</p>}

                {selected.kind === 'shoot' && (
                  <div className="flex flex-col gap-2.5 rounded-2xl bg-ikr-cream p-4">
                    <div className="flex items-center gap-2">
                      <Icon.sparkle size={16} className="text-[#0B7F93]" />
                      <span className="text-[15px] font-bold">Draaiboek</span>
                      <Pill tone={selected.brief ? 'green' : 'orange'} className="ml-auto">
                        {selected.brief ? 'Klaar' : 'Nog niet gemaakt'}
                      </Pill>
                    </div>
                    {selected.brief ? (
                      <div className="flex flex-col gap-3 text-sm">
                        <div>
                          <span className={cn('text-[11px] font-bold tracking-[0.06em]', muted)}>
                            PLANNING
                          </span>
                          <ul className="m-0 list-none p-0">
                            {selected.brief.schedule.map((s, i) => (
                              <li key={i} className="flex gap-3 py-0.5">
                                <span className="w-12 shrink-0 font-semibold">{s.time}</span>
                                <span>{s.what}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {selected.brief.shotlist.length > 0 && (
                          <div>
                            <span className={cn('text-[11px] font-bold tracking-[0.06em]', muted)}>
                              SHOTLIST
                            </span>
                            <ul className="m-0 pl-[18px]">
                              {selected.brief.shotlist.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selected.brief.checklist.length > 0 && (
                          <div>
                            <span className={cn('text-[11px] font-bold tracking-[0.06em]', muted)}>
                              CHECKLIST
                            </span>
                            <ul className="m-0 pl-[18px]">
                              {selected.brief.checklist.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selected.brief.notes && <p className="m-0">{selected.brief.notes}</p>}
                      </div>
                    ) : (
                      <p className={cn('m-0 text-sm leading-normal', muted)}>
                        IKR AI maakt een planning per uur, shotlist en checklist op basis van de
                        goedgekeurde ideeën.
                      </p>
                    )}
                    <ActionButton
                      action={shootBriefAction.bind(null, selected.id)}
                      claudePrompt={claudePrompts.shootBrief(
                        `${selectedClient ? `bij ${selectedClient.name} ` : ''}“${selected.title}” op ${fmtDate(selected.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })}`,
                      )}
                      variant="navy"
                      ai
                      pendingText="Draaiboek maken…"
                    >
                      {selected.brief ? 'Opnieuw genereren' : 'Genereer draaiboek'}
                    </ActionButton>
                  </div>
                )}

                {selected.kind === 'shoot' && (
                  <div className="flex flex-col gap-2">
                    <span className={cn('text-[11px] font-bold tracking-[0.06em]', muted)}>
                      VIDEO’S DIE DAG
                    </span>
                    {!selectedIdeas.length && (
                      <Empty>Nog geen goedgekeurde of uitgewerkte ideeën.</Empty>
                    )}
                    {selectedIdeas.map((i) => (
                      <div
                        key={i.id}
                        className="flex justify-between gap-2 border-t border-[#E6DFD2] py-2 text-sm"
                      >
                        <span>{i.title}</span>
                        <Pill tone={i.status === 'approved' ? 'green' : 'teal'}>
                          {i.status === 'approved' ? 'Goedgekeurd' : 'Uitgewerkt'}
                        </Pill>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {selectedClient && (
                    <Link
                      href={`/admin/klanten/${selectedClient.id}`}
                      className="text-sm font-semibold text-ikr-navy"
                    >
                      Open klantdossier →
                    </Link>
                  )}
                  <ActionButton
                    action={deleteEventAction.bind(null, selected.id)}
                    confirm="Deze afspraak verwijderen?"
                  >
                    Verwijderen
                  </ActionButton>
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </>
  )
}

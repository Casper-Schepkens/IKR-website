'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addExceptionAction, removeExceptionAction, saveGeneralAction, saveMemberAction, saveWeeklyAction, setSourceAction } from '@/app/admin/booking-actions'
import type { ActionResult } from '@/app/admin/actions'
import { addDays } from '@/lib/admin/dates'
import { dayWindows, fromMinutes, WEEKDAY_LABELS, type DayException, type WeeklyBlock, type Weekday } from '@/lib/booking/slots'
import { TEMPLATE_FIELDS } from '@/lib/booking/core'
import { buttonClass, input, label, muted, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

/** Beheer van de beschikbaarheid voor /boek (per teamlid) en de algemene instellingen. */

function useAction() {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const run = (fn: () => Promise<ActionResult<unknown>>, after?: () => void) =>
    start(async () => {
      setError(null)
      setSaved(false)
      const r = await fn()
      if (!r.ok) return setError(r.error)
      setSaved(true)
      after?.()
      router.refresh()
    })
  return { pending, error, saved, run }
}

function Feedback({ error, saved, pending }: { error: string | null; saved: boolean; pending: boolean }) {
  if (pending) return <Spinner />
  if (error)
    return (
      <span role="alert" className="text-sm font-semibold text-adm-warn-strong">
        {error}
      </span>
    )
  if (saved) return <span className="text-sm font-semibold text-adm-green">Opgeslagen</span>
  return null
}

const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7]
const rangeText = (r: [number, number][]) => (r.length ? r.map(([a, b]) => `${fromMinutes(a)}–${fromMinutes(b)}`).join(', ') : 'niet beschikbaar')

// ─── Vaste weekuren ───────────────────────────────────────────────────────
export function WeeklyHoursEditor({ member, initial }: { member: string; initial: WeeklyBlock[] }) {
  const [blocks, setBlocks] = useState<WeeklyBlock[]>(initial)
  const { pending, error, saved, run } = useAction()
  const set = (i: number, patch: Partial<WeeklyBlock>) => setBlocks((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <div className="flex flex-col gap-2">
      {DAYS.map((d) => {
        const mine = blocks.map((b, i) => ({ b, i })).filter((x) => x.b.weekday === d)
        return (
          <div key={d} className="flex flex-wrap items-center gap-2 border-t border-adm-line py-2.5 first:border-t-0">
            <span className="w-24 font-semibold capitalize">{WEEKDAY_LABELS[d]}</span>
            <div className="flex flex-[1_1_260px] flex-wrap items-center gap-2">
              {!mine.length && <span className={cn('text-sm', muted)}>Niet beschikbaar</span>}
              {mine.map(({ b, i }) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-xl bg-adm-soft px-2 py-1">
                  <input aria-label={`${WEEKDAY_LABELS[d]} van`} type="time" step={900} value={b.start} onChange={(e) => set(i, { start: e.target.value })} className="rounded-md bg-transparent px-1 text-[15px]" />
                  <span aria-hidden>–</span>
                  <input aria-label={`${WEEKDAY_LABELS[d]} tot`} type="time" step={900} value={b.end} onChange={(e) => set(i, { end: e.target.value })} className="rounded-md bg-transparent px-1 text-[15px]" />
                  <button type="button" aria-label="Blok verwijderen" onClick={() => setBlocks((x) => x.filter((_, j) => j !== i))} className="ml-1 rounded-full px-2 text-adm-muted hover:text-adm-fg">
                    ×
                  </button>
                </span>
              ))}
              <button type="button" onClick={() => setBlocks((x) => [...x, { weekday: d, start: mine.length ? mine[mine.length - 1].b.end : '10:00', end: '12:00' }])} className={buttonClass('soft', true, 'min-h-8 px-3 text-xs')}>
                + blok
              </button>
            </div>
          </div>
        )
      })}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} data-pending={pending} onClick={() => run(() => saveWeeklyAction(member, blocks))} className={buttonClass('navy', true)}>
          Weekuren opslaan
        </button>
        <Feedback error={error} saved={saved} pending={pending} />
      </div>
    </div>
  )
}

// ─── Uitzonderingen per week ──────────────────────────────────────────────
type Ex = DayException & { id: string }

function mondayOf(day: string) {
  const wd = new Date(`${day}T12:00:00Z`).getUTCDay()
  return addDays(day, -((wd + 6) % 7))
}

export function WeekExceptions({ member, weekly, exceptions, today }: { member: string; weekly: WeeklyBlock[]; exceptions: Ex[]; today: string }) {
  const [week, setWeek] = useState(mondayOf(today))
  const [open, setOpen] = useState<{ day: string; kind: 'add' | 'remove' } | null>(null)
  const [times, setTimes] = useState({ start: '10:00', end: '12:00' })
  const { pending, error, saved, run } = useAction()
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week])
  const fmt = (d: string) => new Intl.DateTimeFormat('nl-BE', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00Z`))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setWeek(addDays(week, -7))} disabled={week <= mondayOf(today)} className={buttonClass('soft', true)} aria-label="Vorige week">
          ‹
        </button>
        <span className="min-w-[180px] text-center font-semibold">Week van {fmt(week)}</span>
        <button type="button" onClick={() => setWeek(addDays(week, 7))} className={buttonClass('soft', true)} aria-label="Volgende week">
          ›
        </button>
        {week !== mondayOf(today) && (
          <button type="button" onClick={() => setWeek(mondayOf(today))} className={buttonClass('soft', true, 'text-xs')}>
            Deze week
          </button>
        )}
      </div>
      <div className="flex flex-col">
        {days.map((d) => {
          const past = d < today
          const own = exceptions.filter((e) => e.day === d)
          const base = dayWindows(d, weekly, [])
          const effective = dayWindows(d, weekly, own)
          return (
            <div key={d} className={cn('flex flex-col gap-2 border-t border-adm-line py-3', past && 'opacity-50')}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="w-28 font-semibold capitalize">{fmt(d)}</span>
                <span className="flex-[1_1_200px] text-sm">
                  {rangeText(effective)}
                  {own.length > 0 && <span className={cn('ml-2 text-xs', muted)}>(vast: {rangeText(base)})</span>}
                </span>
                {!past && (
                  <span className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setOpen({ day: d, kind: 'add' })} className={buttonClass('soft', true, 'min-h-8 px-3 text-xs')}>
                      + blok
                    </button>
                    {effective.length > 0 && (
                      <>
                        <button type="button" onClick={() => setOpen({ day: d, kind: 'remove' })} className={buttonClass('soft', true, 'min-h-8 px-3 text-xs')}>
                          − blok
                        </button>
                        <button type="button" disabled={pending} onClick={() => run(() => addExceptionAction(member, { day: d, kind: 'remove' }))} className={buttonClass('soft', true, 'min-h-8 px-3 text-xs')}>
                          Hele dag niet
                        </button>
                      </>
                    )}
                  </span>
                )}
              </div>
              {own.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-0 sm:pl-[124px]">
                  {own.map((e) => (
                    <span key={e.id} className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', e.kind === 'add' ? 'bg-adm-green-bg text-adm-green' : 'bg-adm-warn-bg text-adm-warn')}>
                      {e.kind === 'add' ? '+' : '−'} {e.start ? `${e.start}–${e.end}` : 'hele dag'}
                      {!past && (
                        <button type="button" aria-label="Uitzondering verwijderen" disabled={pending} onClick={() => run(() => removeExceptionAction(member, e.id))} className="ml-1 opacity-70 hover:opacity-100">
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {open?.day === d && (
                <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-adm-soft p-3 sm:ml-[124px]">
                  <span className="w-full text-sm font-semibold">{open.kind === 'add' ? 'Extra blok enkel op deze dag' : 'Blok schrappen enkel op deze dag'}</span>
                  <label className={label}>
                    Van
                    <input type="time" step={900} value={times.start} onChange={(e) => setTimes((t) => ({ ...t, start: e.target.value }))} className={cn(input, 'bg-adm-card')} />
                  </label>
                  <label className={label}>
                    Tot
                    <input type="time" step={900} value={times.end} onChange={(e) => setTimes((t) => ({ ...t, end: e.target.value }))} className={cn(input, 'bg-adm-card')} />
                  </label>
                  <button type="button" disabled={pending} data-pending={pending} onClick={() => run(() => addExceptionAction(member, { day: d, kind: open.kind, ...times }), () => setOpen(null))} className={buttonClass('navy', true)}>
                    Toevoegen
                  </button>
                  <button type="button" onClick={() => setOpen(null)} className={buttonClass('light', true)}>
                    Annuleren
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Feedback error={error} saved={saved} pending={pending} />
    </div>
  )
}

// ─── Meldingen, meedoen en vrij/bezet ─────────────────────────────────────
export function MemberSettings({
  member,
  active,
  notifyEmail,
  useBusy,
  sources,
  providers,
}: {
  member: string
  active: boolean
  notifyEmail: string | null
  useBusy: boolean
  sources: { provider: string; active: boolean }[]
  providers: { id: string; label: string; description: string; status: string | null }[]
}) {
  const [email, setEmail] = useState(notifyEmail ?? '')
  const { pending, error, saved, run } = useAction()
  const on = (p: string) => sources.some((s) => s.provider === p && s.active)
  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-3 font-semibold">
        <input type="checkbox" checked={active} disabled={pending} onChange={(e) => run(() => saveMemberAction(member, { active: e.target.checked }))} className="h-5 w-5 accent-[#201737]" />
        Neemt boekingen aan via /boek
      </label>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => saveMemberAction(member, { notify_email: email }))
        }}
      >
        <label className={cn(label, 'flex-[1_1_260px]')}>
          Meldingsadres bij een nieuwe boeking
          <input type="email" value={email} placeholder={member} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <button type="submit" disabled={pending} className={buttonClass('navy', true)}>
          Opslaan
        </button>
      </form>
      <div className="flex flex-col gap-2 rounded-2xl bg-adm-soft p-4">
        <label className="flex items-center gap-3 font-semibold">
          <input type="checkbox" checked={useBusy} disabled={pending} onChange={(e) => run(() => saveMemberAction(member, { use_busy: e.target.checked }))} className="h-5 w-5 accent-[#201737]" />
          Vrij/bezet lezen uit mijn agenda&apos;s
        </label>
        <p className={cn('m-0 text-sm', muted)}>Staat er al iets in de agenda, dan verdwijnt dat moment van /boek. Enkel begin en einde worden gelezen, nooit de inhoud.</p>
        {providers.map((p) => (
          <label key={p.id} className={cn('flex items-start gap-3 pt-1', !useBusy && 'opacity-50')}>
            <input type="checkbox" checked={on(p.id)} disabled={pending || !useBusy} onChange={(e) => run(() => setSourceAction(member, p.id, e.target.checked))} className="mt-1 h-4 w-4 accent-[#201737]" />
            <span className="flex flex-col">
              <span className="font-semibold">{p.label}</span>
              <span className={cn('text-sm', muted)}>{p.description}</span>
              {p.status && <span className="text-sm text-adm-warn">{p.status}</span>}
            </span>
          </label>
        ))}
      </div>
      <Feedback error={error} saved={saved} pending={pending} />
    </div>
  )
}

// ─── Algemeen: volgorde, calltype, bevestigingsmail ───────────────────────
export function GeneralSettings({
  members,
  priority,
  callName,
  callMinutes,
  subject,
  template,
}: {
  members: { email: string; name: string }[]
  priority: string[]
  callName: string
  callMinutes: number
  subject: string
  template: string
}) {
  const [order, setOrder] = useState(priority.filter((p) => members.some((m) => m.email === p)).concat(members.map((m) => m.email).filter((e) => !priority.includes(e))))
  const [name, setName] = useState(callName)
  const [minutes, setMinutes] = useState(callMinutes)
  const [subj, setSubj] = useState(subject)
  const [body, setBody] = useState(template)
  const { pending, error, saved, run } = useAction()
  const nameOf = (e: string) => members.find((m) => m.email === e)?.name ?? e
  const move = (i: number, dir: -1 | 1) =>
    setOrder((o) => {
      const n = [...o]
      ;[n[i], n[i + dir]] = [n[i + dir], n[i]]
      return n
    })
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => saveGeneralAction({ priority: order, call_name: name, call_minutes: minutes, confirm_subject: subj, confirm_template: body }))
      }}
    >
      <div>
        <p className="m-0 mb-2 text-[13px] font-semibold text-adm-muted">Volgorde als meerdere mensen kunnen</p>
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {order.map((e, i) => (
            <li key={e} className="flex items-center gap-2 rounded-xl bg-adm-soft px-3 py-2">
              <span className="w-5 font-bold">{i + 1}.</span>
              <span className="flex-1 font-semibold">{nameOf(e)}</span>
              <button type="button" aria-label={`${nameOf(e)} hoger`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded-full px-2 disabled:opacity-30">
                ↑
              </button>
              <button type="button" aria-label={`${nameOf(e)} lager`} disabled={i === order.length - 1} onClick={() => move(i, 1)} className="rounded-full px-2 disabled:opacity-30">
                ↓
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className={cn(label, 'flex-[2_1_220px]')}>
          Soort call
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </label>
        <label className={cn(label, 'flex-[1_1_120px]')}>
          Duur (minuten)
          <input type="number" min={15} max={120} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={input} />
        </label>
      </div>
      <label className={label}>
        Onderwerp bevestigingsmail
        <input value={subj} onChange={(e) => setSubj(e.target.value)} className={input} />
      </label>
      <label className={label}>
        Bevestigingsmail naar de lead (namens het teamlid)
        <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} className={cn(input, 'font-[inherit] leading-relaxed')} />
      </label>
      <p className={cn('m-0 text-xs', muted)}>Plaatshouders: {TEMPLATE_FIELDS.map((f) => `{${f}}`).join(' ')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} data-pending={pending} className={buttonClass('navy', true)}>
          Opslaan
        </button>
        <Feedback error={error} saved={saved} pending={pending} />
      </div>
    </form>
  )
}

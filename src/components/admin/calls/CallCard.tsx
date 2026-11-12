'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  addFirefliesAction,
  cancelCallAction,
  finishCallAction,
  finishCallRecordingAction,
  firefliesCheckAction,
  setCallSalesPptAction,
  startCallAction,
  startCallRecordingAction,
} from '@/app/admin/calls-actions'
import { CALL_KIND_LABELS, CALL_STATUS_LABELS, salesPptUrl, type Call } from '@/lib/admin/calls/types'
import { fmtDate, fmtTime } from '@/lib/admin/format'
import { RecordButton } from '../RecordButton'
import { buttonClass, Card, muted, Pill, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

export type CallLead = { id: string; name: string; company: string | null; phone: string | null; context: string }

const small = 'ikr-btn inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold disabled:opacity-60'

export function CallCard({ call: c, lead, overdue }: { call: Call; lead: CallLead | null; overdue: boolean }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [ff, setFf] = useState<'unknown' | 'in' | 'out'>(c.fireflies_added_at ? 'in' : 'unknown')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const router = useRouter()
  const open = c.status === 'gepland'
  const sales = c.kind === 'sales'

  const run = <T,>(fn: () => Promise<{ ok: boolean; error?: string; data?: T }>, after?: (data?: T) => void) =>
    start(async () => {
      setError(null)
      setInfo(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      else after?.(res.data)
      router.refresh()
    })

  return (
    <Card className={cn('flex flex-col gap-3 p-5', !open && 'opacity-80')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-bold">
            {fmtDate(c.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} · {fmtTime(c.starts_at)}–{fmtTime(c.ends_at)}
          </span>
          <span className="text-sm">
            {lead ? (
              <Link href={`/admin/sales/leads/${lead.id}`} className="font-semibold text-ikr-navy hover:text-[#0B7F93]">
                {lead.company ?? lead.name}
              </Link>
            ) : (
              'Onbekende lead'
            )}
            {lead?.company && <span className={muted}> · {lead.name}</span>}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={sales ? 'teal' : 'purple'}>{CALL_KIND_LABELS[c.kind]}</Pill>
          {!open && <Pill tone={c.status === 'afgerond' ? 'green' : c.status === 'no_show' ? 'orange' : 'light'}>{CALL_STATUS_LABELS[c.status]}</Pill>}
          {open && overdue && <Pill tone="yellow">Nog afronden</Pill>}
          {c.created_via === 'agenda' && <Pill tone="light">uit de contact-agenda</Pill>}
        </div>
      </div>

      {lead?.context && <p className={cn('m-0 text-sm', muted)}>{lead.context}</p>}
      {c.calendar_error && <p className="m-0 text-sm text-[#A3470F]">Agenda: {c.calendar_error}</p>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {!sales && lead?.phone && (
          <a href={`tel:${lead.phone.replace(/\s+/g, '')}`} className="font-semibold text-[#0B7F93]">
            {lead.phone}
          </a>
        )}
        {c.meet_url && (
          <a href={c.meet_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0B7F93]">
            Google Meet ↗
          </a>
        )}
        {sales && <SalesPpt call={c} />}
        {c.recording_url && (
          <a href={c.recording_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0B7F93]">
            Opname ↗
          </a>
        )}
        {c.transcript_url && (
          <a href={c.transcript_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0B7F93]">
            Transcript ↗
          </a>
        )}
        {c.thank_you_draft_id && (
          <Link href="/admin/sales/inbox?tab=concepten" className="font-semibold text-[#0B7F93]">
            Bedankmail
          </Link>
        )}
      </div>
      {!open && !c.transcript_url && c.status === 'afgerond' && (
        <p className={cn('m-0 text-xs', muted)}>Wacht op het Fireflies-transcript (meestal enkele minuten na de call).</p>
      )}
      {c.note && <p className={cn('m-0 text-xs', muted)}>{c.note}</p>}
      {c.analysis && (
        <details className="rounded-2xl bg-ikr-cream p-3 text-sm">
          <summary className="cursor-pointer font-semibold">
            Feedback van Grok Bot{c.analysis.score ? ` · ${c.analysis.score}/10` : ''}
          </summary>
          <p className="m-0 mt-2">{c.analysis.samenvatting}</p>
          {[
            ['Goed', c.analysis.goed],
            ['Beter', c.analysis.beter],
            ['Tips', c.analysis.tips],
          ].map(([label, items]) =>
            (items as string[]).length ? (
              <div key={label as string} className="mt-2">
                <strong>{label as string}</strong>
                <ul className="m-0 mt-1 pl-5">
                  {(items as string[]).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </details>
      )}

      {open && (
        <div className="flex flex-col gap-3 border-t border-[#E6DFD2] pt-3">
          {sales ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending || !c.meet_url}
                onClick={() => {
                  // Meet meteen openen (anders blokkeert de browser het venster), daarna Fireflies erbij.
                  if (c.meet_url) window.open(c.meet_url, '_blank', 'noopener')
                  run(() => startCallAction(c.id), () => {
                    setFf('in')
                    setInfo('Fireflies is toegevoegd. Zeg nog even mondeling dat je opneemt.')
                  })
                }}
                className={buttonClass('navy')}
              >
                Call starten
              </button>
              <button
                type="button"
                disabled={pending || !c.meet_url}
                onClick={() =>
                  run<{ inMeeting: boolean }>(() => firefliesCheckAction(c.id), (d) => {
                    setFf(d?.inMeeting ? 'in' : 'out')
                    setInfo(d?.inMeeting ? 'Fireflies zit in de call.' : 'Fireflies zit niet in de call.')
                  })
                }
                className={cn(small, 'bg-ikr-cream text-ikr-navy')}
              >
                Check Fireflies
              </button>
              {ff === 'out' && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => addFirefliesAction(c.id), () => {
                    setFf('in')
                    setInfo('Fireflies is toegevoegd.')
                  })}
                  className={cn(small, 'bg-ikr-cyan text-ikr-navy')}
                >
                  Fireflies toevoegen
                </button>
              )}
            </div>
          ) : (
            <RecordButton
              startUpload={(mime, origin) => startCallRecordingAction(c.id, mime, origin)}
              finish={(fileId) => finishCallRecordingAction(c.id, fileId)}
              existingUrl={c.recording_url}
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run<{ draftId: string | null }>(() => finishCallAction(c.id, 'afgerond'), (d) =>
                  setInfo(d?.draftId ? 'Bedankmail met de ppt staat klaar in Inbox → Concepten.' : 'Call afgerond.'),
                )
              }
              className={cn(small, 'bg-[#DDF2DF] text-[#1E5B27]')}
            >
              Call afgerond
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run<{ draftId: string | null }>(() => finishCallAction(c.id, 'no_show'), (d) =>
                  setInfo(d?.draftId ? 'Concept om een nieuwe call te plannen staat klaar in Inbox → Concepten.' : 'Aangeduid als no-show.'),
                )
              }
              className={cn(small, 'bg-[#FCE3D2] text-[#8A3A0C]')}
            >
              Kwam niet opdagen
            </button>
            {confirmCancel ? (
              <>
                <button type="button" disabled={pending} onClick={() => run(() => cancelCallAction(c.id))} className={cn(small, 'bg-[#B42318] text-white')}>
                  Ja, annuleer (ook in de agenda)
                </button>
                <button type="button" onClick={() => setConfirmCancel(false)} className={cn(small, 'bg-ikr-cream text-ikr-navy')}>
                  Toch niet
                </button>
              </>
            ) : (
              <button type="button" disabled={pending} onClick={() => setConfirmCancel(true)} className={cn(small, 'bg-ikr-cream text-[#8E1B12]')}>
                Annuleren
              </button>
            )}
            {pending && <Spinner />}
          </div>
        </div>
      )}

      {info && (
        <p role="status" className="m-0 text-sm text-[#1E5B27]">
          {info}
          {info.includes('Concepten') && (
            <>
              {' '}
              <Link href="/admin/sales/inbox?tab=concepten" className="font-semibold">
                Open
              </Link>
            </>
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-[#A3470F]">
          {error}
        </p>
      )}
    </Card>
  )
}

/** Sales-ppt: standaard of een eigen link voor deze call (potlood om aan te passen; leeg = standaard). */
function SalesPpt({ call: c }: { call: Call }) {
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const save = (value: string) =>
    start(async () => {
      setError(null)
      const res = await setCallSalesPptAction(c.id, value)
      if (!res.ok) return setError(res.error)
      setEditing(false)
      router.refresh()
    })
  if (editing)
    return (
      <form
        className="flex flex-wrap items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          save(String(new FormData(e.currentTarget).get('url') ?? ''))
        }}
      >
        <input name="url" type="url" autoFocus defaultValue={c.sales_ppt_url ?? ''} placeholder="https://… (leeg = standaard-ppt)" aria-label="Sales-ppt voor deze call" className="min-h-8 w-64 rounded-lg border-0 bg-ikr-cream px-2.5 text-xs" />
        <button type="submit" disabled={pending} className={cn(small, 'bg-ikr-navy text-ikr-cream-light')}>
          Bewaar
        </button>
        <button type="button" onClick={() => setEditing(false)} className={cn(small, 'bg-ikr-cream text-ikr-navy')}>
          Annuleer
        </button>
        {pending && <Spinner />}
        {error && (
          <span role="alert" className="text-xs text-[#A3470F]">
            {error}
          </span>
        )}
      </form>
    )
  return (
    <span className="inline-flex items-center gap-1">
      <a href={salesPptUrl(c)} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0B7F93]">
        Sales-ppt ↗
      </a>
      {c.sales_ppt_url && <span className={cn('text-xs', muted)}>(eigen)</span>}
      <button type="button" onClick={() => setEditing(true)} aria-label="Sales-ppt aanpassen" title="Sales-ppt voor deze call aanpassen" className="rounded-full p-1 text-xs text-[#5E5670] hover:bg-ikr-cream">
        ✎
      </button>
    </span>
  )
}

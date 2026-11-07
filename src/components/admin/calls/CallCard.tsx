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
  startCallAction,
  startCallRecordingAction,
} from '@/app/admin/calls-actions'
import { CALL_KIND_LABELS, CALL_STATUS_LABELS, SALES_PPT_URL, type Call } from '@/lib/admin/calls/types'
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
        {sales && (
          <a href={SALES_PPT_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0B7F93]">
            Sales-ppt ↗
          </a>
        )}
        {c.recording_url && (
          <a href={c.recording_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0B7F93]">
            Opname ↗
          </a>
        )}
      </div>

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
            <button type="button" disabled={pending} onClick={() => run(() => finishCallAction(c.id, 'afgerond'))} className={cn(small, 'bg-[#DDF2DF] text-[#1E5B27]')}>
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

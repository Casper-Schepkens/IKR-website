'use client'

import { useState, useTransition } from 'react'
import { sendAndScheduleAction } from '@/app/admin/calls-actions'
import { CALL_MINUTES, type CallKind } from '@/lib/admin/calls/types'
import { buttonClass, input, label, muted, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

export type CallSuggestion = { datum: string; uur: string; soort: CallKind | null }

/**
 * Inbox: "Verstuur en plan in agenda". Plant de call in de contact-agenda (Meet bij een sales call),
 * zet de link in de mail en verstuurt ze. De gewone "Verstuur" blijft ernaast staan.
 */
export function ScheduleSend({
  threadId,
  leadId,
  jobId,
  body,
  setBody,
  suggestion,
  onSent,
  disabled,
}: {
  threadId: string
  leadId: string
  jobId: string | null
  body: string
  setBody: (b: string) => void
  suggestion: CallSuggestion
  onSent: () => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<CallKind>(suggestion.soort ?? 'sales')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!open)
    return (
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={buttonClass('cyan')}>
        Verstuur en plan in agenda
      </button>
    )

  return (
    <form
      className="flex w-full flex-col gap-3 rounded-2xl bg-ikr-cream p-3"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        data.set('body', body)
        if (jobId) data.set('job_id', jobId)
        start(async () => {
          setError(null)
          const res = await sendAndScheduleAction(threadId, leadId, data)
          if (res.body) setBody(res.body) // met Meet-link, ook als het versturen mislukte
          if (!res.ok) setError(res.error ?? 'Mislukt.')
          else onSent()
        })
      }}
    >
      <p className={cn('m-0 text-xs', muted)}>
        Komt in de contact-agenda (met een uitnodiging voor jou). Bij een sales call komt de Meet-link automatisch in je mail.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
        <label className={label}>
          Soort
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as CallKind)} className={input}>
            <option value="setter">Setter call (telefoon)</option>
            <option value="sales">Sales call (Meet)</option>
          </select>
        </label>
        <label className={label}>
          Datum
          <input name="date" type="date" required defaultValue={suggestion.datum} className={input} />
        </label>
        <label className={label}>
          Uur
          <input name="time" type="time" required defaultValue={suggestion.uur} className={input} />
        </label>
        <label className={label}>
          Duur (min)
          <input key={kind} name="minutes" type="number" min={5} max={240} step={5} defaultValue={CALL_MINUTES[kind]} className={input} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="invite" className="size-4 accent-ikr-navy" /> Lead ook uitnodigen via de agenda
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending || !body.trim()} data-pending={pending} className={buttonClass('navy')}>
          {pending && <Spinner />} Plan in agenda en verstuur
        </button>
        <button type="button" disabled={pending} onClick={() => setOpen(false)} className={buttonClass('soft', true)}>
          Annuleer
        </button>
      </div>
      {error && (
        <p role="alert" className="m-0 text-sm text-[#A3470F]">
          {error}
        </p>
      )}
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { scheduleCallAction, syncCallsAction } from '@/app/admin/calls-actions'
import { CALL_MINUTES, type CallKind } from '@/lib/admin/calls/types'
import { FormAction } from '../FormAction'
import { buttonClass, input, label, Spinner } from '../ui'

export function NewCallForm({ leads }: { leads: { id: string; label: string }[] }) {
  const [kind, setKind] = useState<CallKind>('sales')
  return (
    <FormAction action={scheduleCallAction} submitLabel="Inplannen" pendingText="Inplannen…" resetOnSuccess>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <label className={label}>
          Lead
          <select name="lead_id" required defaultValue="" className={input}>
            <option value="" disabled>
              Kies…
            </option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Soort
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as CallKind)} className={input}>
            <option value="setter">Setter call (telefoon)</option>
            <option value="sales">Sales call (Meet)</option>
          </select>
        </label>
        <label className={label}>
          Datum
          <input name="date" type="date" required className={input} />
        </label>
        <label className={label}>
          Uur
          <input name="time" type="time" required defaultValue="10:00" className={input} />
        </label>
        <label className={label}>
          Duur (min)
          <input key={kind} name="minutes" type="number" min={5} max={240} step={5} defaultValue={CALL_MINUTES[kind]} className={input} />
        </label>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="invite" className="size-4 accent-ikr-navy" /> Lead ook uitnodigen via de agenda
      </label>
    </FormAction>
  )
}

export function SyncCallsButton() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()
  return (
    <span className="inline-flex items-center gap-2">
      {msg && <span className="text-xs">{msg}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await syncCallsAction()
            const d = res.ok ? (res.data as { nieuw: number; bijgewerkt: number } | undefined) : null
            setMsg(res.ok ? `${d?.nieuw ?? 0} nieuw, ${d?.bijgewerkt ?? 0} bijgewerkt` : res.error)
            router.refresh()
          })
        }
        className={buttonClass('light', true)}
      >
        {pending && <Spinner />} Agenda nakijken
      </button>
    </span>
  )
}

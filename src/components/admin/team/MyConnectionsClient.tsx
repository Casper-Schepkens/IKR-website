'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { disconnectTeamAction, refreshCalendarsAction, saveCalendarsAction } from '@/app/admin/team-actions'
import type { CalendarInfo } from '@/lib/admin/team/connections'
import { buttonClass, muted, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

/** Ontkoppelen (trekt het token ook in bij Google), met bevestiging. */
export function DisconnectButton({ kind }: { kind: 'mail' | 'agenda' }) {
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  if (!confirm)
    return (
      <button type="button" onClick={() => setConfirm(true)} className="ikr-btn inline-flex min-h-9 items-center rounded-full bg-[#F8D3D0] px-3 text-xs font-semibold text-[#8E1B12]">
        Ontkoppelen
      </button>
    )
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        data-pending={pending}
        onClick={() =>
          start(async () => {
            const res = await disconnectTeamAction(kind)
            if (!res.ok) setError(res.error)
            setConfirm(false)
            router.refresh()
          })
        }
        className="ikr-btn inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#B42318] px-3 text-xs font-semibold text-white"
      >
        {pending && <Spinner />} Ja, ontkoppel
      </button>
      <button type="button" onClick={() => setConfirm(false)} className={buttonClass('soft', true)}>
        Annuleer
      </button>
      {error && (
        <span role="alert" className="text-xs text-[#A3470F]">
          {error}
        </span>
      )}
    </span>
  )
}

/** Welke agenda's Grok Bot mag lezen (één of meer). */
export function CalendarPicker({ calendars, selected }: { calendars: CalendarInfo[]; selected: string[] }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const res = await fn()
      setMsg(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error ?? 'Mislukt.' })
      router.refresh()
    })
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        run(() => saveCalendarsAction(data), 'Keuze bewaard.')
      }}
    >
      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className={cn('mb-1 text-[13px] font-semibold', muted)}>Agenda&apos;s die Grok Bot mag lezen</legend>
        {calendars.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="calendar" value={c.id} defaultChecked={selected.includes(c.id)} className="size-4 accent-ikr-navy" />
            {c.naam}
            {c.primair && <span className={cn('text-xs', muted)}>(hoofdagenda)</span>}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} data-pending={pending} className={buttonClass('navy', true)}>
          {pending && <Spinner />} Bewaar keuze
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => refreshCalendarsAction(), 'Lijst vernieuwd.')} className={buttonClass('soft', true)}>
          Lijst vernieuwen
        </button>
        {msg && (
          <span role={msg.ok ? 'status' : 'alert'} className={cn('text-xs', msg.ok ? 'text-[#1E5B27]' : 'text-[#A3470F]')}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  )
}

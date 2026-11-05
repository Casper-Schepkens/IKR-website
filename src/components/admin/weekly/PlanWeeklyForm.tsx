'use client'

import { useState } from 'react'
import type { ActionResult } from '@/app/admin/actions'
import { ONLINE_MINUTES } from '@/lib/admin/weekly/types'
import { FormAction } from '../FormAction'
import { input, label, muted } from '../ui'
import { cn } from '@/utilities/ui'

/**
 * Datum, live/online en uren; gebruikt voor de eerste weekly en bij "Conclude meeting".
 * Online duurt altijd een uur (niet aanpasbaar); live heeft een start- en einduur.
 */
export function PlanWeeklyForm({
  action,
  submitLabel,
  defaults,
}: {
  action: (form: FormData) => Promise<ActionResult<unknown>>
  submitLabel: string
  defaults?: { date: string; time: string; endTime?: string; mode: 'live' | 'online' }
}) {
  const [mode, setMode] = useState<'live' | 'online'>(defaults?.mode ?? 'live')
  const live = mode === 'live'
  return (
    <FormAction action={action} submitLabel={submitLabel} pendingText="Bezig…" submitVariant="cyan">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <label className={label}>
          Datum
          <input name="date" type="date" required defaultValue={defaults?.date} className={input} />
        </label>
        <label className={label}>
          Live of online
          <select name="mode" value={mode} onChange={(e) => setMode(e.target.value as 'live' | 'online')} className={input}>
            <option value="live">Live</option>
            <option value="online">Online (Google Meet)</option>
          </select>
        </label>
        <label className={label}>
          {live ? 'Van' : 'Uur'}
          <input name="time" type="time" required defaultValue={defaults?.time ?? '10:00'} className={input} />
        </label>
        {live ? (
          <label className={label}>
            Tot
            <input name="end_time" type="time" required defaultValue={defaults?.endTime ?? '11:00'} className={input} />
          </label>
        ) : (
          <div className="flex flex-col justify-end gap-1.5">
            <span className={cn('text-[13px] font-semibold', muted)}>Duur</span>
            <span className="flex min-h-11 items-center text-sm font-semibold">{ONLINE_MINUTES / 60} uur (vast)</span>
          </div>
        )}
      </div>
    </FormAction>
  )
}

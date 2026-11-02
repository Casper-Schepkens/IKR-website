'use client'

import type { ActionResult } from '@/app/admin/actions'
import { FormAction } from '../FormAction'
import { input, label } from '../ui'

/** Datum, uur en live/online; gebruikt voor de eerste weekly en bij "Conclude meeting". */
export function PlanWeeklyForm({
  action,
  submitLabel,
  defaults,
}: {
  action: (form: FormData) => Promise<ActionResult<unknown>>
  submitLabel: string
  defaults?: { date: string; time: string; mode: 'live' | 'online' }
}) {
  return (
    <FormAction action={action} submitLabel={submitLabel} pendingText="Bezig…" submitVariant="cyan">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <label className={label}>
          Datum
          <input name="date" type="date" required defaultValue={defaults?.date} className={input} />
        </label>
        <label className={label}>
          Uur
          <input name="time" type="time" required defaultValue={defaults?.time ?? '10:00'} className={input} />
        </label>
        <label className={label}>
          Live of online
          <select name="mode" defaultValue={defaults?.mode ?? 'live'} className={input}>
            <option value="live">Live</option>
            <option value="online">Online (Google Meet)</option>
          </select>
        </label>
      </div>
    </FormAction>
  )
}

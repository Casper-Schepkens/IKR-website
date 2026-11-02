'use client'

import { createTodoAction } from '@/app/admin/weekly-actions'
import { TEAM, type Owner } from '@/lib/admin/weekly/types'
import { FormAction } from '../FormAction'
import { input, label } from '../ui'
import { cn } from '@/utilities/ui'

export function NewTodoForm({ defaultOwner }: { defaultOwner: Owner | null }) {
  return (
    <FormAction action={createTodoAction} submitLabel="To-do toevoegen" pendingText="Toevoegen…" resetOnSuccess>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <label className={cn(label, 'sm:col-span-2')}>
          To-do
          <input name="title" required className={input} />
        </label>
        <label className={label}>
          Voor
          <select name="owner" defaultValue={defaultOwner ?? 'casper'} className={input}>
            {TEAM.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Soort
          <select name="kind" defaultValue="weekly" className={input}>
            <option value="weekly">Tegen de volgende weekly</option>
            <option value="long">Lange to-do</option>
          </select>
        </label>
        <label className={cn(label, 'col-span-full')}>
          Notitie (optioneel)
          <input name="note" className={input} />
        </label>
      </div>
    </FormAction>
  )
}

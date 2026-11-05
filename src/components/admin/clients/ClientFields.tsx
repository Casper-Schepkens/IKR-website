'use client'

import { useState } from 'react'
import type { Client } from '@/lib/admin/clients/types'
import { input, label } from '../ui'
import { cn } from '@/utilities/ui'

/** Velden van een klant (nieuw en aanpassen). Contract: tot een datum, of onbepaalde duur. */
export function ClientFields({ client }: { client?: Client }) {
  const [kind, setKind] = useState<'datum' | 'onbepaald'>(client?.contract_indefinite ? 'onbepaald' : 'datum')
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
      <label className={label}>
        Klant
        <input name="name" required maxLength={200} defaultValue={client?.name} className={input} />
      </label>
      <label className={label}>
        Freelancer
        <input name="freelancer" maxLength={200} defaultValue={client?.freelancer ?? ''} placeholder="Wie staat erop?" className={input} />
      </label>
      <label className={label}>
        Contract
        <select name="contract_kind" value={kind} onChange={(e) => setKind(e.target.value as 'datum' | 'onbepaald')} className={input}>
          <option value="datum">Loopt tot een datum</option>
          <option value="onbepaald">Onbepaalde duur</option>
        </select>
      </label>
      <label className={cn(label, kind === 'onbepaald' && 'opacity-50')}>
        Contract loopt tot
        <input
          name="contract_end"
          type="date"
          disabled={kind === 'onbepaald'}
          defaultValue={client?.contract_end ?? ''}
          aria-describedby={kind === 'onbepaald' ? undefined : 'contract-end-hint'}
          className={input}
        />
        {kind === 'datum' && (
          <span id="contract-end-hint" className="text-xs font-normal">
            Leeg laten als het nog niet gekend is.
          </span>
        )}
      </label>
    </div>
  )
}

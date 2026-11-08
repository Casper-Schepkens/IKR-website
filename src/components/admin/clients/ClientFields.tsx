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
      <label className={label}>
        Contract start
        <input name="contract_start" type="date" defaultValue={client?.contract_start ?? ''} className={input} />
      </label>
      <label className={label}>
        Klant betaalt / maand (excl. btw)
        <input name="monthly_fee" inputMode="decimal" placeholder="bv. 1200" defaultValue={client?.monthly_fee ?? ''} className={input} />
      </label>
      <label className={label}>
        Freelancer / maand
        <input name="freelancer_cost" inputMode="decimal" placeholder="bv. 450" defaultValue={client?.freelancer_cost ?? ''} className={input} />
      </label>
      <label className={label}>
        Boosting / maand
        <input name="boosting_budget" inputMode="decimal" placeholder="bv. 150" defaultValue={client?.boosting_budget ?? ''} className={input} />
      </label>
      <label className={label}>
        Naam op de bank (als die afwijkt)
        <input name="bank_name" maxLength={120} placeholder="bv. V.S.A. Foods" defaultValue={client?.bank_name ?? ''} className={input} />
      </label>
    </div>
  )
}

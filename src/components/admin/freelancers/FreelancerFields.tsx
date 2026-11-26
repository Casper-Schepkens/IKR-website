'use client'

import { LIMITS, type Freelancer } from '@/lib/admin/freelancers/types'
import { input, label } from '../ui'
import { ScoreOptions } from './shared'

const grid = 'grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3'

export type ClientOption = { id: string; name: string }

/** Alle velden van een freelancer (nieuwe freelancer en de fiche). Geen voorbeeldwaarden: leeg is leeg. */
export function FreelancerFields({ freelancer: f, clients }: { freelancer?: Freelancer; clients: ClientOption[] }) {
  const linked = new Set(f?.client_ids ?? [])
  return (
    <div className="flex flex-col gap-3">
      <div className={grid}>
        <label className={label}>
          Naam
          <input name="name" required maxLength={LIMITS.name} defaultValue={f?.name} autoComplete="off" className={input} />
          <span className="text-xs font-normal">Voor- en achternaam, eventueel handelsnaam.</span>
        </label>
        <label className={label}>
          E-mail
          <input name="email" type="email" maxLength={LIMITS.email} defaultValue={f?.email ?? ''} autoComplete="off" className={input} />
        </label>
        <label className={label}>
          Telefoon
          <input name="phone" type="tel" maxLength={LIMITS.phone} defaultValue={f?.phone ?? ''} autoComplete="off" className={input} />
        </label>
        <label className={label}>
          Score
          <select name="score" defaultValue={f?.score ?? ''} className={input}>
            <ScoreOptions />
          </select>
        </label>
      </div>
      <label className={label}>
        Link (portfolio)
        <input name="portfolio_url" type="text" inputMode="url" maxLength={LIMITS.portfolio_url} defaultValue={f?.portfolio_url ?? ''} autoComplete="off" className={input} />
      </label>
      <label className={label}>
        Klanten / opdrachten
        <textarea name="assignments" rows={2} maxLength={LIMITS.assignments} defaultValue={f?.assignments ?? ''} className={input} />
      </label>
      {clients.length > 0 && (
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1.5 text-[13px] font-semibold text-[#5E5670]">Gekoppeld aan klanten in het dashboard</legend>
          <div className="flex flex-wrap gap-2">
            {clients.map((c) => (
              <label key={c.id} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full bg-ikr-cream px-3 text-sm has-[:checked]:bg-ikr-navy has-[:checked]:text-ikr-cream-light">
                <input type="checkbox" name="client_ids" value={c.id} defaultChecked={linked.has(c.id)} className="accent-ikr-cyan" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className={label}>
        Bron en opmerking
        <textarea name="notes" rows={3} maxLength={LIMITS.notes} defaultValue={f?.notes ?? ''} className={input} />
      </label>
    </div>
  )
}

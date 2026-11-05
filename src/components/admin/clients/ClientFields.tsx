import type { Client } from '@/lib/admin/clients/types'
import { input, label } from '../ui'

/** Velden van een klant (nieuw en aanpassen). */
export function ClientFields({ client, compact }: { client?: Client; compact?: boolean }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
      <label className={label}>
        {compact ? <span className="sr-only">Klant</span> : 'Klant'}
        <input name="name" required maxLength={200} defaultValue={client?.name} className={input} />
      </label>
      <label className={label}>
        {compact ? <span className="sr-only">Freelancer</span> : 'Freelancer'}
        <input name="freelancer" maxLength={200} defaultValue={client?.freelancer ?? ''} placeholder="Wie staat erop?" className={input} />
      </label>
      <label className={label}>
        {compact ? <span className="sr-only">Contract tot</span> : 'Contract loopt tot'}
        <input name="contract_end" type="date" defaultValue={client?.contract_end ?? ''} className={input} />
      </label>
    </div>
  )
}

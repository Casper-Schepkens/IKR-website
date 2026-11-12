import { SOP_CATEGORIES, type Sop } from '@/lib/admin/sops/types'
import { input, label } from '../ui'
import { cn } from '@/utilities/ui'

export function SopFields({ sop, category }: { sop?: Sop; category?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <label className={label}>
          Titel
          <input name="title" required maxLength={200} defaultValue={sop?.title} placeholder="bv. Briefing 2 dagen voor de draaidag" className={input} />
        </label>
        <label className={label}>
          Categorie
          <select name="category" defaultValue={sop?.category ?? category ?? 'overig'} className={input}>
            {Object.entries(SOP_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={label}>
        Afspraak
        <textarea name="body" rows={4} maxLength={20000} defaultValue={sop?.body} placeholder="Wat spreken we af, en eventueel waarom of uitzonderingen" className={cn(input, 'resize-y')} />
      </label>
    </div>
  )
}

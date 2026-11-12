'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { decideSopAction } from '@/app/admin/sops-actions'
import { SOP_CATEGORIES, type Sop } from '@/lib/admin/sops/types'
import { Card, muted, Pill, Spinner, Title } from '../ui'
import { cn } from '@/utilities/ui'
import { refreshNotifications } from '../useNotifications'

/** SOP-voorstellen (bv. door Grokbot uit de weekly): vinkje = afgesproken, kruisje = weg. */
export function SopProposals({ proposals, compact = false }: { proposals: Sop[]; compact?: boolean }) {
  if (!proposals.length) return null
  return (
    <Card className="flex flex-col gap-3 border-2 border-dashed border-[#0B9DB8]/50">
      <div>
        <Title className="m-0 text-2xl">SOP-voorstel{proposals.length > 1 ? 'len' : ''}</Title>
        <p className={cn('m-0 text-sm', muted)}>{compact ? 'Uit de weekly. Vinkje = afgesproken, kruisje = weg.' : 'Vinkje = afgesproken (komt bij de SOP’s), kruisje = weg.'}</p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {proposals.map((p) => (
          <Proposal key={p.id} sop={p} />
        ))}
      </ul>
    </Card>
  )
}

function Proposal({ sop: p }: { sop: Sop }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const decide = (approve: boolean) =>
    start(async () => {
      const res = await decideSopAction(p.id, approve)
      if (!res.ok) setError(res.error)
      router.refresh()
      refreshNotifications()
    })
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-ikr-cream-light p-3.5">
      <div className="min-w-0 flex-1">
        <p className="m-0 font-semibold">{p.title}</p>
        <p className="m-0 text-sm whitespace-pre-line">{p.body}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <Pill tone="light">{SOP_CATEGORIES[p.category]}</Pill>
          {p.source && <span className={muted}>{p.source_url ? <a href={p.source_url} target="_blank" rel="noreferrer" className="underline">{p.source}</a> : p.source}</span>}
          {p.quote && <span className={cn('italic', muted)}>“{p.quote}”</span>}
        </div>
        {error && (
          <p role="alert" className="m-0 mt-1 text-xs text-[#A3470F]">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {pending && <Spinner />}
        <button type="button" disabled={pending} onClick={() => decide(true)} aria-label={`Goedkeuren: ${p.title}`} title="Goedkeuren" className="ikr-btn grid size-10 place-items-center rounded-full bg-[#DDF2DF] text-lg font-bold text-[#1E5B27] disabled:opacity-60">
          ✓
        </button>
        <button type="button" disabled={pending} onClick={() => decide(false)} aria-label={`Afwijzen: ${p.title}`} title="Afwijzen" className="ikr-btn grid size-10 place-items-center rounded-full bg-[#F8D3D0] text-lg font-bold text-[#8E1B12] disabled:opacity-60">
          ✕
        </button>
      </div>
    </li>
  )
}

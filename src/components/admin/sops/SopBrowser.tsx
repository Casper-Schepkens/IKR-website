'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSopAction, setSopStatusAction, updateSopAction } from '@/app/admin/sops-actions'
import { CATEGORY_KEYS, searchSops, SOP_CATEGORIES, type Sop, type SopCategory } from '@/lib/admin/sops/types'
import { FormAction } from '../FormAction'
import { buttonClass, Card, Empty, input, muted, Pill, Spinner, Title } from '../ui'
import { SopFields } from './SopFields'
import { cn } from '@/utilities/ui'

/** Zoeken en bladeren per categorie. Verouderde SOP's enkel op vraag. */
export function SopBrowser({ sops }: { sops: Sop[] }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<SopCategory | null>(null)
  const [old, setOld] = useState(false)
  const current = sops.filter((s) => s.status !== 'voorstel')
  const hits = useMemo(() => searchSops(current, q, { category: cat, status: old ? 'alle' : 'afgesproken' }), [current, q, cat, old])
  const counts = Object.fromEntries(CATEGORY_KEYS.map((k) => [k, current.filter((s) => s.category === k && (old || s.status === 'afgesproken')).length]))
  const grouped = CATEGORY_KEYS.map((k) => ({ k, items: hits.filter((s) => s.category === k) })).filter((g) => g.items.length)
  const oldCount = current.filter((s) => s.status === 'verouderd').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek in de SOP's (bv. revisie, draaidag, freelancer)…" aria-label="Zoek in de SOP's" className={cn(input, 'text-base')} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categorie">
          <button type="button" aria-pressed={!cat} onClick={() => setCat(null)} className={buttonClass(!cat ? 'navy' : 'light', true)}>
            Alles
          </button>
          {CATEGORY_KEYS.filter((k) => counts[k]).map((k) => (
            <button key={k} type="button" aria-pressed={cat === k} onClick={() => setCat(cat === k ? null : k)} className={buttonClass(cat === k ? 'navy' : 'light', true)}>
              {SOP_CATEGORIES[k]} <span className="opacity-60">{counts[k]}</span>
            </button>
          ))}
        </div>
        {oldCount > 0 && (
          <label className={cn('flex items-center gap-2 text-xs', muted)}>
            <input type="checkbox" checked={old} onChange={(e) => setOld(e.target.checked)} className="accent-ikr-navy" /> Ook verouderde tonen ({oldCount})
          </label>
        )}
      </div>
      {!grouped.length && <Empty>{q || cat ? 'Niets gevonden.' : 'Nog geen SOP’s. Voeg er hieronder een toe.'}</Empty>}
      {grouped.map((g) => (
        <Card key={g.k} className="flex flex-col gap-2 p-4">
          <Title className="m-0 text-xl">{SOP_CATEGORIES[g.k]}</Title>
          <ul className="m-0 flex list-none flex-col p-0">
            {g.items.map((s) => (
              <SopItem key={s.id} sop={s} open={Boolean(q)} />
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}

function SopItem({ sop: s, open: openInitially }: { sop: Sop; open: boolean }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const shown = open || openInitially
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      router.refresh()
    })
  const old = s.status === 'verouderd'
  return (
    <li className={cn('border-t border-[#E6DFD2] py-2.5 first:border-t-0', old && 'opacity-60')}>
      <button type="button" onClick={() => setOpen(!shown)} aria-expanded={shown} className="flex w-full items-start gap-2 text-left">
        <span aria-hidden className={cn('mt-1 inline-block text-xs transition-transform', shown && 'rotate-90')}>
          ▸
        </span>
        <span className="font-semibold">{s.title}</span>
        {old && <Pill tone="neutral">verouderd</Pill>}
      </button>
      {shown && (
        <div className="mt-2 ml-5 flex flex-col gap-2">
          {editing ? (
            <>
              <FormAction action={updateSopAction.bind(null, s.id)} submitLabel="Bewaar" pendingText="Bewaren…" onSuccess={() => setEditing(false)}>
                <SopFields sop={s} />
              </FormAction>
              <button type="button" onClick={() => setEditing(false)} className={cn(buttonClass('soft', true), 'self-start')}>
                Annuleer
              </button>
            </>
          ) : (
            <>
              {s.body && <p className="m-0 text-sm leading-relaxed whitespace-pre-line">{s.body}</p>}
              <p className={cn('m-0 text-xs', muted)}>
                {s.source ? (s.source_url ? <a href={s.source_url} target="_blank" rel="noreferrer" className="underline">{s.source}</a> : s.source) : 'Toegevoegd'}
                {' · '}
                {new Date(s.created_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                {s.created_via === 'grokbot' ? ' · via Grok Bot' : s.created_by ? ` · ${s.created_by.split('@')[0]}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => setEditing(true)} className={buttonClass('soft', true)}>
                  Aanpassen
                </button>
                <button type="button" disabled={pending} onClick={() => run(() => setSopStatusAction(s.id, old ? 'afgesproken' : 'verouderd'))} className={buttonClass('soft', true)}>
                  {old ? 'Terug geldig' : 'Verouderd'}
                </button>
                {confirm ? (
                  <>
                    <button type="button" disabled={pending} onClick={() => run(() => deleteSopAction(s.id))} className="ikr-btn inline-flex min-h-9 items-center rounded-full bg-[#B42318] px-3 text-xs font-semibold text-white">
                      Ja, verwijder
                    </button>
                    <button type="button" onClick={() => setConfirm(false)} className={buttonClass('soft', true)}>
                      Annuleer
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirm(true)} className="ikr-btn inline-flex min-h-9 items-center rounded-full bg-[#F8D3D0] px-3 text-xs font-semibold text-[#8E1B12]">
                    Verwijder
                  </button>
                )}
                {pending && <Spinner />}
                {error && (
                  <span role="alert" className="text-xs text-[#A3470F]">
                    {error}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}

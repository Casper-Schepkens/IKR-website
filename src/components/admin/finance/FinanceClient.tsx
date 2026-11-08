'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCategoryAction, syncFinanceAction } from '@/app/admin/finance-actions'
import { CATEGORY_LABELS, IN_CATEGORIES, OUT_CATEGORIES, type Tx } from '@/lib/admin/finance/core'
import { buttonClass, input, muted, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

const eur = (n: number) => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)

export function SyncFinanceButton() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()
  return (
    <span className="inline-flex items-center gap-2">
      {msg && <span className="text-xs">{msg}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await syncFinanceAction()
            const d = res.ok ? (res.data as { nieuw: number } | undefined) : null
            setMsg(res.ok ? `${d?.nieuw ?? 0} nieuwe transacties` : res.error)
            router.refresh()
          })
        }
        className={buttonClass('light', true)}
      >
        {pending && <Spinner />} Odoo bijwerken
      </button>
    </span>
  )
}

/** Transacties van de periode; elke transactie kan (her)ingedeeld worden, eventueel als regel voor de toekomst. */
export function TxList({ txs, clients, defaultFilter }: { txs: Tx[]; clients: { id: string; name: string }[]; defaultFilter: string }) {
  const [filter, setFilter] = useState(defaultFilter)
  const list = useMemo(
    () => txs.filter((t) => filter === 'alles' || t.category === filter).sort((a, b) => b.date.localeCompare(a.date) || a.amount - b.amount),
    [txs, filter],
  )
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of txs) m.set(t.category, (m.get(t.category) ?? 0) + 1)
    return m
  }, [txs])
  return (
    <div className="flex flex-col gap-2">
      <label className="flex min-w-0 items-center gap-2 text-sm">
        Toon
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(input, 'min-h-9 w-auto min-w-0 max-w-full py-1')}>
          <option value="alles">Alles ({txs.length})</option>
          {[...counts.entries()].map(([c, n]) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] ?? c} ({n})
            </option>
          ))}
        </select>
      </label>
      {!list.length && <p className={cn('m-0 text-sm', muted)}>Geen transacties.</p>}
      <ul className="m-0 flex list-none flex-col p-0">
        {list.slice(0, 200).map((t) => (
          <TxRow key={t.odoo_id} tx={t} clients={clients} />
        ))}
      </ul>
    </div>
  )
}

function TxRow({ tx, clients }: { tx: Tx; clients: { id: string; name: string }[] }) {
  const [category, setCategory] = useState(tx.category)
  const [clientId, setClientId] = useState(tx.client_id ?? '')
  const [rule, setRule] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const changed = category !== tx.category || (category === 'klant' && clientId !== (tx.client_id ?? ''))
  const options = tx.amount > 0 ? IN_CATEGORIES : OUT_CATEGORIES
  return (
    <li className="grid grid-cols-1 gap-2 border-t border-[#E6DFD2] py-2.5 text-sm sm:grid-cols-[90px_minmax(0,1fr)_110px_minmax(0,260px)]">
      <span className={muted}>{tx.date}</span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">{tx.counterparty || tx.description.split(' Betaling')[0]}</span>
        <span className={cn('block truncate text-xs', muted)} title={tx.description}>
          {tx.description}
        </span>
      </span>
      <span className={cn('tabular-nums sm:text-right', tx.amount > 0 ? 'text-[#0B7F93]' : '')}>{eur(tx.amount)}</span>
      <span className="flex flex-col gap-1">
        <span className="flex gap-1">
          <select aria-label="Categorie" value={category} onChange={(e) => setCategory(e.target.value)} className={cn(input, 'min-h-9 min-w-0 py-1 text-xs', category === 'onbekend' && 'ring-2 ring-[#EB6834]')}>
            {category === 'onbekend' && <option value="onbekend">Nog in te delen…</option>}
            {Object.entries(options).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {category === 'klant' && (
            <select aria-label="Klant" value={clientId} onChange={(e) => setClientId(e.target.value)} className={cn(input, 'min-h-9 min-w-0 py-1 text-xs')}>
              <option value="">Klant…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </span>
        {changed && (
          <span className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={rule} onChange={(e) => setRule(e.target.checked)} className="accent-ikr-navy" /> voortaan altijd zo
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null)
                  const res = await setCategoryAction(tx.odoo_id, category, clientId || null, rule)
                  if (!res.ok) setError(res.error)
                  router.refresh()
                })
              }
              className={buttonClass('navy', true)}
            >
              {pending && <Spinner />} Bewaar
            </button>
          </span>
        )}
        {tx.manual && !changed && <span className={cn('text-[11px]', muted)}>handmatig ingedeeld</span>}
        {error && (
          <span role="alert" className="text-xs text-[#A3470F]">
            {error}
          </span>
        )}
      </span>
    </li>
  )
}

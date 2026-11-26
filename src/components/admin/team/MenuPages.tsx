'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveHiddenPagesAction } from '@/app/admin/team-actions'
import { defaultHidden, MENU_PAGES } from '@/lib/admin/team/nav-core'
import { Card, muted, Spinner, Title } from '../ui'
import { cn } from '@/utilities/ui'

/**
 * Instellingen → Mijn menu: welke pagina's in je zijbalk staan. Enkel voor jezelf; een verborgen pagina kan je
 * altijd nog openen (via Ctrl+K of een link). Standaard staan de sales-pagina's enkel bij Casper.
 */
export function MenuPages({ hidden: initial, salesOwner }: { hidden: string[]; salesOwner: boolean }) {
  const [hidden, setHidden] = useState(initial)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const save = (next: string[] | null) => {
    setHidden(next ?? defaultHidden(salesOwner))
    setError(null)
    start(async () => {
      const res = await saveHiddenPagesAction(next)
      if (!res.ok) setError(res.error)
      router.refresh()
    })
  }
  const toggle = (href: string) => save(hidden.includes(href) ? hidden.filter((h) => h !== href) : [...hidden, href])
  const sales = MENU_PAGES.filter((p) => 'sales' in p && p.sales)
  const rest = MENU_PAGES.filter((p) => !('sales' in p && p.sales))
  const box = (p: (typeof MENU_PAGES)[number]) => (
    <label key={p.href} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm hover:bg-adm-soft">
      <input type="checkbox" className="size-5 accent-adm-fg" checked={!hidden.includes(p.href)} onChange={() => toggle(p.href)} disabled={pending} />
      {p.label}
    </label>
  )
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Title>Mijn menu</Title>
        {pending && <Spinner />}
      </div>
      <p className={cn('m-0 text-sm', muted)}>
        Kies welke pagina&apos;s in je zijbalk staan. Enkel voor jou. Een pagina die je verbergt, kan je altijd nog openen met Ctrl+K. Met sales-pagina&apos;s in je menu krijg je ook hun meldingen.
      </p>
      <div className="grid gap-x-6 sm:grid-cols-2">
        <section>
          <p className="m-0 mb-1 text-xs font-semibold tracking-wide uppercase">Sales</p>
          {sales.map(box)}
        </section>
        <section>
          <p className="m-0 mb-1 text-xs font-semibold tracking-wide uppercase">Team</p>
          {rest.map(box)}
        </section>
      </div>
      <button type="button" onClick={() => save(null)} disabled={pending} className="self-start text-sm font-semibold underline">
        Terug naar de standaard
      </button>
      {error && (
        <p role="alert" className="m-0 text-sm text-adm-warn">
          {error}
        </p>
      )}
    </Card>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { revertChangeAction } from '@/app/admin/production-actions'
import { buttonClass, Card, Empty, muted, Spinner, Title } from '../ui'
import { cn } from '@/utilities/ui'

export type ChangeView = { id: string; at: string; by: string; summary: string; rows: number; reverted: string | null; isRevert: boolean }

const who = (by: string) => (by === 'grokbot' ? 'Grok Bot' : by.split('@')[0].replace(/^./, (c) => c.toUpperCase()))

/** Wijzigingslog van Productie: wie, wat, wanneer, met terugdraaien. */
export function ChangeLog({ changes }: { changes: ChangeView[] }) {
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  return (
    <Card className="flex flex-col gap-2">
      <details>
        <summary className="cursor-pointer">
          <Title as="h2" className="m-0 inline text-2xl">
            Wijzigingen
          </Title>
          <span className={cn('ml-2 text-sm', muted)}>wie, wat, wanneer · terugdraaien</span>
        </summary>
        {!changes.length ? (
          <Empty>Nog geen wijzigingen.</Empty>
        ) : (
          <ul className="m-0 mt-3 flex list-none flex-col p-0">
            {changes.map((c) => (
              <li key={c.id} className={cn('flex flex-wrap items-center gap-2 border-t border-[#E6DFD2] py-2 text-sm first:border-t-0', c.reverted && 'text-[#6F6A76]')}>
                <span className={cn('w-36 shrink-0 text-xs', muted)}>
                  {new Date(c.at).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="w-20 shrink-0 text-xs font-semibold">{who(c.by)}</span>
                <span className={cn('min-w-0 flex-1', c.reverted && 'line-through')}>{c.summary}</span>
                {c.reverted ? (
                  <span className={cn('text-xs', muted)}>teruggedraaid</span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`"${c.summary}" terugdraaien?`)) return
                      setBusy(c.id)
                      start(async () => {
                        setError(null)
                        const res = await revertChangeAction(c.id)
                        if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
                        setBusy(null)
                        router.refresh()
                      })
                    }}
                    className={cn(buttonClass('soft', true), 'min-h-8')}
                  >
                    {busy === c.id && <Spinner />} Terugdraaien
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="m-0 mt-2 text-sm text-[#A3470F]">
            {error}
          </p>
        )}
      </details>
    </Card>
  )
}

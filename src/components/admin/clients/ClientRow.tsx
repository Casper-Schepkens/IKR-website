'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteClientAction, updateClientAction } from '@/app/admin/clients-actions'
import { contractTone, type Client } from '@/lib/admin/clients/types'
import { fmtDate } from '@/lib/admin/format'
import { FormAction } from '../FormAction'
import { buttonClass, muted, Pill, Spinner } from '../ui'
import { ClientFields } from './ClientFields'
import { cn } from '@/utilities/ui'

const RED = 'bg-[#F8D3D0] text-[#8E1B12]'

function DaysPill({ days }: { days: number | null }) {
  const tone = contractTone(days)
  if (days === null) return <span className={muted}>—</span>
  const text = days < 0 ? `verlopen (${-days} d)` : days === 0 ? 'vandaag' : days < 60 ? `${days} dagen` : `${Math.round(days / 30)} maanden`
  return (
    <Pill tone={tone === 'orange' ? 'orange' : tone === 'green' ? 'green' : 'neutral'} className={tone === 'red' ? RED : undefined}>
      {text}
    </Pill>
  )
}

export function ClientRow({ client: c, days }: { client: Client; days: number | null }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (editing)
    return (
      <tr className="border-t border-[#E6DFD2] bg-ikr-cream/50">
        <td colSpan={5} className="px-6 py-3">
          <FormAction action={updateClientAction.bind(null, c.id)} submitLabel="Bewaar" pendingText="Bewaren…" onSuccess={() => setEditing(false)}>
            <ClientFields client={c} />
          </FormAction>
          <button type="button" onClick={() => setEditing(false)} className={cn(buttonClass('soft', true), 'mt-2')}>
            Annuleer
          </button>
        </td>
      </tr>
    )

  return (
    <tr className="border-t border-[#E6DFD2] hover:bg-ikr-cream/60">
      <td className="px-6 py-3 font-bold text-ikr-navy">{c.name}</td>
      <td className="px-3 py-3">{c.freelancer ?? <span className={muted}>—</span>}</td>
      <td className="px-3 py-3 whitespace-nowrap">{c.contract_end ? fmtDate(c.contract_end, { day: 'numeric', month: 'short', year: 'numeric' }) : <span className={muted}>—</span>}</td>
      <td className="px-3 py-3 whitespace-nowrap">
        <DaysPill days={days} />
      </td>
      <td className="px-6 py-3 text-right whitespace-nowrap">
        {pending && <Spinner />}
        {confirmDelete ? (
          <span className="inline-flex gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteClientAction(c.id)
                  if (!res.ok) setError(res.error)
                  router.refresh()
                })
              }
              className="ikr-btn inline-flex min-h-9 items-center rounded-full bg-[#B42318] px-3 text-xs font-semibold text-white"
            >
              Ja, verwijder
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClass('soft', true)}>
              Annuleer
            </button>
          </span>
        ) : (
          <span className="inline-flex gap-1.5">
            <button type="button" onClick={() => setEditing(true)} className={buttonClass('soft', true)}>
              Aanpassen
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} aria-label={`Verwijder ${c.name}`} className={cn('ikr-btn inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold', RED)}>
              Verwijder
            </button>
          </span>
        )}
        {error && (
          <span role="alert" className="block text-xs text-[#A3470F]">
            {error}
          </span>
        )}
      </td>
    </tr>
  )
}

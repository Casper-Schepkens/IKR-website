'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { applyContractAction, deleteClientAction, deriveContractAction, dismissContractAction, updateClientAction } from '@/app/admin/clients-actions'
import { contractTone, type Client } from '@/lib/admin/clients/types'
import type { ContractProposal } from '@/lib/admin/clients/contract'
import { fmtDate } from '@/lib/admin/format'
import { FormAction } from '../FormAction'
import { buttonClass, muted, Pill, Spinner } from '../ui'
import { ClientFields } from './ClientFields'
import { cn } from '@/utilities/ui'

const RED = 'bg-[#F8D3D0] text-[#8E1B12]'
const eur = (n: number | null | undefined) => (n == null ? null : new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n))
const day = (d: string | null | undefined) => (d ? fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' }) : null)

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

/**
 * Eén klant: in de lijst enkel freelancer, contract en hoe lang nog. Klikken toont alle gegevens
 * (bedragen, contract) met aanpassen, verwijderen en "Leid af uit het contract".
 */
export function ClientRow({ client: c, days, proposal }: { client: Client; days: number | null; proposal: ContractProposal | null }) {
  // "Ga naar klant X" (?klant=id): openklappen en ernaartoe scrollen.
  const focus = useSearchParams().get('klant') === c.id
  const rowRef = useRef<HTMLTableRowElement>(null)
  // Zelf open- of dichtgeklikt gaat voor; anders open als er naartoe gesprongen werd.
  const [toggled, setOpen] = useState<boolean | null>(null)
  const open = toggled ?? focus
  useEffect(() => {
    if (focus) rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])
  const busy = proposal?.status === 'pending' || proposal?.status === 'running'
  const detailId = `klant-${c.id}`
  return (
    <>
      <tr ref={rowRef} className={cn('scroll-mt-24 border-t border-[#E6DFD2] hover:bg-ikr-cream/60', open && 'bg-ikr-cream/50')}>
        <td className="px-6 py-3">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={detailId} className="flex items-center gap-2 text-left font-bold text-ikr-navy">
            <span aria-hidden className={cn('inline-block text-xs transition-transform', open && 'rotate-90')}>
              ▸
            </span>
            {c.name}
            {(busy || (proposal?.status === 'done' && proposal.changes.length > 0)) && (
              <Pill tone="teal" className="ml-1">
                {busy ? 'zoekt contract…' : 'voorstel'}
              </Pill>
            )}
          </button>
        </td>
        <td className="px-3 py-3">{c.freelancer ?? <span className={muted}>—</span>}</td>
        {c.contract_indefinite ? (
          // Onbepaalde duur: geen datum en geen "Nog x dagen"; nooit (bijna) verlopen.
          <td colSpan={2} className="px-3 py-3 whitespace-nowrap">
            <Pill tone="teal">Onbepaalde duur</Pill>
          </td>
        ) : (
          <>
            <td className="px-3 py-3 whitespace-nowrap">{day(c.contract_end) ?? <span className={muted}>—</span>}</td>
            <td className="px-3 py-3 whitespace-nowrap">
              <DaysPill days={days} />
            </td>
          </>
        )}
      </tr>
      {open && (
        <tr id={detailId} className="bg-ikr-cream/50">
          <td colSpan={4} className="px-6 pt-1 pb-5">
            <ClientDetail client={c} proposal={proposal} />
          </td>
        </tr>
      )}
    </>
  )
}

function Fact({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col">
      <span className={cn('text-xs', muted)}>{label}</span>
      <span className="font-semibold tabular-nums">{value ?? <span className={muted}>niet ingevuld</span>}</span>
      {hint && <span className={cn('text-xs', muted)}>{hint}</span>}
    </div>
  )
}

function ClientDetail({ client: c, proposal }: { client: Client; proposal: ContractProposal | null }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      router.refresh()
    })
  const over = c.monthly_fee != null ? c.monthly_fee - (c.freelancer_cost ?? 0) - (c.boosting_budget ?? 0) : null
  const busy = proposal?.status === 'pending' || proposal?.status === 'running'

  if (editing)
    return (
      <div className="flex flex-col gap-2">
        <FormAction action={updateClientAction.bind(null, c.id)} submitLabel="Bewaar" pendingText="Bewaren…" onSuccess={() => setEditing(false)}>
          <ClientFields client={c} />
        </FormAction>
        <button type="button" onClick={() => setEditing(false)} className={cn(buttonClass('soft', true), 'self-start')}>
          Annuleer
        </button>
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 rounded-2xl bg-white/60 p-4">
        <Fact label="Klant betaalt / maand" value={eur(c.monthly_fee)} hint="excl. btw" />
        <Fact label="Freelancer / maand" value={eur(c.freelancer_cost)} />
        <Fact label="Boosting / maand" value={eur(c.boosting_budget)} />
        <Fact label="Blijft over / maand" value={eur(over)} hint={over != null && c.freelancer_cost == null ? 'zonder freelancer' : undefined} />
        <Fact label="Contract start" value={day(c.contract_start)} />
        <Fact label="Contract tot" value={c.contract_indefinite ? 'onbepaalde duur' : day(c.contract_end)} />
        <Fact label="Naam op de bank" value={c.bank_name || null} hint={c.bank_name ? undefined : 'zelfde als de klant'} />
        <Fact
          label="Contract"
          value={
            c.contract_url ? (
              <a href={c.contract_url} target="_blank" rel="noreferrer" className="underline">
                Openen in Drive
              </a>
            ) : null
          }
        />
      </div>

      <ProposalPanel client={c} proposal={proposal} pending={pending} run={run} />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || busy} onClick={() => run(() => deriveContractAction(c.id))} className={buttonClass('navy', true)}>
          {busy ? 'Agent zoekt het contract…' : 'Leid af uit het contract'}
        </button>
        <button type="button" onClick={() => setEditing(true)} className={buttonClass('soft', true)}>
          Aanpassen
        </button>
        {confirmDelete ? (
          <span className="inline-flex gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteClientAction(c.id))}
              className="ikr-btn inline-flex min-h-9 items-center rounded-full bg-[#B42318] px-3 text-xs font-semibold text-white"
            >
              Ja, verwijder {c.name}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClass('soft', true)}>
              Annuleer
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className={cn('ikr-btn inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold', RED)}>
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
    </div>
  )
}

function ProposalPanel({
  client: c,
  proposal: p,
  pending,
  run,
}: {
  client: Client
  proposal: ContractProposal | null
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
}) {
  if (!p) return null
  const docs = p.docs.length ? (
    <p className={cn('m-0 text-xs', muted)}>
      Gelezen:{' '}
      {p.docs.map((d, i) => (
        <span key={d.id}>
          {i > 0 && ', '}
          <a href={d.link} target="_blank" rel="noreferrer" className="underline">
            {d.naam}
          </a>
        </span>
      ))}
    </p>
  ) : (
    <p className={cn('m-0 text-xs', muted)}>Geen contracten gevonden in de IKR-Drive voor &quot;{c.name}&quot;.</p>
  )
  return (
    <section aria-label="Voorstel uit het contract" className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-[#0B9DB8]/50 bg-white/70 p-4">
      <p className="m-0 text-sm font-bold">Uit het contract</p>
      {(p.status === 'pending' || p.status === 'running') && <p className="m-0 text-sm">De agent leest de contracten… dit verschijnt hier vanzelf.</p>}
      {(p.status === 'error' || p.status === 'waiting_limit') && <p className="m-0 text-sm text-[#A3470F]">Lukte niet: {p.error ?? 'onbekende fout'}. Probeer opnieuw.</p>}
      {p.status === 'done' && p.output && (
        <>
          {p.changes.length ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
              {p.changes.map((ch) => (
                <li key={ch.field}>
                  <span className="font-semibold">{ch.label}:</span> <span className={cn('line-through', muted)}>{ch.from}</span> → <span className="font-semibold">{ch.to}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm">{p.output.gevonden ? 'Alles klopt al met het contract.' : 'Geen bruikbaar contract gevonden.'}</p>
          )}
          <p className="m-0 text-sm">{p.output.uitleg}</p>
        </>
      )}
      {docs}
      {p.status !== 'pending' && p.status !== 'running' && (
        <div className="flex gap-2">
          {p.status === 'done' && p.changes.length > 0 && (
            <button type="button" disabled={pending} onClick={() => run(() => applyContractAction(c.id))} className={buttonClass('navy', true)}>
              Overnemen
            </button>
          )}
          <button type="button" disabled={pending} onClick={() => run(() => dismissContractAction(c.id))} className={buttonClass('soft', true)}>
            {p.status === 'done' && p.changes.length > 0 ? 'Negeren' : 'Sluiten'}
          </button>
        </div>
      )}
    </section>
  )
}

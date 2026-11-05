'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { clearPinsAction, createPinAction, deletePinAction, setPinPinnedAction } from '@/app/admin/weekly-actions'
import { linkSource, PIN_KIND_LABELS, PIN_KINDS, type Pin, type PinKind } from '@/lib/admin/weekly/pins'
import { TEAM, type Owner } from '@/lib/admin/weekly/types'
import { fmtDate } from '@/lib/admin/format'
import { FormAction } from '../FormAction'
import { Icon, input, label, muted, Spinner, Title } from '../ui'
import { cn } from '@/utilities/ui'

/** Post-it-kleur per soort. */
const NOTE: Record<PinKind, string> = {
  tekst: 'bg-[#FFF1A8]',
  link: 'bg-[#CFEFF7]',
  document: 'bg-[#D9F2D0]',
  bespreekpunt: 'bg-[#FAD4E0]',
}
const TILT = ['-rotate-[1.2deg]', 'rotate-[0.8deg]', '-rotate-[0.4deg]', 'rotate-[1.4deg]', 'rotate-0', '-rotate-[0.9deg]']
const small = 'ikr-btn inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold disabled:opacity-60'
const nameOf = (o: Owner) => TEAM.find((t) => t.key === o)?.name ?? o

/**
 * Prikbord op de weekly: kaartjes die het hele team ziet. Bedoeld voor Grok Bot ("zet die link klaar"),
 * maar iedereen mag iets toevoegen. Blijft staan tot het tijdens de weekly leeggemaakt wordt;
 * vastgepinde kaartjes blijven ook dan.
 */
export function Prikbord({ pins, me }: { pins: Pin[]; me: Owner | null }) {
  const [adding, setAdding] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const loose = pins.filter((p) => !p.pinned).length

  const clear = () =>
    start(async () => {
      setError(null)
      const res = await clearPinsAction()
      if (!res.ok) setError(res.error)
      setConfirmClear(false)
      router.refresh()
    })

  return (
    <section aria-label="Prikbord" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Title className="m-0 flex items-center gap-2 text-2xl">
            <span aria-hidden="true">📌</span> Prikbord
          </Title>
          <p className={cn('m-0 text-sm', muted)}>
            Wat Grok Bot (of jij) klaarzet voor het hele team. Tijdens de weekly leegmaken; vastgepinde kaartjes blijven.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAdding((v) => !v)} className={cn(small, 'min-h-9 bg-ikr-navy px-3.5 text-ikr-cream-light')}>
            {adding ? 'Sluiten' : '+ Kaartje'}
          </button>
          {loose > 0 &&
            (confirmClear ? (
              <>
                <button type="button" disabled={pending} data-pending={pending} onClick={clear} className={cn(small, 'min-h-9 bg-[#B42318] px-3.5 text-white')}>
                  {pending && <Spinner />} Ja, {loose} {loose === 1 ? 'kaartje' : 'kaartjes'} weg
                </button>
                <button type="button" onClick={() => setConfirmClear(false)} className={cn(small, 'min-h-9 bg-ikr-cream-light px-3.5 text-ikr-navy')}>
                  Annuleer
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)} className={cn(small, 'min-h-9 bg-ikr-cream-light px-3.5 text-ikr-navy')}>
                Leegmaken
              </button>
            ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="m-0 text-sm text-[#A3470F]">
          {error}
        </p>
      )}

      {/* Kurk */}
      <div
        className="rounded-[28px] p-4 shadow-[inset_0_2px_10px_rgba(60,35,10,0.35)] sm:p-6"
        style={{
          backgroundColor: '#C49A6C',
          backgroundImage:
            'radial-gradient(rgba(90,55,20,0.28) 1px, transparent 1.5px), radial-gradient(rgba(255,235,200,0.22) 1px, transparent 1.5px)',
          backgroundSize: '9px 9px, 13px 13px',
          backgroundPosition: '0 0, 4px 6px',
        }}
      >
        {adding && (
          <div className="mb-5 rounded-2xl bg-ikr-cream-light p-4 shadow-md">
            <FormAction action={createPinAction} submitLabel="Op het prikbord" pendingText="Prikken…" resetOnSuccess onSuccess={() => setAdding(false)}>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                <label className={cn(label, 'sm:col-span-2')}>
                  Titel
                  <input name="title" required maxLength={200} className={input} autoFocus />
                </label>
                <label className={label}>
                  Voor
                  <select name="for" defaultValue="" className={input}>
                    <option value="">Iedereen</option>
                    {TEAM.map((t) => (
                      <option key={t.key} value={t.key}>
                        @{t.key}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  Soort
                  <select name="kind" defaultValue="" className={input}>
                    <option value="">Automatisch</option>
                    {PIN_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {PIN_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={cn(label, 'col-span-full')}>
                  Link (optioneel)
                  <input name="url" inputMode="url" placeholder="https://…" className={input} />
                </label>
                <label className={cn(label, 'col-span-full')}>
                  Tekst (optioneel)
                  <textarea name="body" rows={2} maxLength={4000} className={cn(input, 'py-2')} />
                </label>
              </div>
            </FormAction>
          </div>
        )}

        {pins.length ? (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 p-0">
            {pins.map((p, i) => (
              <PinNote key={p.id} pin={p} tilt={TILT[i % TILT.length]} me={me} />
            ))}
          </ul>
        ) : (
          <p className="m-0 rounded-2xl bg-[#FFF8E7]/90 p-4 text-sm text-[#5E4A2E]">
            Nog niets op het prikbord. Vraag Grok Bot bv. <em>&quot;zet de link van de content-kalender op het prikbord&quot;</em>.
          </p>
        )}
      </div>
    </section>
  )
}

function PinNote({ pin, tilt, me }: { pin: Pin; tilt: string; me: Owner | null }) {
  const [pending, start] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      router.refresh()
    })
  const source = pin.url ? linkSource(pin.url) : null
  const forMe = pin.for_owner !== null && pin.for_owner === me
  const by = pin.created_via === 'grokbot' ? 'Grok Bot' : (TEAM.find((t) => t.email === pin.created_by)?.name ?? pin.created_by?.split('@')[0] ?? '')

  return (
    <li
      className={cn(
        'relative flex flex-col gap-2 rounded-[4px] px-4 pt-6 pb-3 text-[#2B2340] shadow-[0_6px_14px_rgba(40,20,0,0.28)] transition-transform hover:rotate-0',
        NOTE[pin.kind],
        tilt,
        forMe && 'ring-2 ring-ikr-navy ring-offset-2 ring-offset-[#C49A6C]',
      )}
    >
      {/* Punaise */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -top-2 left-1/2 size-5 -translate-x-1/2 rounded-full shadow-[0_3px_4px_rgba(0,0,0,0.35),inset_-2px_-2px_3px_rgba(0,0,0,0.25)]',
          pin.pinned ? 'bg-ikr-navy' : 'bg-[#D64545]',
        )}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-wide uppercase opacity-70">
          {PIN_KIND_LABELS[pin.kind]}
          {pin.pinned && ' · vastgepind'}
        </span>
        {pin.for_owner && (
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', forMe ? 'bg-ikr-navy text-ikr-cream-light' : 'bg-white/70')}>
            @{pin.for_owner}
          </span>
        )}
      </div>
      <strong className="text-[15px] leading-snug">{pin.title}</strong>
      {pin.body && <p className="m-0 text-sm leading-snug whitespace-pre-line">{pin.body}</p>}
      {pin.url && source && (
        <a
          href={pin.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit max-w-full items-center gap-1.5 truncate rounded-full bg-white/75 px-2.5 py-1 text-xs font-semibold text-[#0B5F6E] no-underline hover:bg-white"
          title={pin.url}
        >
          <Icon.file size={13} /> {source.label} ↗
        </a>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-black/10 pt-2">
        <span className="basis-full text-[11px] opacity-70">
          {pin.created_via === 'grokbot' && <Icon.sparkle size={11} className="mr-0.5 inline" />}
          {by} · {fmtDate(pin.created_at)}
          {pin.for_owner && ` · voor ${nameOf(pin.for_owner)}`}
        </span>
        <span className="flex-1">{pending && <Spinner />}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setPinPinnedAction(pin.id, !pin.pinned))}
          aria-label={pin.pinned ? `Losmaken: ${pin.title}` : `Vastpinnen: ${pin.title}`}
          title={pin.pinned ? 'Losmaken (gaat weg bij leegmaken)' : 'Vastpinnen (blijft bij leegmaken)'}
          className={cn(small, 'bg-white/70 text-[#2B2340] hover:bg-white')}
        >
          {pin.pinned ? 'Losmaken' : 'Vastpinnen'}
        </button>
        {confirmDelete ? (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => deletePinAction(pin.id))} className={cn(small, 'bg-[#B42318] text-white')}>
              Ja, weg
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={cn(small, 'bg-white/70 text-[#2B2340]')}>
              Annuleer
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            aria-label={`Verwijderen: ${pin.title}`}
            title="Verwijderen"
            className={cn(small, 'bg-white/70 px-2 text-[#8E1B12] hover:bg-white')}
          >
            <Icon.close size={13} />
          </button>
        )}
      </div>
      {error && (
        <span role="alert" className="text-xs font-medium text-[#A3470F]">
          {error}
        </span>
      )}
    </li>
  )
}

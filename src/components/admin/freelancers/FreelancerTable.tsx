'use client'

import { useRef, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteFreelancerAction, updateFreelancerAction, updateFreelancerFieldAction } from '@/app/admin/freelancers-actions'
import { filterFreelancers, LIMITS, SCORE_LABELS, SCORES, type Freelancer, type InlineField, type Score } from '@/lib/admin/freelancers/types'
import { fmtDate } from '@/lib/admin/format'
import { FormAction } from '../FormAction'
import { buttonClass, Empty, Icon, input, muted, Spinner } from '../ui'
import { FreelancerFields, type ClientOption } from './FreelancerFields'
import { SCORE_CLASS, ScorePill } from './shared'
import { cn } from '@/utilities/ui'

const RED = 'bg-adm-red-bg text-adm-red'
const COLS = 7
type Filter = Score | 'geen' | ''

/** Freelancers met zoeken op naam en filter op score; elke cel is rechtstreeks aan te passen. */
export function FreelancerTable({ freelancers, clients }: { freelancers: Freelancer[]; clients: ClientOption[] }) {
  const [query, setQuery] = useState('')
  const [score, setScore] = useState<Filter>('')
  const shown = filterFreelancers(freelancers, query, score)
  const count = (s: Filter) => filterFreelancers(freelancers, '', s).length
  const chips: { value: Filter; label: string }[] = [{ value: '', label: 'Alle' }, ...SCORES.map((s) => ({ value: s, label: SCORE_LABELS[s] })), { value: 'geen', label: 'Geen score' }]

  if (!freelancers.length)
    return (
      <div className="p-6">
        <Empty>Nog geen freelancers. Voeg er hieronder een toe (of vraag het aan Grok Bot).</Empty>
      </div>
    )

  return (
    <>
      <div className="flex flex-col gap-3 px-4 pt-5 pb-3 sm:px-6">
        <label className="flex max-w-md flex-col gap-1.5 text-[13px] font-semibold text-adm-muted">
          Zoek op naam
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" className={input} />
        </label>
        <div role="group" aria-label="Filter op score" className="flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const active = score === c.value
            return (
              <button
                key={c.value || 'alle'}
                type="button"
                aria-pressed={active}
                onClick={() => setScore(c.value)}
                className={cn(
                  'ikr-btn inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
                  active ? 'bg-adm-inverse text-ikr-cream-light' : c.value && c.value !== 'geen' ? SCORE_CLASS[c.value] : 'bg-adm-soft text-adm-fg',
                )}
              >
                {c.label}
                <span className="tabular-nums opacity-70">{count(c.value)}</span>
              </button>
            )
          })}
        </div>
      </div>
      {!shown.length ? (
        <div className="px-4 pb-6 sm:px-6">
          <Empty>Geen freelancers gevonden met deze zoekopdracht of filter.</Empty>
        </div>
      ) : (
        <table className="ikr-stack w-full min-w-[1000px] border-collapse text-left text-sm">
          <thead>
            <tr className={cn('text-xs whitespace-nowrap', muted)}>
              <th scope="col" className="px-6 py-3 font-semibold">Naam</th>
              <th scope="col" className="px-3 py-3 font-semibold">E-mail</th>
              <th scope="col" className="px-3 py-3 font-semibold">Telefoon</th>
              <th scope="col" className="px-3 py-3 font-semibold">Score</th>
              <th scope="col" className="px-3 py-3 font-semibold">Klanten / opdrachten</th>
              <th scope="col" className="px-3 py-3 font-semibold">Link</th>
              <th scope="col" className="px-3 py-3 pr-6 font-semibold">Bron en opmerking</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((f) => (
              <FreelancerRow key={f.id} freelancer={f} clients={clients} />
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

/** Bewaart één veld en ververst daarna; geeft de fout terug als het niet lukte. */
function useFieldSave(id: string) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const save = (field: InlineField, value: string, onError: (msg: string) => void) =>
    start(async () => {
      const res = await updateFreelancerFieldAction(id, field, value)
      if (!res.ok) onError(res.error)
      router.refresh()
    })
  return { pending, save }
}

const safeHref = (url: string) => (/^https?:\/\//i.test(url) ? url : null)
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')

function FreelancerRow({ freelancer: f, clients }: { freelancer: Freelancer; clients: ClientOption[] }) {
  const [open, setOpen] = useState(false)
  const names = new Map(clients.map((c) => [c.id, c.name]))
  const linked = f.client_ids.filter((id) => names.has(id))
  const ficheId = `freelancer-${f.id}`
  return (
    <>
      <tr className={cn('border-t border-adm-line align-top hover:bg-adm-soft/60', open && 'bg-adm-soft/50')}>
        <InlineCell
          id={f.id}
          field="name"
          label="Naam"
          value={f.name}
          required
          className="min-w-[190px] pl-6 font-bold text-adm-fg"
          lead={
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={ficheId} aria-label={`Fiche van ${f.name} ${open ? 'sluiten' : 'openen'}`} className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-full text-xs hover:bg-adm-soft">
              <span aria-hidden className={cn('inline-block transition-transform', open && 'rotate-90')}>
                ▸
              </span>
            </button>
          }
        />
        <InlineCell id={f.id} field="email" label="E-mail" value={f.email} type="email" display={(v) => <a href={`mailto:${v}`} className="break-all underline">{v}</a>} />
        <InlineCell id={f.id} field="phone" label="Telefoon" value={f.phone} type="tel" className="whitespace-nowrap" display={(v) => <a href={`tel:${v.replace(/[^\d+]/g, '')}`} className="underline">{v}</a>} />
        <ScoreCell id={f.id} name={f.name} score={f.score} />
        <InlineCell
          id={f.id}
          field="assignments"
          label="Klanten / opdrachten"
          value={f.assignments}
          multiline
          className="min-w-[180px]"
          above={
            linked.length > 0 && (
              <span className="mb-1 flex flex-wrap gap-1">
                {linked.map((id) => (
                  <Link key={id} href={`/admin/klanten?klant=${id}`} className="rounded-full bg-adm-teal-bg px-2 py-0.5 text-xs font-semibold text-adm-teal no-underline hover:underline">
                    {names.get(id)}
                  </Link>
                ))}
              </span>
            )
          }
        />
        <InlineCell
          id={f.id}
          field="portfolio_url"
          label="Link"
          value={f.portfolio_url}
          inputMode="url"
          display={(v) => {
            const href = safeHref(v)
            return href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block max-w-[200px] truncate align-bottom underline" title={v}>
                {shortUrl(v)} <span aria-hidden>↗</span>
                <span className="sr-only"> (opent in een nieuw tabblad)</span>
              </a>
            ) : (
              <span className="break-all">{v}</span>
            )
          }}
        />
        <InlineCell id={f.id} field="notes" label="Bron en opmerking" value={f.notes} multiline className="min-w-[180px] pr-6" />
      </tr>
      {open && (
        <tr id={ficheId} className="bg-adm-soft/50">
          <td colSpan={COLS} className="px-6 pt-1 pb-5">
            <FreelancerFiche freelancer={f} clients={clients} onClose={() => setOpen(false)} />
          </td>
        </tr>
      )}
    </>
  )
}

/** Een cel die je aanklikt om ze aan te passen: Enter of uit het veld klikken bewaart, Escape annuleert. */
function InlineCell({
  id,
  field,
  label,
  value,
  multiline,
  required,
  type = 'text',
  inputMode,
  display,
  lead,
  above,
  className,
}: {
  id: string
  field: InlineField
  label: string
  value: string | null
  multiline?: boolean
  required?: boolean
  type?: 'text' | 'email' | 'tel'
  inputMode?: 'url'
  display?: (v: string) => ReactNode
  /** Vóór de waarde op dezelfde regel (bv. het pijltje van de fiche). */
  lead?: ReactNode
  /** Boven de waarde (bv. de gekoppelde klanten). */
  above?: ReactNode
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  // Meteen de nieuwe waarde tonen; de server-waarde neemt het over zodra ze verandert.
  const [shown, setShown] = useState(value)
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    setShown(value)
  }
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)
  const { pending, save } = useFieldSave(id)
  const max = LIMITS[field as keyof typeof LIMITS]

  const commit = (raw: string) => {
    setEditing(false)
    if (cancelled.current) return
    const next = raw.trim() || null
    if (next === shown) return
    if (required && !next) return setError('Mag niet leeg zijn.')
    const prev = shown
    setShown(next)
    setError(null)
    save(field, raw, (msg) => {
      setShown(prev)
      setError(msg)
    })
  }
  const start = () => {
    cancelled.current = false
    setError(null)
    setEditing(true)
  }
  const editorProps = {
    autoFocus: true,
    defaultValue: shown ?? '',
    maxLength: max,
    'aria-label': label,
    className: cn(input, 'min-w-[160px] px-2.5 py-1.5 text-sm'),
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => commit(e.currentTarget.value),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        cancelled.current = true
        e.currentTarget.blur()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        e.currentTarget.blur()
      }
    },
  }

  return (
    <td data-label={label} className={cn('group px-3 py-3', className)}>
      {above}
      <div className="flex items-start gap-1">
        {lead}
        {editing ? (
          multiline ? (
            <textarea rows={3} {...editorProps} />
          ) : (
            <input type={type} inputMode={inputMode} autoComplete="off" {...editorProps} />
          )
        ) : (
          <>
            {shown &&
              (display ? (
                <span className={cn('min-w-0 pt-1', multiline && 'line-clamp-3 whitespace-pre-line')}>{display(shown)}</span>
              ) : (
                <button type="button" onClick={start} className={cn('min-w-0 cursor-text pt-1 text-left break-words', multiline && 'line-clamp-3 whitespace-pre-line')}>
                  {shown}
                </button>
              ))}
            <button
              type="button"
              onClick={start}
              aria-label={`${label} ${shown ? 'aanpassen' : 'invullen'}`}
              title={`${label} ${shown ? 'aanpassen' : 'invullen'}`}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-adm-muted opacity-40 group-hover:opacity-100 hover:bg-adm-soft focus-visible:opacity-100"
            >
              <Icon.pencil size={13} />
            </button>
          </>
        )}
        {pending && <Spinner />}
      </div>
      {error && (
        <span role="alert" className="mt-1 block text-xs text-adm-warn">
          {error}
        </span>
      )}
    </td>
  )
}

/** Score als gekleurd label; kiezen bewaart meteen. */
function ScoreCell({ id, name, score }: { id: string; name: string; score: Score | null }) {
  const [shown, setShown] = useState(score)
  const [synced, setSynced] = useState(score)
  if (synced !== score) {
    setSynced(score)
    setShown(score)
  }
  const [error, setError] = useState<string | null>(null)
  const { pending, save } = useFieldSave(id)
  return (
    <td data-label="Score" className="px-3 py-3 whitespace-nowrap">
      <div className="flex items-center gap-1">
        <label className="relative inline-flex">
          <span className="sr-only">Score van {name}</span>
          {shown && <ScorePill score={shown} className="pointer-events-none pr-6" />}
          <select
            value={shown ?? ''}
            onChange={(e) => {
              const next = (e.target.value || null) as Score | null
              const prev = shown
              setShown(next)
              setError(null)
              save('score', e.target.value, (msg) => {
                setShown(prev)
                setError(msg)
              })
            }}
            className={cn('cursor-pointer appearance-none rounded-full text-xs font-semibold', shown ? 'absolute inset-0 opacity-0' : 'min-h-7 min-w-14 bg-adm-soft/70 px-2.5 pr-6 text-adm-muted')}
          >
            <option value="" />
            {SCORES.map((s) => (
              <option key={s} value={s}>
                {SCORE_LABELS[s]}
              </option>
            ))}
          </select>
          <span aria-hidden className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] opacity-70">
            ▾
          </span>
        </label>
        {pending && <Spinner />}
      </div>
      {error && (
        <span role="alert" className="mt-1 block text-xs text-adm-warn">
          {error}
        </span>
      )}
    </td>
  )
}

/** Fiche: alle velden samen aanpassen (ook de koppeling aan klanten) en verwijderen met bevestiging. */
function FreelancerFiche({ freelancer: f, clients, onClose }: { freelancer: Freelancer; clients: ClientOption[]; onClose: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const day = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-adm-raised/60 p-4">
      <FormAction
        action={updateFreelancerAction.bind(null, f.id)}
        submitLabel="Bewaar fiche"
        pendingText="Bewaren…"
        serverValues={{ name: f.name, email: f.email ?? '', phone: f.phone ?? '', score: f.score ?? '', assignments: f.assignments ?? '', portfolio_url: f.portfolio_url ?? '', notes: f.notes ?? '' }}
      >
        <FreelancerFields freelancer={f} clients={clients} />
      </FormAction>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onClose} className={buttonClass('soft', true)}>
          Sluiten
        </button>
        {confirmDelete ? (
          <span className="inline-flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null)
                  const res = await deleteFreelancerAction(f.id)
                  if (!res.ok) setError(res.error)
                  router.refresh()
                })
              }
              className="ikr-btn inline-flex min-h-9 items-center rounded-full bg-[#B42318] px-3 text-xs font-semibold text-white"
            >
              Ja, verwijder {f.name}
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
          <span role="alert" className="text-xs text-adm-warn">
            {error}
          </span>
        )}
        <span className={cn('ml-auto text-xs', muted)}>
          Toegevoegd {day(f.created_at)}
          {f.created_by ? ` door ${f.created_by === 'grokbot' ? 'Grok Bot' : f.created_by.split('@')[0]}` : ''} · bijgewerkt {day(f.updated_at)}
        </span>
      </div>
    </div>
  )
}

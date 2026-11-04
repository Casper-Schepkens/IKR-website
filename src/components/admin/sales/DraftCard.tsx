'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteDraftAction, sendDraftAction, updateDraftAction } from '@/app/admin/actions'
import { buttonClass, Card, input, label, muted, Pill, Spinner } from '../ui'
import { cn } from '@/utilities/ui'
import { useFollowServer } from '../follow-server'
import { ContextBox } from './ContextBox'
import { RewriteBox } from './RewriteBox'

export type DraftCardProps = {
  id: string
  leadId: string
  leadName: string | null
  from: string
  to: string
  cc: string[]
  subject: string
  body: string
  isHtml: boolean
  inThread: boolean
  createdBy: string | null
  createdAt: string
  context: string | null
  /** Wie herschrijft: "Grokbot" of "De AI" */
  rewriter: string
}

/** Mailconcept (bv. van Grokbot): Casper bewerkt, verstuurt of verwijdert het. */
export function DraftCard(d: DraftCardProps) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [gone, setGone] = useState<string | null>(null)
  const [subject, setSubject] = useFollowServer(d.subject)
  const [body, setBody] = useFollowServer(d.body)
  const [to, setTo] = useFollowServer(d.to)
  const [cc, setCc] = useFollowServer(d.cc.join(', '))
  const router = useRouter()

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) return setError(res.error ?? 'Er ging iets mis.')
      if (done) setGone(done)
      router.refresh()
    })

  if (gone) return <p className={cn('m-0 text-sm', muted)}>{gone}</p>

  return (
    <Card className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="yellow">Concept</Pill>
          {d.leadName && (
            <Link
              href={`/admin/sales/leads/${d.leadId}`}
              className="font-bold text-ikr-navy no-underline hover:text-[#0B7F93]"
            >
              {d.leadName}
            </Link>
          )}
          {d.isHtml && <Pill tone="light">HTML</Pill>}
          {d.inThread && <Pill tone="light">Antwoord in thread</Pill>}
          <span className={cn('ml-auto text-xs', muted)}>
            {d.createdBy === 'grokbot'
              ? 'Klaargezet door Grokbot'
              : `Klaargezet door ${d.createdBy ?? '?'}`}{' '}
            ·{' '}
            {new Date(d.createdAt).toLocaleString('nl-BE', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            run(() => updateDraftAction(d.id, data))
          }}
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <label className={label}>
              Van
              <input value={d.from} readOnly aria-readonly className={cn(input, 'opacity-70')} />
            </label>
            <label className={label}>
              Aan
              <input name="to" type="email" required value={to} onChange={(e) => setTo(e.target.value)} className={input} />
            </label>
            <label className={label}>
              Cc (komma-gescheiden)
              <input name="cc" value={cc} onChange={(e) => setCc(e.target.value)} className={input} />
            </label>
          </div>
          <label className={label}>
            Onderwerp
            <input name="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} className={input} />
          </label>
          <label className={label}>
            Tekst{d.isHtml ? ' (HTML)' : ''}
            <textarea
              name="body"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={Math.min(16, Math.max(6, body.split('\n').length + 1))}
              className={cn(input, 'py-3 leading-relaxed', d.isHtml && 'font-mono text-xs')}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              data-pending={pending}
              className={buttonClass('navy')}
              onClick={(e) => {
                const form = (e.currentTarget as HTMLButtonElement).form!
                if (
                  !window.confirm(
                    `Deze mail nu versturen naar ${(form.elements.namedItem('to') as HTMLInputElement).value}?`,
                  )
                )
                  return
                const data = new FormData(form)
                // Eerst de wijzigingen bewaren, dan pas versturen.
                start(async () => {
                  setError(null)
                  const saved = await updateDraftAction(d.id, data)
                  if (!saved.ok) return setError(saved.error)
                  const sent = await sendDraftAction(d.id)
                  if (!sent.ok) return setError(sent.error)
                  setGone('Verstuurd.')
                  router.refresh()
                })
              }}
            >
              {pending && <Spinner />} Verstuur
            </button>
            <button type="submit" disabled={pending} className={buttonClass('soft')}>
              Opslaan
            </button>
            <RewriteBox
              target="draft"
              targetId={d.id}
              leadId={d.leadId}
              rewriter={d.rewriter}
              current={() => ({ subject, body, context: d.context, from: d.from })}
              onResult={(r) => {
                setBody(r.body)
                if (r.subject) setSubject(r.subject)
              }}
            />
            <button
              type="button"
              disabled={pending}
              className={cn('ml-auto text-sm underline', muted)}
              onClick={() =>
                window.confirm('Concept verwijderen?') &&
                run(() => deleteDraftAction(d.id), 'Concept verwijderd.')
              }
            >
              Verwijderen
            </button>
          </div>
        </form>
        {error && (
          <span role="alert" className="text-sm font-medium text-[#A3470F]">
            {error}
          </span>
        )}
      </div>
      <ContextBox text={d.context} />
    </Card>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markLostAction, retryAiJobAction, sendInboxReplyAction } from '@/app/admin/actions'
import { buttonClass, Card, input, muted, Pill, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

const KIND: Record<string, { label: string; tone: 'green' | 'teal' | 'purple' | 'yellow' | 'orange' | 'light' }> = {
  interested: { label: 'Geïnteresseerd', tone: 'green' },
  question: { label: 'Vraag', tone: 'teal' },
  referral: { label: 'Doorverwezen', tone: 'purple' },
  out_of_office: { label: 'Afwezig', tone: 'yellow' },
  not_interested: { label: 'Niet geïnteresseerd', tone: 'orange' },
  unsubscribe: { label: 'Uitschrijven', tone: 'orange' },
  other: { label: 'Andere', tone: 'light' },
}

export type InboxCardProps = {
  threadId: string
  leadId: string
  leadName: string
  company: string | null
  fromEmail: string
  date: string
  subject: string
  text: string
  showContext: boolean
  job: { id: string; status: string; error: string | null; output: { kind?: string; draft?: string | null; context?: string | null } | null } | null
}

export function InboxCard(p: InboxCardProps) {
  const [body, setBody] = useState(p.job?.output?.draft ?? '')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const router = useRouter()
  const out = p.job?.output
  const kind = out?.kind ? KIND[out.kind] : null
  const lostHint = out?.kind === 'not_interested' || out?.kind === 'unsubscribe'

  useEffect(() => setBody(p.job?.output?.draft ?? ''), [p.job?.output?.draft])

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      else {
        after?.()
        router.refresh()
      }
    })

  if (sent) return null

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/sales/leads/${p.leadId}`} className="text-lg font-bold text-ikr-navy no-underline hover:text-[#0B7F93]">
          {p.leadName}
        </Link>
        {p.company && <Pill tone="light">{p.company}</Pill>}
        {kind && <Pill tone={kind.tone}>{kind.label}</Pill>}
        <span className={cn('ml-auto text-xs', muted)}>
          {p.fromEmail} · {new Date(p.date).toLocaleString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="rounded-2xl bg-ikr-cream p-4">
        <p className={cn('m-0 mb-1 text-xs font-semibold', muted)}>{p.subject}</p>
        <p className="m-0 text-sm leading-relaxed whitespace-pre-line">{p.text || '(leeg bericht)'}</p>
      </div>
      {p.showContext && out?.context && (
        <div className="rounded-2xl border border-[#E6DFD2] p-3 text-sm">
          <span className="font-semibold">Context: </span>
          {out.context}
        </div>
      )}

      {(!p.job || p.job.status === 'pending' || p.job.status === 'running') && (
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Spinner /> AI zet een antwoord klaar…
        </span>
      )}
      {p.job && (p.job.status === 'error' || p.job.status === 'waiting_limit') && (
        <span className="flex flex-wrap items-center gap-2 text-sm text-[#A3470F]">
          {p.job.error}
          <button type="button" disabled={pending} onClick={() => run(() => retryAiJobAction(p.job!.id))} className={buttonClass('soft', true)}>
            {pending && <Spinner />} Opnieuw
          </button>
        </span>
      )}

      {p.job?.status === 'done' && out?.draft != null && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            run(() => sendInboxReplyAction(p.threadId, data), () => setSent(true))
          }}
        >
          <label className="sr-only" htmlFor={`body-${p.threadId}`}>
            Antwoord
          </label>
          <textarea
            id={`body-${p.threadId}`}
            name="body"
            rows={Math.min(14, Math.max(5, body.split('\n').length + 1))}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={cn(input, 'py-3 leading-relaxed')}
          />
          <div>
            <button type="submit" disabled={pending || !body.trim()} data-pending={pending} className={buttonClass('navy')}>
              {pending && <Spinner />} Verstuur
            </button>
          </div>
        </form>
      )}

      {p.job?.status === 'done' && out?.draft == null && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {lostHint ? (
            <>
              <span className="font-semibold">Lead loss gedetecteerd: geen antwoord klaargezet.</span>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const data = new FormData()
                  data.set('reason', 'not_interested')
                  data.set('note', out?.kind === 'unsubscribe' ? 'Wou uitgeschreven worden' : 'Reageerde: niet geïnteresseerd')
                  run(() => markLostAction(p.leadId, data), () => setSent(true))
                }}
              >
                <button type="submit" disabled={pending} className={buttonClass('soft', true)}>
                  {pending && <Spinner />} Markeer als lost
                </button>
              </form>
            </>
          ) : (
            <span className={muted}>Geen antwoord nodig{out?.kind === 'out_of_office' ? ' (afwezigheidsbericht)' : ''}.</span>
          )}
        </div>
      )}
      {error && (
        <span role="alert" className="text-sm font-medium text-[#A3470F]">
          {error}
        </span>
      )}
    </Card>
  )
}

/** Ververst de pagina zolang er nog antwoorden klaargezet worden. */
export function RefreshWhilePending({ active }: { active: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(t)
  }, [active, router])
  return null
}

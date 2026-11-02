'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { dismissInboxAction, getAiJobAction, markLostAction, removeNotALeadAction, retryAiJobAction, sendInboxReplyAction } from '@/app/admin/actions'
import { buttonClass, Card, Icon, input, muted, Pill, Spinner } from '../ui'
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

type Job = NonNullable<InboxCardProps['job']>

export function InboxCard(props: InboxCardProps) {
  const [job, setJob] = useState<Job | null>(props.job)
  const p = { ...props, job }
  const [body, setBody] = useState(props.job?.output?.draft ?? '')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const out = p.job?.output
  const kind = out?.kind ? KIND[out.kind] : null
  const lostHint = out?.kind === 'not_interested' || out?.kind === 'unsubscribe'

  useEffect(() => setBody(job?.output?.draft ?? ''), [job?.output?.draft])

  // Zolang de AI bezig is: enkel de status van deze taak opvragen (geen Gmail).
  const waiting = !job || job.status === 'pending' || job.status === 'running'
  useEffect(() => {
    if (!waiting || !job) return
    const t = setInterval(async () => {
      const fresh = await getAiJobAction(job.id)
      if (fresh) setJob(fresh as Job)
    }, 4000)
    return () => clearInterval(t)
  }, [waiting, job])

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      else after?.()
    })

  if (sent) return null

  return (
    <Card className="relative flex flex-col gap-3 pb-16">
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
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null)
                setJob({ ...p.job!, status: 'running', error: null })
                const res = await retryAiJobAction(p.job!.id)
                if (!res.ok) setError(res.error)
                const fresh = await getAiJobAction(p.job!.id)
                if (fresh) setJob(fresh as Job)
              })
            }
            className={buttonClass('soft', true)}
          >
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
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`${p.leadName} is geen lead? Dan wordt die verwijderd en verschijnen mails van dit adres niet meer in de inbox.`))
            run(() => removeNotALeadAction(p.leadId), () => setSent(true))
        }}
        className={cn('absolute bottom-6 left-6 text-xs underline', muted)}
      >
        Geen lead
      </button>
      {job && (
        <button
          type="button"
          disabled={pending}
          aria-label="Geen antwoord nodig, verbergen"
          title="Geen antwoord nodig"
          onClick={() => run(() => dismissInboxAction(job.id), () => setSent(true))}
          className="ikr-btn absolute right-4 bottom-4 flex size-9 items-center justify-center rounded-full bg-ikr-cream text-ikr-navy hover:bg-[#e6dfd2] disabled:opacity-60"
        >
          <Icon.close size={16} />
        </button>
      )}
    </Card>
  )
}

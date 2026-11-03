'use client'

import { useEffect, useState, useTransition } from 'react'
import { getAiJobAction, requestRewriteAction } from '@/app/admin/actions'
import { buttonClass, input, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

/**
 * Tekstveld + knop "Herschrijven": de mail gaat met Caspers uitleg naar de AI (Grokbot of API);
 * het resultaat komt in hetzelfde vak terug. Er wordt niets verstuurd.
 */
export function RewriteBox({
  target,
  targetId,
  leadId,
  rewriter,
  current,
  onResult,
}: {
  target: 'draft' | 'inbox'
  targetId: string
  leadId: string
  /** "Grokbot" of "De AI" */
  rewriter: string
  current: () => { subject?: string; body: string; context?: string | null; from?: string }
  onResult: (r: { subject: string | null; body: string }) => void
}) {
  const [instruction, setInstruction] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!jobId) return
    const t = setInterval(async () => {
      const job = await getAiJobAction(jobId)
      if (!job) return
      if (job.status === 'done' && job.output) {
        const out = job.output as { subject?: string | null; body?: string }
        if (out.body) onResult({ subject: out.subject ?? null, body: out.body })
        setInstruction('')
        setJobId(null)
      } else if (job.status === 'error' || job.status === 'waiting_limit') {
        setError(job.error ?? 'Herschrijven mislukt.')
        setJobId(null)
      }
    }, 3000)
    return () => clearInterval(t)
  }, [jobId, onResult])

  const busy = pending || Boolean(jobId)
  return (
    <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2">
      <input
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        // Enter mag het formulier rond de mail niet opslaan.
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        disabled={busy}
        aria-label="Hoe moet de mail herschreven worden?"
        placeholder="Hoe herschrijven? bv. korter, formeler, vraag naar een datum…"
        className={cn(input, 'min-h-11 min-w-0 flex-1 text-sm')}
      />
      <button
        type="button"
        disabled={busy || !instruction.trim()}
        data-pending={busy}
        className={buttonClass('light')}
        onClick={() =>
          start(async () => {
            setError(null)
            const c = current()
            const data = new FormData()
            data.set('instruction', instruction)
            data.set('body', c.body)
            if (c.subject) data.set('subject', c.subject)
            if (c.context) data.set('context', c.context)
            if (c.from) data.set('from', c.from)
            const res = await requestRewriteAction(target, targetId, leadId, data)
            if (!res.ok) setError(res.error)
            else setJobId(res.data)
          })
        }
      >
        {busy && <Spinner />}
        {jobId ? `${rewriter} herschrijft…` : 'Herschrijven'}
      </button>
      {error && (
        <span role="alert" className="w-full text-sm font-medium text-[#A3470F]">
          {error}
        </span>
      )}
    </div>
  )
}

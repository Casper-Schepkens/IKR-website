'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getAiJobAction, rebuildStyleAction } from '@/app/admin/actions'
import { buttonClass, muted, Spinner } from './ui'
import { cn } from '@/utilities/ui'

/** "Bijwerken": verzamelt verzonden mails en laat de AI (Grokbot of API) het profiel opnieuw opbouwen. */
export function StyleRebuildButton({ styleKey, rewriter }: { styleKey: 'casper' | 'ikr'; rewriter: string }) {
  const [pending, start] = useTransition()
  const [jobId, setJobId] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!jobId) return
    const t = setInterval(async () => {
      const job = await getAiJobAction(jobId)
      if (job?.status === 'done') {
        setJobId(null)
        setInfo('Profiel bijgewerkt.')
        router.refresh()
      } else if (job?.status === 'error' || job?.status === 'waiting_limit') {
        setJobId(null)
        setError(job.error ?? 'Bijwerken mislukt.')
      }
    }, 4000)
    return () => clearInterval(t)
  }, [jobId, router])

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending || Boolean(jobId)}
        data-pending={pending || Boolean(jobId)}
        className={buttonClass('soft', true)}
        onClick={() =>
          start(async () => {
            setError(null)
            setInfo(null)
            const res = await rebuildStyleAction(styleKey)
            if (!res.ok) return setError(res.error)
            setJobId(res.data.jobId)
            setInfo(`${res.data.mails} verzonden antwoorden verzameld.`)
          })
        }
      >
        {(pending || jobId) && <Spinner />}
        {jobId ? `${rewriter} bouwt het profiel…` : pending ? 'Mails verzamelen…' : 'Bijwerken'}
      </button>
      {info && <span className={cn('text-xs', muted)}>{info}</span>}
      {error && (
        <span role="alert" className="text-sm text-[#A3470F]">
          {error}
        </span>
      )}
    </span>
  )
}

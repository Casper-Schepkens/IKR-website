'use client'

import Link from 'next/link'
import { cn } from '@/utilities/ui'
import { clock, useElapsed, useRecorder } from './RecorderProvider'

/** Linksboven in de sidebar zolang er een opname loopt (of nog moet uploaden); klik = terug naar de pagina. */
export function RecordingIndicator() {
  const { status, target, startedAt } = useRecorder()
  const seconds = useElapsed(status === 'recording' ? startedAt : null)
  if (!target || (status !== 'recording' && status !== 'uploading' && status !== 'error')) return null

  const text = status === 'recording' ? `REC ${clock(seconds)}` : status === 'uploading' ? 'Uploaden…' : 'Upload mislukt'
  return (
    <Link
      href={target.href}
      title={`${target.label}: ${status === 'recording' ? 'opname loopt' : status === 'uploading' ? 'opname wordt geüpload' : 'upload mislukt, download de opname'}`}
      aria-live="polite"
      className={cn(
        'mx-2.5 inline-flex max-w-[calc(100%-1.25rem)] min-w-0 items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-bold tabular-nums no-underline',
        status === 'error' ? 'bg-adm-warn-bg text-adm-warn' : 'bg-[#E5484D] text-white',
      )}
    >
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', status === 'error' ? 'bg-[#A3470F]' : 'bg-adm-raised', status === 'recording' && 'animate-pulse')} />
      <span className="shrink-0 whitespace-nowrap">{text}</span>
      <span className="min-w-0 truncate font-semibold opacity-85">· {target.label}</span>
    </Link>
  )
}

/** "Recording"-pill bij de titel van de pagina die opgenomen wordt. */
export function RecordingPill({ recKey }: { recKey: string }) {
  const { status, target, startedAt } = useRecorder()
  const seconds = useElapsed(status === 'recording' ? startedAt : null)
  if (target?.key !== recKey || status !== 'recording') return null
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#E5484D] px-2.5 py-1 text-xs font-bold text-white tabular-nums">
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-adm-raised" /> Recording · {clock(seconds)}
    </span>
  )
}

'use client'

import Link from 'next/link'
import { buttonClass, muted, Spinner } from './ui'
import { cn } from '@/utilities/ui'
import { clock, useElapsed, useRecorder, type Finish, type RecTarget, type StartUpload } from './recorder/RecorderProvider'

/**
 * Neemt audio op via de microfoon en zet het bestand in de Drive. Gebruikt voor live weeklies en setter calls.
 * De opname zelf zit in RecorderProvider (layout), dus wegklikken naar een andere pagina stopt ze niet.
 * Mislukt de upload, dan kan je de opname nog downloaden.
 */
export function RecordButton({
  target,
  startUpload,
  finish,
  existingUrl,
}: {
  target: RecTarget
  startUpload: StartUpload
  finish: Finish
  existingUrl: string | null
}) {
  const r = useRecorder()
  const mine = r.target?.key === target.key
  const busyElsewhere = !mine && r.target && (r.status === 'recording' || r.status === 'uploading')
  const status = mine ? r.status : 'idle'
  const seconds = useElapsed(mine && status === 'recording' ? r.startedAt : null)
  const done = status === 'done' || (status === 'idle' && Boolean(existingUrl))

  if (busyElsewhere && r.target) {
    return (
      <span className={cn('text-sm', muted)}>
        Er loopt al een opname: <Link href={r.target.href}>{r.target.label}</Link>.
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status === 'idle' && !done && (
        <button type="button" onClick={() => void r.start(target, { startUpload, finish })} className={buttonClass('navy')}>
          <span aria-hidden="true" className="size-2.5 rounded-full bg-[#E5484D]" /> Record
        </button>
      )}
      {status === 'recording' && (
        <button type="button" onClick={r.stop} className={cn(buttonClass('soft'), 'ring-2 ring-[#E5484D] tabular-nums')}>
          <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-[#E5484D]" /> Recording · {clock(seconds)} · Stop
        </button>
      )}
      {status === 'uploading' && (
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Spinner /> Opname naar de Drive…
        </span>
      )}
      {done && <span className="text-sm font-semibold text-adm-green">Opname staat in de Drive.</span>}
      {mine && r.error && (
        <span role="alert" className="text-sm font-medium text-adm-warn">
          {r.error}
        </span>
      )}
      {status === 'error' && r.fallbackUrl && (
        <>
          <a href={r.fallbackUrl} download="opname.webm" className={buttonClass('soft', true)}>
            Download opname
          </a>
          <button type="button" onClick={r.reset} className={cn('text-xs underline', muted)}>
            Nieuwe opname
          </button>
        </>
      )}
    </div>
  )
}

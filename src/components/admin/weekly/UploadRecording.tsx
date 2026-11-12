'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { finishWeeklyRecordingAction, startWeeklyRecordingAction } from '@/app/admin/weekly-actions'
import { buttonClass, muted, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

/**
 * Opname van de weekly uploaden (audio of video): naar de Drive van contact@ en dan naar Fireflies.
 * Na het transcript verwerkt Grok Bot de weekly (per persoon een kaart, SOP-voorstellen, opdrachten).
 */
export function UploadRecording({ weeklyId, atFireflies }: { weeklyId: string; atFireflies: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function upload(file: File) {
    setState('busy')
    setMsg(`Uploaden: ${file.name}…`)
    try {
      const mime = file.type || 'audio/mpeg'
      const s = await startWeeklyRecordingAction(weeklyId, mime, window.location.origin, file.name)
      if (!s.ok) throw new Error(s.error)
      const res = await fetch(s.data, { method: 'PUT', headers: { 'Content-Type': mime }, body: file })
      if (!res.ok) throw new Error(`Uploaden naar de Drive mislukt (${res.status}).`)
      const { id } = (await res.json()) as { id: string }
      setMsg('Naar Fireflies sturen…')
      const f = await finishWeeklyRecordingAction(weeklyId, id)
      if (!f.ok) throw new Error(f.error)
      setState('done')
      setMsg('Opname staat in de Drive en is bij Fireflies. Na het uitschrijven (meestal enkele minuten) zet Grok Bot de verwerking op ieders werkplek.')
      router.refresh()
    } catch (e) {
      setState('error')
      setMsg(e instanceof Error ? e.message : 'Uploaden mislukt.')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={ref}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0]
            if (f) void upload(f)
            e.currentTarget.value = ''
          }}
        />
        <button type="button" disabled={state === 'busy'} onClick={() => ref.current?.click()} className={buttonClass('soft', true)}>
          Opname uploaden
        </button>
        {state === 'busy' && <Spinner />}
        {atFireflies && state === 'idle' && <span className={cn('text-xs', muted)}>Opname is bij Fireflies; wacht op het transcript.</span>}
      </div>
      {msg && (
        <p role={state === 'error' ? 'alert' : 'status'} className={cn('m-0 text-xs', state === 'error' ? 'text-[#A3470F]' : muted)}>
          {msg}
        </p>
      )}
    </div>
  )
}

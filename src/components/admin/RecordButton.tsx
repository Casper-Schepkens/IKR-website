'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buttonClass, muted, Spinner } from './ui'
import { cn } from '@/utilities/ui'

type StartUpload = (mimeType: string, origin: string) => Promise<{ ok: true; data: string } | { ok: false; error: string }>
type Finish = (fileId: string) => Promise<{ ok: boolean; error?: string }>

const pick = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t)) ?? ''

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Neemt audio op via de microfoon en zet het bestand in de Drive. Gebruikt voor live weeklies
 * (en straks de setter call). Mislukt de upload, dan kan je de opname nog downloaden.
 */
export function RecordButton({ startUpload, finish, existingUrl }: { startUpload: StartUpload; finish: Finish; existingUrl: string | null }) {
  const [state, setState] = useState<'idle' | 'recording' | 'uploading' | 'done' | 'error'>(existingUrl ? 'done' : 'idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [fallback, setFallback] = useState<string | null>(null)
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const router = useRouter()

  useEffect(() => {
    if (state !== 'recording') return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [state])

  // Niet per ongeluk wegklikken tijdens het opnemen of uploaden.
  useEffect(() => {
    if (state !== 'recording' && state !== 'uploading') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [state])

  async function start() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = pick()
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      chunks.current = []
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        void upload(new Blob(chunks.current, { type: r.mimeType || 'audio/webm' }))
      }
      r.start(10_000)
      rec.current = r
      setSeconds(0)
      setState('recording')
    } catch {
      setError('Geen toegang tot de microfoon. Sta die toe in je browser.')
    }
  }

  async function upload(blob: Blob) {
    setState('uploading')
    setFallback(URL.createObjectURL(blob))
    try {
      const mime = blob.type.split(';')[0] || 'audio/webm'
      const s = await startUpload(mime, window.location.origin)
      if (!s.ok) throw new Error(s.error)
      const res = await fetch(s.data, { method: 'PUT', headers: { 'Content-Type': mime }, body: blob })
      if (!res.ok) throw new Error(`Uploaden naar de Drive mislukt (${res.status}).`)
      const { id } = (await res.json()) as { id: string }
      const f = await finish(id)
      if (!f.ok) throw new Error(f.error)
      setState('done')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Uploaden mislukt.')
      setState('error')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {state === 'idle' && (
        <button type="button" onClick={start} className={buttonClass('navy')}>
          <span aria-hidden="true" className="size-2.5 rounded-full bg-[#E5484D]" /> Record
        </button>
      )}
      {state === 'recording' && (
        <button type="button" onClick={() => rec.current?.stop()} className={cn(buttonClass('soft'), 'ring-2 ring-[#E5484D]')}>
          <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-[#E5484D]" /> Stop · {clock(seconds)}
        </button>
      )}
      {state === 'uploading' && (
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Spinner /> Opname naar de Drive…
        </span>
      )}
      {state === 'done' && <span className="text-sm font-semibold text-[#1E5B27]">Opname staat in de Drive.</span>}
      {error && (
        <span role="alert" className="text-sm font-medium text-[#A3470F]">
          {error}
        </span>
      )}
      {state === 'error' && fallback && (
        <>
          <a href={fallback} download="opname.webm" className={buttonClass('soft', true)}>
            Download opname
          </a>
          <button type="button" onClick={() => setState('idle')} className={cn('text-xs underline', muted)}>
            Nieuwe opname
          </button>
        </>
      )}
    </div>
  )
}

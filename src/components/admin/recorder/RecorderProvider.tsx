'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export type StartUpload = (mimeType: string, origin: string) => Promise<{ ok: true; data: string } | { ok: false; error: string }>
export type Finish = (fileId: string) => Promise<{ ok: boolean; error?: string }>

export type RecStatus = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

/** Wat er opgenomen wordt: `key` (bv. `weekly:<id>`), waar je terug naartoe gaat en hoe het heet. */
export type RecTarget = { key: string; href: string; label: string }

type Recorder = {
  status: RecStatus
  target: RecTarget | null
  startedAt: number | null
  error: string | null
  fallbackUrl: string | null
  start: (target: RecTarget, upload: { startUpload: StartUpload; finish: Finish }) => Promise<void>
  stop: () => void
  reset: () => void
}

const Ctx = createContext<Recorder | null>(null)

const pick = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t)) ?? ''

/**
 * Eén opname voor heel de admin. Staat in de layout, dus de opname loopt door als je naar een andere
 * pagina klikt; de indicator in de sidebar brengt je terug. Pas bij Stop gaat het bestand naar de Drive.
 */
export function RecorderProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RecStatus>('idle')
  const [target, setTarget] = useState<RecTarget | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const rec = useRef<MediaRecorder | null>(null)
  const router = useRouter()

  // Niet per ongeluk het tabblad sluiten of herladen tijdens het opnemen of uploaden.
  useEffect(() => {
    if (status !== 'recording' && status !== 'uploading') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  const upload = useCallback(
    async (blob: Blob, { startUpload, finish }: { startUpload: StartUpload; finish: Finish }) => {
      setStatus('uploading')
      setFallbackUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(blob)
      })
      try {
        const mime = blob.type.split(';')[0] || 'audio/webm'
        const s = await startUpload(mime, window.location.origin)
        if (!s.ok) throw new Error(s.error)
        const res = await fetch(s.data, { method: 'PUT', headers: { 'Content-Type': mime }, body: blob })
        if (!res.ok) throw new Error(`Uploaden naar de Drive mislukt (${res.status}).`)
        const { id } = (await res.json()) as { id: string }
        const f = await finish(id)
        if (!f.ok) throw new Error(f.error)
        setStatus('done')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Uploaden mislukt.')
        setStatus('error')
      }
    },
    [router],
  )

  const start = useCallback<Recorder['start']>(
    async (t, fns) => {
      if (rec.current && rec.current.state !== 'inactive') return
      setError(null)
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        setTarget(t)
        setError('Geen toegang tot de microfoon. Sta die toe in je browser.')
        setStatus('idle')
        return
      }
      const type = pick()
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      const chunks: Blob[] = []
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data)
      }
      r.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        rec.current = null
        void upload(new Blob(chunks, { type: r.mimeType || 'audio/webm' }), fns)
      }
      r.start(10_000)
      rec.current = r
      setTarget(t)
      setStartedAt(Date.now())
      setStatus('recording')
    },
    [upload],
  )

  const stop = useCallback(() => rec.current?.stop(), [])

  const reset = useCallback(() => {
    if (rec.current && rec.current.state !== 'inactive') return
    setStatus('idle')
    setError(null)
    setTarget(null)
    setStartedAt(null)
  }, [])

  const value = useMemo(
    () => ({ status, target, startedAt, error, fallbackUrl, start, stop, reset }),
    [status, target, startedAt, error, fallbackUrl, start, stop, reset],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRecorder() {
  const r = useContext(Ctx)
  if (!r) throw new Error('useRecorder buiten RecorderProvider')
  return r
}

/** Seconden sinds `startedAt`, tikt elke seconde (enkel in de componenten die het tonen). */
export function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAt === null) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [startedAt])
  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000))
}

export const clock = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Live praten met het dashboard (OpenAI Realtime via WebRTC). De browser praat rechtstreeks met OpenAI;
 * tools, bevestigingen, verbruik en het afschrift lopen via /api/spraak/*.
 */

export type VoiceStatus = 'uit' | 'verbinden' | 'luistert' | 'denkt' | 'spreekt'
export type PendingAction = { id: string; tool: string; samenvatting: string; at: number; busy?: boolean }

type Call = { call_id: string; name: string; arguments: string }
type RealtimeEvent = { type: string; [k: string]: unknown }

/** Stil? Na zoveel zonder spraak stopt het gesprek vanzelf (langer als Grok Bot nog bezig is). */
const IDLE_MS = 2 * 60_000
const IDLE_WAITING_GROKBOT_MS = 10 * 60_000

async function post<T = Record<string, unknown>>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/spraak/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok || data.error) throw new Error(data.error ?? `Mislukt (${res.status}).`)
  return data
}

const asText = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v))
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)

export function useVoice(opts: {
  pathname: string
  /** Het afschrift of een Grok Bot-opdracht kwam in de chat: chat verversen. */
  onChatChanged: () => void
  /** Een wijziging werd uitgevoerd: de open pagina verversen. */
  onDataChanged: () => void
  /** open_pagina: geeft terug wat er geopend werd (of null). */
  onNavigate: (wat: string) => Promise<string | null>
}) {
  const [status, setStatus] = useState<VoiceStatus>('uit')
  const [pending, setPending] = useState<PendingAction[]>([])
  const [busyTool, setBusyTool] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [spend, setSpend] = useState<{ vandaag: number; limiet: number } | null>(null)
  const [waitingGrokbot, setWaitingGrokbot] = useState(false)

  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
  })

  const r = useRef({
    pc: null as RTCPeerConnection | null,
    dc: null as RTCDataChannel | null,
    mic: null as MediaStream | null,
    audio: null as HTMLAudioElement | null,
    sessionId: null as string | null,
    responseActive: false,
    queue: [] as { text: string; respond: boolean }[],
    lastActivity: 0,
    lastUserTurnAt: 0,
    userTurnAt: new Map<string, number>(),
    pending: [] as PendingAction[],
    grokbotSince: 0,
    stopWhenQuiet: false,
    speaking: false,
  })

  const send = (ev: Record<string, unknown>) => {
    const dc = r.current.dc
    if (dc?.readyState === 'open') dc.send(JSON.stringify(ev))
  }

  const setPendingBoth = (fn: (cur: PendingAction[]) => PendingAction[]) => {
    r.current.pending = fn(r.current.pending)
    setPending(r.current.pending)
  }

  /** Melding voor het model (geen gebruikersbericht). Tijdens een antwoord: wachten tot het klaar is. */
  const notify = useCallback((text: string, respond = true) => {
    if (!r.current.dc) return
    if (r.current.responseActive) {
      r.current.queue.push({ text, respond })
      return
    }
    send({ type: 'conversation.item.create', item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] } })
    if (respond) {
      r.current.responseActive = true
      send({ type: 'response.create' })
    }
  }, [])

  const stop = useCallback((reason?: string) => {
    const c = r.current
    const id = c.sessionId
    c.dc?.close()
    c.pc?.close()
    c.mic?.getTracks().forEach((t) => t.stop())
    if (c.audio) c.audio.srcObject = null
    Object.assign(c, { pc: null, dc: null, mic: null, sessionId: null, responseActive: false, queue: [], grokbotSince: 0, stopWhenQuiet: false, speaking: false })
    c.userTurnAt.clear()
    setStatus('uit')
    setBusyTool(null)
    setWaitingGrokbot(false)
    setPendingBoth(() => [])
    if (reason) setError(reason)
    if (id) void post('einde', { sessie_id: id }).catch(() => undefined)
  }, [])

  const reportUsage = (kind: 'antwoord' | 'transcriptie', usage: unknown, response_id?: string) => {
    const id = r.current.sessionId
    if (!id || !usage) return
    void post<{ vandaag_eur: number; limiet_eur: number; over: boolean }>('verbruik', { sessie_id: id, kind, usage, response_id })
      .then((d) => {
        setSpend({ vandaag: d.vandaag_eur, limiet: d.limiet_eur })
        if (d.over) {
          r.current.stopWhenQuiet = true
          if (!r.current.speaking && !r.current.responseActive) stop(`Daglimiet bereikt (€${d.limiet_eur.toFixed(2)}). Aan te passen in Instellingen.`)
        }
      })
      .catch(() => undefined)
  }

  const transcript = (role: 'user' | 'bot', text: string, at: number) => {
    const id = r.current.sessionId
    if (!id || !text.trim()) return
    void post('bericht', { sessie_id: id, role, text, at, page: optsRef.current.pathname })
      .then(() => optsRef.current.onChatChanged())
      .catch(() => undefined)
  }

  /** Eén toolaanroep afhandelen; geeft de output voor het model terug. */
  const runCall = async (call: Call): Promise<string> => {
    const id = r.current.sessionId
    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(call.arguments || '{}') as Record<string, unknown>
    } catch {
      return asText({ fout: 'Ongeldige argumenten.' })
    }
    if (call.name === 'open_pagina') {
      const opened = await optsRef.current.onNavigate(String(args.wat ?? '')).catch(() => null)
      void post('tool', { sessie_id: id, name: call.name, args, page: optsRef.current.pathname }).catch(() => undefined)
      return asText(opened ? { ok: true, geopend: opened } : { fout: 'Niets gevonden om te openen.' })
    }
    if (call.name === 'actie_bevestigen') {
      // Afgedwongen in de code: enkel als de gebruiker NA het voorstel nog iets zei.
      const p = r.current.pending.find((x) => x.id === args.actie_id)
      if (!p) return asText({ fout: 'Geen wachtende actie met dit id.' })
      if (r.current.lastUserTurnAt <= p.at) return asText({ fout: 'De gebruiker heeft nog niet geantwoord op dit voorstel. Wacht op een duidelijke ja.' })
    }
    const res = await post<{ output: unknown; actie?: { id: string; tool: string; samenvatting: string }; grokbot?: boolean; stop?: boolean }>('tool', {
      sessie_id: id,
      name: call.name,
      args,
      page: optsRef.current.pathname,
    })
    if (res.actie) {
      const a = res.actie
      setPendingBoth((cur) => [...cur, { ...a, at: Date.now() }])
    }
    if (call.name === 'actie_bevestigen' || call.name === 'actie_annuleren') {
      setPendingBoth((cur) => cur.filter((x) => x.id !== args.actie_id))
      if (call.name === 'actie_bevestigen') optsRef.current.onDataChanged()
    }
    if (res.grokbot) {
      r.current.grokbotSince = Date.now()
      setWaitingGrokbot(true)
      optsRef.current.onChatChanged()
    }
    if (res.stop) r.current.stopWhenQuiet = true
    return asText(res.output)
  }

  const handleCalls = async (calls: Call[]) => {
    // Tot het vervolgantwoord loopt: meldingen wachten in de rij (anders twee antwoorden tegelijk).
    r.current.responseActive = true
    setStatus('denkt')
    setBusyTool(calls.map((c) => c.name).join(', '))
    const outputs = await Promise.all(calls.map((c) => runCall(c).catch((e: unknown) => asText({ fout: e instanceof Error ? e.message : 'Mislukt.' }))))
    setBusyTool(null)
    if (!r.current.dc) return
    calls.forEach((c, i) => send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: c.call_id, output: outputs[i] } }))
    r.current.responseActive = true
    send({ type: 'response.create' })
  }

  const flushQueue = () => {
    const q = r.current.queue.splice(0)
    if (!q.length) return
    for (const m of q) send({ type: 'conversation.item.create', item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: m.text }] } })
    if (q.some((m) => m.respond)) {
      r.current.responseActive = true
      send({ type: 'response.create' })
    }
  }

  const onEvent = (ev: RealtimeEvent) => {
    const c = r.current
    switch (ev.type) {
      case 'input_audio_buffer.speech_started':
        c.lastActivity = Date.now()
        setStatus('luistert')
        break
      case 'input_audio_buffer.committed':
        c.lastActivity = Date.now()
        c.lastUserTurnAt = Date.now()
        c.userTurnAt.set(String(ev.item_id), Date.now())
        break
      case 'conversation.item.input_audio_transcription.completed': {
        const at = c.userTurnAt.get(String(ev.item_id)) ?? Date.now()
        transcript('user', String(ev.transcript ?? ''), at)
        reportUsage('transcriptie', ev.usage)
        break
      }
      case 'response.created':
        c.responseActive = true
        setStatus('denkt')
        break
      case 'output_audio_buffer.started':
        c.speaking = true
        setStatus('spreekt')
        break
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        c.speaking = false
        c.lastActivity = Date.now()
        setStatus('luistert')
        if (c.stopWhenQuiet && !c.responseActive) stop('Daglimiet bereikt. Aan te passen in Instellingen.')
        break
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        transcript('bot', String(ev.transcript ?? ''), Date.now())
        break
      case 'response.done': {
        c.responseActive = false
        c.lastActivity = Date.now()
        const resp = (ev.response ?? {}) as { id?: string; usage?: unknown; output?: { type: string; call_id: string; name: string; arguments: string }[] }
        reportUsage('antwoord', resp.usage, resp.id)
        const calls = (resp.output ?? []).filter((o) => o.type === 'function_call')
        if (calls.length) void handleCalls(calls)
        else {
          if (!c.speaking) setStatus('luistert')
          flushQueue()
        }
        break
      }
      case 'error': {
        const err = (ev.error ?? {}) as { message?: string; code?: string }
        if (err.code === 'response_cancel_not_active' || err.code === 'conversation_already_has_active_response') break
        setError(err.message ?? 'Fout in het gesprek.')
        break
      }
    }
  }

  const start = useCallback(async () => {
    if (r.current.pc) return
    setError(null)
    setStatus('verbinden')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Deze browser geeft geen toegang tot de microfoon.')
      // Eerst de microfoon (toestemming), dan pas een gesprek aanmaken.
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).catch(() => {
        throw new Error('Geen toegang tot de microfoon. Sta het toe in je browser.')
      })
      r.current.mic = mic
      const s = await post<{ sessie_id: string; client_secret: string; vandaag_eur: number; limiet_eur: number }>('sessie', { page: optsRef.current.pathname })
      r.current.sessionId = s.sessie_id
      setSpend({ vandaag: s.vandaag_eur, limiet: s.limiet_eur })

      const pc = new RTCPeerConnection()
      r.current.pc = pc
      const audio = (r.current.audio ??= Object.assign(document.createElement('audio'), { autoplay: true }))
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0]
      }
      pc.addTrack(mic.getTracks()[0], mic)
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') stop('De verbinding viel weg.')
      }
      const dc = pc.createDataChannel('oai-events')
      r.current.dc = dc
      dc.onmessage = (e) => {
        try {
          onEvent(JSON.parse(String(e.data)) as RealtimeEvent)
        } catch {
          /* onbekend bericht */
        }
      }
      dc.onopen = () => {
        r.current.lastActivity = Date.now()
        setStatus('luistert')
      }
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const answer = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${s.client_secret}`, 'Content-Type': 'application/sdp' },
      })
      if (!answer.ok) throw new Error(`Verbinden met OpenAI mislukt (${answer.status}).`)
      await pc.setRemoteDescription({ type: 'answer', sdp: await answer.text() })
    } catch (e) {
      stop(e instanceof Error ? e.message : 'Starten mislukt.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop])

  /** Knop op de bevestigingskaart. */
  const decide = useCallback(
    async (id: string, beslissing: 'bevestig' | 'annuleer') => {
      const p = r.current.pending.find((x) => x.id === id)
      if (!p) return
      setPendingBoth((cur) => cur.map((x) => (x.id === id ? { ...x, busy: true } : x)))
      try {
        const res = await post<{ output: { status?: string; fout?: string; resultaat?: string } }>('actie', { sessie_id: r.current.sessionId, id, beslissing })
        setPendingBoth((cur) => cur.filter((x) => x.id !== id))
        if (res.output.status === 'uitgevoerd') optsRef.current.onDataChanged()
        const what = beslissing === 'bevestig' ? 'bevestigd' : 'geannuleerd'
        notify(`[Melding] De gebruiker heeft via de knop ${what}: ${p.samenvatting}. Resultaat: ${clip(asText(res.output), 2000)}. Zeg dit in één korte zin.`)
      } catch (e) {
        setPendingBoth((cur) => cur.map((x) => (x.id === id ? { ...x, busy: false } : x)))
        setError(e instanceof Error ? e.message : 'Mislukt.')
      }
    },
    [notify],
  )

  /** Nieuw antwoord van Grok Bot in de chat: laten vertellen als we op hem wachten. */
  const grokbotAnswered = useCallback(
    (text: string, createdAt: string) => {
      const since = r.current.grokbotSince
      if (!since || !r.current.dc || Date.parse(createdAt) < since - 5_000) return
      r.current.grokbotSince = 0
      setWaitingGrokbot(false)
      r.current.lastActivity = Date.now()
      notify(`[Melding] Grok Bot antwoordde: ${clip(text, 3000)}\nVertel kort wat Grok Bot zei of klaarzette.`)
    },
    [notify],
  )

  // Andere pagina tijdens het gesprek: het model laten weten (zonder antwoord).
  const lastPage = useRef(opts.pathname)
  useEffect(() => {
    if (lastPage.current === opts.pathname) return
    lastPage.current = opts.pathname
    if (r.current.dc) notify(`[Melding] De gebruiker zit nu op pagina ${opts.pathname}.`, false)
  }, [opts.pathname, notify])

  // Stilte: na 2 minuten (10 als Grok Bot nog bezig is) vanzelf stoppen.
  useEffect(() => {
    if (status === 'uit') return
    const t = setInterval(() => {
      const c = r.current
      if (!c.pc || c.responseActive || c.speaking) return
      const max = c.grokbotSince ? IDLE_WAITING_GROKBOT_MS : IDLE_MS
      if (Date.now() - c.lastActivity > max) stop()
    }, 10_000)
    return () => clearInterval(t)
  }, [status, stop])

  // Pagina dicht: gesprek afsluiten.
  useEffect(() => {
    const c = r.current
    const onHide = () => {
      const id = c.sessionId
      if (id) navigator.sendBeacon('/api/spraak/einde', new Blob([JSON.stringify({ sessie_id: id })], { type: 'application/json' }))
    }
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      if (c.pc) stop()
    }
  }, [stop])

  return { status, active: status !== 'uit', start, stop, pending, decide, busyTool, error, clearError: () => setError(null), spend, waitingGrokbot, grokbotAnswered }
}

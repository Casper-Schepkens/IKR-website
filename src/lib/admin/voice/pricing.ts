/**
 * Prijzen van OpenAI Realtime (dollar per 1 miljoen tokens) en de kost van één antwoord.
 * Nakijken op https://openai.com/api/pricing/ als OpenAI de prijzen wijzigt; enkel deze tabel aanpassen.
 */
export type Rates = { audioIn: number; audioCached: number; textIn: number; textCached: number; audioOut: number; textOut: number }

export const RATES: Record<'flagship' | 'mini', Rates> = {
  flagship: { audioIn: 32, audioCached: 0.4, textIn: 4, textCached: 0.4, audioOut: 64, textOut: 16 },
  mini: { audioIn: 10, audioCached: 0.3, textIn: 0.6, textCached: 0.06, audioOut: 20, textOut: 2.4 },
}

/** gpt-4o-mini-transcribe (wat jij zegt → tekst in de chat). */
export const TRANSCRIBE = { audioIn: 3, textOut: 5, perMinute: 0.003 }

export const ratesFor = (model: string): Rates => (/mini/i.test(model) ? RATES.mini : RATES.flagship)

/** Het `usage`-object uit `response.done` (Realtime API). */
export type RealtimeUsage = {
  input_tokens?: number
  output_tokens?: number
  input_token_details?: {
    text_tokens?: number
    audio_tokens?: number
    cached_tokens?: number
    cached_tokens_details?: { text_tokens?: number; audio_tokens?: number }
  }
  output_token_details?: { text_tokens?: number; audio_tokens?: number }
}

export type CostParts = { spraak_in: number; tekst_in: number; cache: number; spraak_uit: number; tekst_uit: number; transcriptie: number }
export const COST_LABELS: Record<keyof CostParts, string> = {
  spraak_in: 'Jouw spraak',
  spraak_uit: 'Gesproken antwoorden',
  tekst_in: 'Instructies, tools en data',
  tekst_uit: 'Toolaanroepen en tekst van de bot',
  cache: 'Uit de cache (goedkoop)',
  transcriptie: 'Uittypen van wat je zei',
}

export type Counted = { audio_in: number; audio_in_cached: number; text_in: number; text_in_cached: number; audio_out: number; text_out: number; cost: CostParts; cost_usd: number }

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0)
const round = (v: number) => Math.round(v * 1e6) / 1e6
const empty = (): CostParts => ({ spraak_in: 0, tekst_in: 0, cache: 0, spraak_uit: 0, tekst_uit: 0, transcriptie: 0 })

/** Kost van één antwoord. Gecachete tokens zitten in de totalen per soort, dus die trekken we eraf. */
export function responseCost(model: string, usage: RealtimeUsage): Counted {
  const r = ratesFor(model)
  const inD = usage.input_token_details ?? {}
  const outD = usage.output_token_details ?? {}
  const audioCached = n(inD.cached_tokens_details?.audio_tokens)
  const textCached = n(inD.cached_tokens_details?.text_tokens ?? (inD.cached_tokens_details ? 0 : inD.cached_tokens))
  const audioIn = Math.max(0, n(inD.audio_tokens) - audioCached)
  const textIn = Math.max(0, n(inD.text_tokens) - textCached)
  const audioOut = n(outD.audio_tokens)
  const textOut = n(outD.text_tokens)
  const cost = empty()
  cost.spraak_in = round((audioIn * r.audioIn) / 1e6)
  cost.tekst_in = round((textIn * r.textIn) / 1e6)
  cost.cache = round((audioCached * r.audioCached + textCached * r.textCached) / 1e6)
  cost.spraak_uit = round((audioOut * r.audioOut) / 1e6)
  cost.tekst_uit = round((textOut * r.textOut) / 1e6)
  return { audio_in: audioIn, audio_in_cached: audioCached, text_in: textIn, text_in_cached: textCached, audio_out: audioOut, text_out: textOut, cost, cost_usd: sum(cost) }
}

/** Kost van het uittypen (transcriptie) van één beurt: per token als OpenAI dat meldt, anders per seconde. */
export function transcriptionCost(usage: { type?: string; seconds?: number; input_tokens?: number; output_tokens?: number } | null | undefined): Counted {
  const cost = empty()
  let audioIn = 0
  let textOut = 0
  if (usage?.type === 'duration') cost.transcriptie = round((n(usage.seconds) / 60) * TRANSCRIBE.perMinute)
  else {
    audioIn = n(usage?.input_tokens)
    textOut = n(usage?.output_tokens)
    cost.transcriptie = round((audioIn * TRANSCRIBE.audioIn + textOut * TRANSCRIBE.textOut) / 1e6)
  }
  return { audio_in: audioIn, audio_in_cached: 0, text_in: 0, text_in_cached: 0, audio_out: 0, text_out: textOut, cost, cost_usd: cost.transcriptie }
}

export const sum = (c: Partial<CostParts>) => round(Object.values(c).reduce<number>((a, b) => a + (Number(b) || 0), 0))

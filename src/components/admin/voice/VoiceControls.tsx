'use client'

import { cn } from '@/utilities/ui'
import { Spinner } from '../ui'
import type { PendingAction, VoiceStatus } from './useVoice'

const STATUS: Record<VoiceStatus, string> = {
  uit: '',
  verbinden: 'Verbinden…',
  luistert: 'Luistert…',
  denkt: 'Denkt na…',
  spreekt: 'Spreekt…',
}

const eur = (v: number) => `€${v.toFixed(2).replace('.', ',')}`

/** Microfoonknop links van de verstuurknop. */
export function MicButton({ status, onStart, onStop }: { status: VoiceStatus; onStart: () => void; onStop: () => void }) {
  const on = status !== 'uit'
  return (
    <button
      type="button"
      onClick={on ? onStop : onStart}
      aria-pressed={on}
      aria-label={on ? 'Gesprek met de spraakbot stoppen' : 'Praten met de spraakbot'}
      title={on ? 'Gesprek stoppen' : 'Praten (spraakbot)'}
      className={cn(
        'ikr-btn relative flex size-11 shrink-0 items-center justify-center rounded-full',
        on ? 'bg-[#C8371D] text-white' : 'bg-ikr-cream-light text-ikr-navy hover:bg-white',
      )}
    >
      {status === 'verbinden' ? <Spinner /> : <MicIcon />}
      {on && status !== 'verbinden' && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-[#C8371D]/30 motion-reduce:hidden" />}
    </button>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 17v4" />
    </svg>
  )
}

/** Status van het gesprek, wachtende wijzigingen (met knoppen) en fouten. */
export function VoiceStrip({
  status,
  busyTool,
  pending,
  spend,
  waitingGrokbot,
  error,
  onDecide,
  onStop,
  onClearError,
}: {
  status: VoiceStatus
  busyTool: string | null
  pending: PendingAction[]
  spend: { vandaag: number; limiet: number } | null
  waitingGrokbot: boolean
  error: string | null
  onDecide: (id: string, beslissing: 'bevestig' | 'annuleer') => void
  onStop: () => void
  onClearError: () => void
}) {
  if (status === 'uit' && !error && !pending.length) return null
  return (
    <div className="flex flex-col gap-1.5 px-1 text-xs">
      {status !== 'uit' && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-live="polite">
          <span className="flex items-center gap-1.5 font-semibold">
            <span aria-hidden="true" className="size-2 rounded-full bg-[#C8371D]" />
            Spraakbot · {STATUS[status]}
            {busyTool && <span className="font-normal text-[#5E5670]">({busyTool.replace(/_/g, ' ')})</span>}
          </span>
          {waitingGrokbot && (
            <span className="flex items-center gap-1 text-[#5E5670]">
              <Spinner /> Grok Bot is bezig
            </span>
          )}
          {spend && (
            <span className="text-[#5E5670]">
              Vandaag {eur(spend.vandaag)} van {eur(spend.limiet)}
            </span>
          )}
          <button type="button" onClick={onStop} className="ml-auto rounded-full bg-ikr-cream-light px-2.5 py-1 font-semibold hover:bg-white">
            Stoppen
          </button>
        </div>
      )}
      {pending.map((p) => (
        <div key={p.id} role="group" aria-label="Wijziging wacht op bevestiging" className="flex flex-wrap items-center gap-2 rounded-2xl border-l-4 border-[#E0A100] bg-[#FFF6DD] px-3 py-2 text-[13px]">
          <span className="min-w-0 flex-[1_1_220px]">
            <span className="font-semibold">Bevestigen?</span> {p.samenvatting}
          </span>
          <button
            type="button"
            disabled={p.busy}
            onClick={() => onDecide(p.id, 'bevestig')}
            className="ikr-btn rounded-full bg-ikr-navy px-3 py-1.5 font-semibold text-ikr-cream-light disabled:opacity-60"
          >
            {p.busy ? <Spinner /> : 'Bevestig'}
          </button>
          <button type="button" disabled={p.busy} onClick={() => onDecide(p.id, 'annuleer')} className="ikr-btn rounded-full bg-white px-3 py-1.5 font-semibold disabled:opacity-60">
            Annuleer
          </button>
        </div>
      ))}
      {error && (
        <span role="alert" className="flex items-center gap-2 text-[#A3470F]">
          {error}
          <button type="button" onClick={onClearError} aria-label="Melding sluiten" className="opacity-60 hover:opacity-100">
            ✕
          </button>
        </span>
      )}
    </div>
  )
}

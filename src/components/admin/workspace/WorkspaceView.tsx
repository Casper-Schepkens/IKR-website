'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { decideCardActionAction, deleteCardAction, giveOrderAction, markCardReadAction, replyCardAction, setCardStatusAction } from '@/app/admin/workspace-actions'
import { CARD_KINDS, isBusy, type CardStatus, type CardWithMessages } from '@/lib/admin/workspace/types'
import { buttonClass, Card, Empty, input, muted, Pill, Spinner, Title } from '../ui'
import { cn } from '@/utilities/ui'

const KIND_TONE = { bespreken: 'teal', brainstorm: 'purple', vraag: 'yellow', update: 'light', opdracht: 'cyan' } as const
const STATUS_LABEL: Record<CardStatus, string> = { open: 'Open', besproken: 'Besproken', archief: 'Archief' }
const when = (iso: string) => new Date(iso).toLocaleString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })

type Run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void
function useRun() {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const run: Run = (fn, after) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis.')
      else after?.()
      router.refresh()
    })
  return { pending, error, run }
}

export function WorkspaceView({ cards, names, me, ownerName, canOrderFor }: { cards: CardWithMessages[]; names: Record<string, string>; me: string; ownerName: string; canOrderFor: string | null }) {
  const [tab, setTab] = useState<CardStatus>('open')
  const [selected, setSelected] = useState<string | null>(null)
  const list = cards.filter((c) => c.status === tab)
  const counts = { open: 0, besproken: 0, archief: 0 } as Record<CardStatus, number>
  for (const c of cards) counts[c.status]++
  const sel = cards.find((c) => c.id === selected) ?? null

  return (
    <>
      <OrderBox ownerName={ownerName} canOrderFor={canOrderFor} />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
        {(Object.keys(STATUS_LABEL) as CardStatus[]).map((s) => (
          <button key={s} type="button" aria-pressed={tab === s} onClick={() => setTab(s)} className={buttonClass(tab === s ? 'navy' : 'light', true)}>
            {STATUS_LABEL[s]} <span className="opacity-60">{counts[s]}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-2">
          {!list.length && <Empty>{tab === 'open' ? 'Niets open. Grok Bot zet hier zelf dingen klaar (2 à 3 keer per dag), of geef hem hierboven een opdracht.' : 'Leeg.'}</Empty>}
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id === selected ? null : c.id)}
              aria-pressed={c.id === selected}
              className={cn('flex flex-col gap-1.5 rounded-2xl bg-ikr-cream-light p-4 text-left shadow-sm transition hover:bg-white', c.id === selected && 'ring-2 ring-ikr-navy')}
            >
              <span className="flex flex-wrap items-center gap-1.5">
                <Pill tone={KIND_TONE[c.kind]}>{CARD_KINDS[c.kind]}</Pill>
                {c.action_status === 'voorgesteld' && <Pill tone="orange">Wacht op jou</Pill>}
                {isBusy(c) && <Pill tone="neutral">Grok Bot denkt na…</Pill>}
                {c.unread && c.owner_email === me && <span className="size-2 rounded-full bg-[#EB6834]" aria-label="nieuw" />}
                <span className={cn('ml-auto text-xs', muted)}>{when(c.updated_at)}</span>
              </span>
              <span className="font-bold">{c.title}</span>
              <span className={cn('line-clamp-2 text-sm', muted)}>{c.messages.at(-1)?.body ?? c.body}</span>
            </button>
          ))}
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">{sel ? <CardDetail key={sel.id} card={sel} names={names} me={me} /> : <p className={cn('m-0 hidden text-sm lg:block', muted)}>Kies een kaart om ze te openen en verder te praten.</p>}</div>
      </div>
    </>
  )
}

function OrderBox({ ownerName, canOrderFor }: { ownerName: string; canOrderFor: string | null }) {
  const { pending, error, run } = useRun()
  const ref = useRef<HTMLFormElement>(null)
  return (
    <Card className="flex flex-col gap-2">
      <form
        ref={ref}
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          run(() => giveOrderAction(data), () => ref.current?.reset())
        }}
      >
        <label className="text-sm font-semibold" htmlFor="order">
          Opdracht voor Grok Bot{canOrderFor ? ` (op de werkplek van ${ownerName})` : ''}
        </label>
        {canOrderFor && <input type="hidden" name="for" value={canOrderFor} />}
        <textarea id="order" name="text" rows={2} required placeholder='bv. "Werk 5 contentideeën uit voor Oh!Ma rond de feestdagen" of "Zoek uit waarom Chez Albert nog niet betaald heeft"' className={cn(input, 'resize-y py-2.5')} />
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className={buttonClass('navy', true)}>
            Geef opdracht
          </button>
          {pending && <Spinner />}
          <span className={cn('text-xs', muted)}>Grok Bot zet dingen klaar, maar verstuurt nooit iets.</span>
          {error && (
            <span role="alert" className="text-xs text-[#A3470F]">
              {error}
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}

function CardDetail({ card: c, names, me }: { card: CardWithMessages; names: Record<string, string>; me: string }) {
  const { pending, error, run } = useRun()
  const [confirm, setConfirm] = useState(false)
  const ref = useRef<HTMLFormElement>(null)
  const unread = c.unread && c.owner_email === me
  useEffect(() => {
    if (unread) void markCardReadAction(c.id)
  }, [unread, c.id])
  const name = (a: string) => (a === 'grokbot' ? 'Grok Bot' : (names[a] ?? a.split('@')[0]))
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={KIND_TONE[c.kind]}>{CARD_KINDS[c.kind]}</Pill>
        <span className={cn('text-xs', muted)}>
          {name(c.created_by)} · {when(c.created_at)}
        </span>
      </div>
      <Title className="m-0 text-2xl">{c.title}</Title>
      {c.body && <p className="m-0 text-sm leading-relaxed whitespace-pre-line">{c.body}</p>}
      {c.link && (
        <a href={c.link} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">
          Open link
        </a>
      )}

      {c.action_label && (
        <div className={cn('flex flex-col gap-2 rounded-2xl p-3', c.action_status === 'voorgesteld' ? 'bg-[#FFF0C2]' : 'bg-ikr-cream')}>
          <p className="m-0 text-sm font-bold">Voorstel: {c.action_label}</p>
          {c.action_detail && <p className="m-0 text-sm whitespace-pre-line">{c.action_detail}</p>}
          {c.action_status === 'voorgesteld' ? (
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => run(() => decideCardActionAction(c.id, true))} className={buttonClass('navy', true)}>
                Doe maar
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => decideCardActionAction(c.id, false))} className={buttonClass('soft', true)}>
                Nee
              </button>
            </div>
          ) : (
            <p className={cn('m-0 text-xs', muted)}>{c.action_status === 'goedgekeurd' ? 'Goedgekeurd: Grok Bot is ermee bezig.' : c.action_status === 'uitgevoerd' ? 'Klaargezet door Grok Bot.' : 'Afgewezen.'}</p>
          )}
        </div>
      )}

      <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Draadje">
        {c.messages.map((m) => (
          <li key={m.id} className={cn('flex flex-col rounded-2xl px-3 py-2 text-sm', m.author === 'grokbot' ? 'mr-6 bg-ikr-cream' : 'ml-6 bg-[#D3F3F9]')}>
            <span className={cn('text-[11px] font-semibold', muted)}>
              {name(m.author)} · {when(m.created_at)}
            </span>
            <span className="whitespace-pre-line">{m.body}</span>
          </li>
        ))}
        {isBusy(c) && <li className={cn('mr-6 rounded-2xl bg-ikr-cream px-3 py-2 text-sm', muted)}>Grok Bot denkt na…</li>}
      </ol>

      <form
        ref={ref}
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          run(() => replyCardAction(c.id, data), () => ref.current?.reset())
        }}
      >
        <textarea name="text" rows={2} required aria-label="Antwoord" placeholder="Antwoord of vraag verder…" className={cn(input, 'flex-1 resize-y py-2')} />
        <button type="submit" disabled={pending} className={buttonClass('navy', true)}>
          Stuur
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-[#E6DFD2] pt-3">
        {(['open', 'besproken', 'archief'] as CardStatus[])
          .filter((s) => s !== c.status)
          .map((s) => (
            <button key={s} type="button" disabled={pending} onClick={() => run(() => setCardStatusAction(c.id, s))} className={buttonClass('soft', true)}>
              {s === 'open' ? 'Terug open' : s === 'besproken' ? 'Besproken' : 'Archiveren'}
            </button>
          ))}
        {confirm ? (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => deleteCardAction(c.id))} className="ikr-btn inline-flex min-h-9 items-center rounded-full bg-[#B42318] px-3 text-xs font-semibold text-white">
              Ja, verwijder
            </button>
            <button type="button" onClick={() => setConfirm(false)} className={buttonClass('soft', true)}>
              Annuleer
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="ikr-btn ml-auto inline-flex min-h-9 items-center rounded-full bg-[#F8D3D0] px-3 text-xs font-semibold text-[#8E1B12]">
            Verwijder
          </button>
        )}
        {pending && <Spinner />}
        {error && (
          <span role="alert" className="text-xs text-[#A3470F]">
            {error}
          </span>
        )}
      </div>
    </Card>
  )
}

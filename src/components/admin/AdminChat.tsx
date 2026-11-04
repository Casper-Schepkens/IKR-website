'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { getChatAction, sendChatAction } from '@/app/admin/chat-actions'
import type { ChatMessage } from '@/lib/admin/chat/repo'
import { Icon, muted, Spinner } from './ui'
import { cn } from '@/utilities/ui'

type State = { messages: ChatMessage[]; thinking: boolean }

/** Marge waarbinnen we "onderaan" rekenen (px). */
const BOTTOM_SLACK = 80
export const isNearBottom = (el: {
  scrollHeight: number
  scrollTop: number
  clientHeight: number
}) => el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SLACK

const time = (iso: string) =>
  new Date(iso).toLocaleString('nl-BE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * Chat met Grok Bot op elke admin-pagina (staat in de layout, dus blijft bij het wisselen van pagina).
 * Smalle balk bovenaan; "uitklappen" opent het paneel met de geschiedenis (nieuwste onderaan).
 */
export function AdminChat({ initial }: { initial: State }) {
  const pathname = usePathname()
  const [state, setState] = useState<State>(initial)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [seenId, setSeenId] = useState<string | null>(initial.messages.at(-1)?.id ?? null)
  const [pending, start] = useTransition()
  const listRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    const res = await getChatAction()
    if (res.ok) setState(res.data)
  }, [])

  // Live bijwerken zolang het paneel open is of Grok Bot nadenkt.
  useEffect(() => {
    if (!open && !state.thinking) return
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [open, state.thinking, refresh])

  // Enkel mee naar onder scrollen als de gebruiker al (bijna) onderaan staat; anders de positie
  // laten en een knop "Nieuwe berichten" tonen.
  const atBottomRef = useRef(true)
  const [newBelow, setNewBelow] = useState(false)
  const lastId = state.messages.at(-1)?.id ?? null

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight })
    atBottomRef.current = true
    setNewBelow(false)
    setSeenId(lastId)
  }, [lastId])

  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    atBottomRef.current = isNearBottom(el)
    if (atBottomRef.current) {
      setNewBelow(false)
      setSeenId(lastId)
    }
  }

  // Bij openen: naar het nieuwste bericht.
  useEffect(() => {
    if (open) scrollToBottom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Nieuw bericht of "denkt na": enkel volgen als de gebruiker onderaan stond.
  useEffect(() => {
    if (!open) return
    if (atBottomRef.current) scrollToBottom()
    else if (lastId && lastId !== seenId) setNewBelow(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, state.thinking])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const send = () => {
    const t = text.trim()
    if (!t || pending) return
    start(async () => {
      setError(null)
      const res = await sendChatAction(t, pathname)
      if (!res.ok) return setError(res.error)
      setText('')
      setState(res.data)
      atBottomRef.current = true // eigen bericht: altijd naar onder
    })
  }

  const last = state.messages.at(-1)
  const unseenReply = !open && last?.role === 'bot' && last.id !== seenId ? last : null
  const busy = pending || state.thinking

  const input = (big: boolean) => (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <label className="sr-only" htmlFor={big ? 'chat-panel-input' : 'chat-bar-input'}>
        Bericht aan Grok Bot
      </label>
      <textarea
        id={big ? 'chat-panel-input' : 'chat-bar-input'}
        rows={big ? 2 : 1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        placeholder="Vraag iets aan Grok Bot…"
        className={cn(
          'min-w-0 flex-1 resize-none rounded-2xl border-0 bg-ikr-cream-light px-4 py-2.5 text-sm text-ikr-navy outline-none focus-visible:ring-2 focus-visible:ring-ikr-cyan',
          big ? 'min-h-12' : 'min-h-11',
        )}
      />
      <button
        type="submit"
        disabled={pending || !text.trim()}
        data-pending={pending}
        aria-label="Versturen"
        className="ikr-btn flex size-11 shrink-0 items-center justify-center rounded-full bg-ikr-navy text-ikr-cream-light disabled:opacity-60"
      >
        {pending ? <Spinner /> : <span aria-hidden="true">↑</span>}
      </button>
    </form>
  )

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 -mt-6 flex flex-col gap-1 bg-ikr-cream/95 px-4 pt-3 pb-2 backdrop-blur sm:-mx-9 sm:px-9">
        <div className="flex items-center gap-2">
          <span className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold sm:flex">
            <Icon.sparkle size={14} /> Grok Bot
          </span>
          <div className="min-w-0 flex-1">{input(false)}</div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Chat uitklappen"
            title="Chat uitklappen"
            className="ikr-btn relative flex size-11 shrink-0 items-center justify-center rounded-full bg-ikr-cream-light text-ikr-navy hover:bg-white"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ⤢
            </span>
            {unseenReply && (
              <span
                className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-ikr-cyan"
                aria-label="Nieuw antwoord"
              />
            )}
          </button>
        </div>
        {(busy || unseenReply || error) && !open && (
          <div className="flex min-w-0 items-center gap-2 px-1 text-xs">
            {busy ? (
              <span className="flex items-center gap-1.5 font-semibold">
                <Spinner /> Grok Bot denkt na…
              </span>
            ) : unseenReply ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="min-w-0 truncate text-left"
              >
                <span className="font-semibold">Grok Bot:</span> {unseenReply.text}
              </button>
            ) : null}
            {error && (
              <span role="alert" className="text-[#A3470F]">
                {error}
              </span>
            )}
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-ikr-navy/30"
          onClick={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Chat met Grok Bot"
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full flex-col gap-3 bg-ikr-cream p-4 shadow-xl sm:w-[460px]"
          >
            <header className="flex items-center gap-2">
              <Icon.sparkle size={16} />
              <h2 className="m-0 text-base font-bold">Grok Bot</h2>
              <span className={cn('text-xs', muted)}>· enkel jouw chat</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Sluiten"
                className="ikr-btn ml-auto flex size-9 items-center justify-center rounded-full bg-ikr-cream-light"
              >
                <Icon.close size={16} />
              </button>
            </header>
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                ref={listRef}
                onScroll={onScroll}
                data-testid="chat-list"
                className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
              >
                {!state.messages.length && (
                  <p className={cn('m-0 text-sm', muted)}>Nog geen berichten. Vraag iets!</p>
                )}
                {state.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex flex-col gap-0.5',
                      m.role === 'user' ? 'items-end' : 'items-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line',
                        m.role === 'user'
                          ? 'bg-ikr-navy text-ikr-cream-light'
                          : 'bg-ikr-cream-light text-ikr-navy',
                      )}
                    >
                      {m.text}
                    </div>
                    <span className={cn('px-1 text-[11px]', muted)}>
                      {time(m.created_at)}
                      {m.role === 'user' && m.page
                        ? ` · ${m.page.replace('/admin', '') || '/'}`
                        : ''}
                      {m.object_type ? ` · ${m.object_type}` : ''}
                    </span>
                  </div>
                ))}
                {state.thinking && (
                  <div className="flex items-center gap-2 self-start rounded-2xl bg-ikr-cream-light px-3.5 py-2 text-sm font-semibold">
                    <Spinner /> Grok Bot denkt na…
                  </div>
                )}
              </div>
              {newBelow && (
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="ikr-btn absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ikr-navy px-3.5 py-1.5 text-xs font-semibold text-ikr-cream-light shadow-md"
                >
                  Nieuwe berichten ↓
                </button>
              )}
            </div>
            {error && (
              <span role="alert" className="text-sm text-[#A3470F]">
                {error}
              </span>
            )}
            {input(true)}
          </section>
        </div>
      )}
    </>
  )
}

'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { askAction } from '@/app/admin/actions'
import { Icon } from './ui'
import { useApiAi } from './AiMode'
import { claudePrompts, claudeUrl } from '@/lib/admin/claude-prompts'

/** Zoekbalk = IKR AI. ⌘K / Ctrl+K zet de focus. */
export function CommandBar({ placeholder }: { placeholder?: string }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const apiAi = useApiAi()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <form
        role="search"
        className="flex min-h-[52px] items-center gap-2.5 rounded-full bg-ikr-cream-light pr-2 pl-[18px] text-[#5E5670]"
        onSubmit={(e) => {
          e.preventDefault()
          if (!question.trim()) return
          if (!apiAi) {
            const prompt = claudePrompts.ask(question)
            navigator.clipboard?.writeText(prompt).catch(() => {})
            window.open(claudeUrl(prompt), '_blank', 'noopener')
            setAnswer('Geopend in Claude. De vraag staat ook op je klembord.')
            return
          }
          setError(null)
          start(async () => {
            const res = await askAction(question)
            if (res.ok) setAnswer(res.data)
            else setError(res.error)
          })
        }}
      >
        <Icon.sparkle className="shrink-0 text-[#0B7F93]" />
        <input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          aria-label="Vraag IKR AI iets"
          placeholder={
            placeholder ?? 'Vraag IKR AI iets…  bv. “welke draaidagen staan er volgende week?”'
          }
          className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ikr-navy outline-none placeholder:text-[#8A8296]"
        />
        {pending ? (
          <span className="px-3 text-xs font-semibold">Denkt na…</span>
        ) : (
          <kbd className="hidden rounded-lg bg-ikr-cream px-2.5 py-1.5 font-sans text-xs text-[#5E5670] sm:inline">
            ⌘K
          </kbd>
        )}
      </form>
      {(answer || error) && (
        <div
          role="status"
          className="relative rounded-2xl bg-ikr-navy p-5 pr-12 text-[15px] leading-relaxed whitespace-pre-line text-ikr-cream-light"
        >
          <button
            type="button"
            aria-label="Sluiten"
            onClick={() => {
              setAnswer(null)
              setError(null)
            }}
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-[#B9B2C9] hover:bg-white/10"
          >
            <Icon.close size={16} />
          </button>
          {error ? <span className="text-[#FCE3D2]">{error}</span> : answer}
        </div>
      )}
    </div>
  )
}

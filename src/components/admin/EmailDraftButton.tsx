'use client'

import { useState, useTransition } from 'react'
import { draftEmailAction } from '@/app/admin/actions'
import type { EmailPurpose } from '@/lib/admin/ai/tasks'
import { buttonClass, Icon, input, Spinner } from './ui'
import { useApiAi } from './AiMode'
import { OpenInClaude } from './OpenInClaude'
import { claudePrompts } from '@/lib/admin/claude-prompts'

type Draft = { subject: string; body: string; to: string | null }

/** Laat IKR AI een mail opstellen; toont het concept om te kopiëren of in je mailprogramma te openen. */
export function EmailDraftButton({
  clientId,
  purpose,
  label,
  variant = 'soft',
  clientName,
}: {
  clientId: string
  clientName: string
  purpose: EmailPurpose
  label: string
  variant?: 'soft' | 'cyan' | 'navy' | 'light'
}) {
  const [pending, start] = useTransition()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const apiAi = useApiAi()

  if (!apiAi) {
    return (
      <OpenInClaude prompt={claudePrompts.email(clientName, purpose)} variant={variant}>
        {label}
      </OpenInClaude>
    )
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        data-pending={pending}
        aria-busy={pending}
        className={buttonClass(variant, true)}
        onClick={() => {
          setError(null)
          start(async () => {
            const res = await draftEmailAction(clientId, purpose)
            if (res.ok) setDraft(res.data)
            else setError(res.error)
          })
        }}
      >
        {pending ? <Spinner /> : <Icon.sparkle size={14} className="text-[#0B7F93]" />}
        {pending ? 'Mail opstellen…' : label}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-xs font-medium text-[#A3470F]">
          {error}
        </span>
      )}
      {draft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Conceptmail"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ikr-navy/60 p-4"
        >
          <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col gap-4 overflow-auto rounded-3xl bg-ikr-cream-light p-6 text-ikr-navy">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-black uppercase">Conceptmail</h2>
              <button
                type="button"
                aria-label="Sluiten"
                className="flex size-10 items-center justify-center rounded-full hover:bg-ikr-cream"
                onClick={() => setDraft(null)}
              >
                <Icon.close />
              </button>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5E5670]">
              Onderwerp
              <input
                className={input}
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5E5670]">
              Bericht
              <textarea
                className={`${input} min-h-72 leading-relaxed`}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap gap-2.5">
              <a
                className={buttonClass('navy', true)}
                href={`mailto:${draft.to ?? ''}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
              >
                <Icon.mail size={16} /> Open in mail
              </a>
              <button
                type="button"
                className={buttonClass('soft', true)}
                onClick={async () => {
                  await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? 'Gekopieerd' : 'Kopieer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  )
}

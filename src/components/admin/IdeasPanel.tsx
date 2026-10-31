'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ContentIdea, IdeaStatus, Template } from '@/lib/admin/types'
import { IDEA_STATUS_LABELS } from '@/lib/admin/types'
import {
  addIdeaAction,
  createDeckAction,
  developIdeaAction,
  generateIdeasAction,
  grokDevelopIdeaAction,
  setIdeaStatusAction,
  updateIdeaAction,
} from '@/app/admin/actions'
import { buttonClass, Icon, input, label, muted, Pill, Spinner, type Tone } from './ui'
import { useGrok } from './AiMode'
import { ActionButton } from './ActionButton'
import { FormAction } from './FormAction'
import { cn } from '@/utilities/ui'
import { claudePrompts } from '@/lib/admin/claude-prompts'

const STATUS_TONE: Record<IdeaStatus, Tone> = {
  proposal: 'neutral',
  developed: 'teal',
  approved: 'green',
  rejected: 'orange',
  produced: 'navy',
}

const FILTERS: { key: 'all' | IdeaStatus; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'proposal', label: 'Voorstel' },
  { key: 'developed', label: 'Uitgewerkt' },
  { key: 'approved', label: 'Goedgekeurd' },
  { key: 'rejected', label: 'Afgekeurd' },
]

function Section({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  if (!items.length) return null
  const List = ordered ? 'ol' : 'ul'
  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn('text-[11px] font-bold tracking-[0.06em] uppercase', muted)}>
        {title}
      </span>
      <List
        className={cn(
          'm-0 pl-[18px] text-sm leading-relaxed',
          ordered ? 'list-decimal' : 'list-disc',
        )}
      >
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </List>
    </div>
  )
}

function IdeaCard({
  idea,
  clientName,
  selected,
  onToggle,
}: {
  idea: ContentIdea
  clientName: string
  selected: boolean
  onToggle: () => void
}) {
  const [open, setOpen] = useState(idea.status === 'developed' && Boolean(idea.hook))
  const [editing, setEditing] = useState(false)
  const developed = Boolean(idea.hook || idea.structure.length)
  // Komt er een (nieuwe) uitwerking binnen, bv. van Grok: kaart openklappen.
  const lastHook = useRef(idea.hook)
  useEffect(() => {
    if (idea.hook && idea.hook !== lastHook.current) setOpen(true)
    lastHook.current = idea.hook
  }, [idea.hook])
  const router = useRouter()
  const [pending, start] = useTransition()
  const grok = useGrok()
  // Bij Grok: nog geen antwoord, en minder dan 30 minuten geleden gevraagd (anders opnieuw toelaten).
  const atGrok =
    idea.dev_status === 'requested' &&
    Boolean(idea.dev_requested_at) &&
    Date.now() - Date.parse(idea.dev_requested_at!) < 30 * 60_000

  const reject = () => {
    const feedback = window.prompt('Waarom afgekeurd? (IKR AI leert hieruit voor deze klant)') ?? ''
    start(async () => {
      await setIdeaStatusAction(idea.id, 'rejected', feedback.trim() || undefined)
      router.refresh()
    })
  }

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-[22px] bg-ikr-cream-light p-5',
        selected && 'shadow-[inset_0_0_0_2px_#0FC1DE]',
        idea.status === 'rejected' && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Selecteer idee: ${idea.title}`}
          className="mt-1 size-5 shrink-0 accent-[#0FC1DE]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="text-left text-[17px] font-bold hover:text-[#0B7F93]"
            >
              {idea.title}
            </button>
            <Pill tone={STATUS_TONE[idea.status]}>{IDEA_STATUS_LABELS[idea.status]}</Pill>
            {idea.format && <Pill>{idea.format}</Pill>}
            {idea.source === 'manual' && <Pill tone="light">Manueel</Pill>}
            {atGrok && (
              <Pill tone="purple">
                <Spinner /> Bij Grok…
              </Pill>
            )}
          </div>
          {idea.summary && (
            <p className={cn('m-0 text-sm leading-normal', muted)}>{idea.summary}</p>
          )}
          {idea.feedback && <p className="m-0 text-sm text-[#8A3A0C]">Feedback: {idea.feedback}</p>}
        </div>
      </div>

      {open && developed && !editing && (
        <div className="flex flex-col gap-4 pl-8">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            {idea.hook && (
              <div className="flex flex-col gap-1.5 rounded-[14px] bg-ikr-cream p-3.5">
                <span className={cn('text-[11px] font-bold tracking-[0.06em]', muted)}>
                  HOOK (0–2 S)
                </span>
                <span className="text-[15px] leading-snug font-semibold">“{idea.hook}”</span>
              </div>
            )}
            {idea.cta && (
              <div className="flex flex-col gap-1.5 rounded-[14px] bg-ikr-cream p-3.5">
                <span className={cn('text-[11px] font-bold tracking-[0.06em]', muted)}>CTA</span>
                <span className="text-[15px] leading-snug font-semibold">“{idea.cta}”</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Section title="Opbouw" items={idea.structure} ordered />
            <Section title="Shots" items={idea.shots} />
            <Section title="Nodig" items={idea.needs} />
          </div>
        </div>
      )}

      {editing && (
        <FormAction
          action={updateIdeaAction.bind(null, idea.id)}
          className="pl-8"
          onSuccess={() => setEditing(false)}
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
            <label className={label}>
              Titel
              <input name="title" defaultValue={idea.title} className={input} />
            </label>
            <label className={label}>
              Format
              <input name="format" defaultValue={idea.format ?? ''} className={input} />
            </label>
          </div>
          <label className={label}>
            Omschrijving
            <textarea
              name="summary"
              defaultValue={idea.summary ?? ''}
              className={cn(input, 'min-h-16')}
            />
          </label>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
            <label className={label}>
              Hook
              <input name="hook" defaultValue={idea.hook ?? ''} className={input} />
            </label>
            <label className={label}>
              CTA
              <input name="cta" defaultValue={idea.cta ?? ''} className={input} />
            </label>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <label className={label}>
              Opbouw (1 per regel)
              <textarea
                name="structure"
                defaultValue={idea.structure.join('\n')}
                className={cn(input, 'min-h-28')}
              />
            </label>
            <label className={label}>
              Shots (1 per regel)
              <textarea
                name="shots"
                defaultValue={idea.shots.join('\n')}
                className={cn(input, 'min-h-28')}
              />
            </label>
            <label className={label}>
              Nodig (1 per regel)
              <textarea
                name="needs"
                defaultValue={idea.needs.join('\n')}
                className={cn(input, 'min-h-28')}
              />
            </label>
          </div>
        </FormAction>
      )}

      <div className="flex flex-wrap items-start gap-2 pl-8">
        {!developed ? (
          <ActionButton
            action={() => developIdeaAction(idea.id)}
            aiSize="big"
            claudePrompt={claudePrompts.develop(clientName, idea.title)}
            variant="cyan"
            ai
            pendingText="Uitwerken…"
          >
            Uitwerken
          </ActionButton>
        ) : (
          <>
            <button
              type="button"
              className={buttonClass('soft', true)}
              onClick={() => setOpen(!open)}
            >
              {open ? 'Inklappen' : 'Bekijk uitwerking'}
            </button>
            <ActionButton
              action={() => {
                const instruction = window.prompt(
                  'Wat moet er anders? (bv. "meer humor", "korter", "in de toon van de klant")',
                )
                if (!instruction) return Promise.resolve({ ok: true as const, data: undefined })
                return developIdeaAction(idea.id, instruction)
              }}
              aiSize="big"
              claudePrompt={claudePrompts.develop(
                clientName,
                idea.title,
                '[schrijf hier wat er anders moet]',
              )}
              ai
              pendingText="Herschrijven…"
            >
              Herschrijf
            </ActionButton>
          </>
        )}
        {grok && !atGrok && (
          <ActionButton
            action={() => {
              const instruction = developed
                ? window.prompt('Wat moet Grok anders doen? (leeg = gewoon opnieuw uitwerken)')
                : null
              if (developed && instruction === null)
                return Promise.resolve({ ok: true as const, data: undefined })
              return grokDevelopIdeaAction(idea.id, instruction?.trim() || undefined)
            }}
            pendingText="Naar Grok…"
          >
            {developed ? 'Herschrijf met Grok' : 'Uitwerken met Grok'}
          </ActionButton>
        )}
        <button
          type="button"
          className={buttonClass('soft', true)}
          onClick={() => setEditing(!editing)}
        >
          {editing ? 'Annuleer' : 'Bewerken'}
        </button>
        {idea.status !== 'approved' && (
          <ActionButton action={() => setIdeaStatusAction(idea.id, 'approved')}>
            Goedkeuren
          </ActionButton>
        )}
        {idea.status !== 'rejected' && (
          <button
            type="button"
            disabled={pending}
            className={buttonClass('soft', true)}
            onClick={reject}
          >
            Afkeuren
          </button>
        )}
        {idea.status === 'approved' && (
          <ActionButton action={() => setIdeaStatusAction(idea.id, 'produced')}>
            Gemaakt
          </ActionButton>
        )}
      </div>
    </article>
  )
}

export function IdeasPanel({
  clientId,
  clientName,
  ideas,
  templates,
}: {
  clientId: string
  clientName: string
  ideas: ContentIdea[]
  templates: Template[]
}) {
  const [filter, setFilter] = useState<'all' | IdeaStatus>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? '')
  const [showGenerate, setShowGenerate] = useState(ideas.length === 0)
  const [count, setCount] = useState(5)
  const [focus, setFocus] = useState('')
  const [deckMsg, setDeckMsg] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: ideas.filter((i) => i.status !== 'rejected').length }
    for (const i of ideas) c[i.status] = (c[i.status] ?? 0) + 1
    return c
  }, [ideas])

  const visible = ideas.filter((i) =>
    filter === 'all' ? i.status !== 'rejected' : i.status === filter,
  )
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <section aria-label="Content-ideeën" className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={buttonClass(filter === f.key ? 'navy' : 'light', true)}
          >
            {f.label} {counts[f.key] ?? 0}
          </button>
        ))}
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            className={buttonClass('light', true)}
            onClick={() => setShowGenerate(!showGenerate)}
          >
            <Icon.sparkle size={14} className="text-[#0B7F93]" /> Nieuwe ideeën
          </button>
        </span>
      </div>

      {showGenerate && (
        <div className="flex flex-col gap-4 rounded-[22px] bg-ikr-navy p-5 text-ikr-cream-light">
          <div className="flex items-center gap-2">
            <Icon.sparkle className="text-ikr-cyan" />
            <span className="font-display text-xl font-black uppercase">
              Laat IKR AI ideeën bedenken
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-[1_1_320px] flex-col gap-1.5 text-[13px] font-semibold text-[#B9B2C9]">
              Focus (optioneel)
              <input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="bv. “zomeractie”, “meer medewerkers in beeld”, “reeks-formats”"
                className={cn(input, 'bg-ikr-cream-light')}
              />
            </label>
            <label className="flex w-28 flex-col gap-1.5 text-[13px] font-semibold text-[#B9B2C9]">
              Aantal
              <input
                type="number"
                min={1}
                max={12}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className={cn(input, 'bg-ikr-cream-light')}
              />
            </label>
            <ActionButton
              action={() => generateIdeasAction(clientId, count, focus)}
              aiSize="big"
              claudePrompt={claudePrompts.ideas(clientName, count || 5, focus.trim() || undefined)}
              variant="cyan"
              small={false}
              pendingText="IKR AI denkt na…"
              onDone={() => {
                setFocus('')
                setShowGenerate(false)
                setFilter('proposal')
              }}
            >
              Genereer
            </ActionButton>
          </div>
          <details className="text-sm text-[#B9B2C9]">
            <summary className="cursor-pointer">Of voeg zelf een idee toe</summary>
            <FormAction
              action={addIdeaAction.bind(null, clientId)}
              resetOnSuccess
              submitVariant="cyan"
              submitLabel="Toevoegen"
              className="mt-3"
            >
              <input
                name="title"
                required
                placeholder="Titel"
                className={cn(input, 'bg-ikr-cream-light')}
                aria-label="Titel"
              />
              <textarea
                name="summary"
                placeholder="Korte omschrijving"
                className={cn(input, 'bg-ikr-cream-light')}
                aria-label="Omschrijving"
              />
            </FormAction>
          </details>
        </div>
      )}

      {!visible.length && (
        <p className={cn('m-0 rounded-[22px] bg-ikr-cream-light p-5 text-sm', muted)}>
          {ideas.length
            ? 'Geen ideeën met deze status.'
            : 'Nog geen ideeën. Laat IKR AI er een paar bedenken.'}
        </p>
      )}
      {visible.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          clientName={clientName}
          selected={selected.includes(idea.id)}
          onToggle={() => toggle(idea.id)}
        />
      ))}

      {selected.length > 0 && (
        <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-[20px] bg-ikr-navy py-3.5 pr-4 pl-[22px] text-ikr-cream-light shadow-lg">
          <span className="flex-[1_1_200px] text-[15px] font-semibold">
            <span className="text-ikr-cyan">
              {selected.length} {selected.length === 1 ? 'idee' : 'ideeën'}
            </span>{' '}
            geselecteerd
          </span>
          <label className="flex items-center gap-2 text-[13px] text-[#B9B2C9]">
            Template
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="min-h-10 rounded-full border-0 bg-ikr-cream-light px-3.5 text-sm font-semibold text-ikr-navy"
            >
              <option value="">Zonder template (IKR-stijl)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <ActionButton
            action={() => createDeckAction(clientId, selected, templateId || null)}
            aiSize="account"
            claudePrompt={claudePrompts.deck(
              clientName,
              ideas.filter((i) => selected.includes(i.id)).map((i) => i.title),
              templates.find((t) => t.id === templateId)?.name,
            )}
            variant="cyan"
            small={false}
            ai
            pendingText="Starten…"
            onDone={() => {
              setSelected([])
              setDeckMsg(
                'De presentatie wordt gemaakt (1–4 minuten). Je vindt ze onder het tabblad Decks.',
              )
            }}
          >
            Maak presentatie
          </ActionButton>
        </div>
      )}
      {deckMsg && (
        <p role="status" className="m-0 rounded-2xl bg-[#D3F3F9] p-4 text-sm text-[#0A5F6E]">
          {deckMsg}
        </p>
      )}
    </section>
  )
}

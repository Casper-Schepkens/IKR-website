'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { importWhatsappAction } from '@/app/admin/whatsapp-actions'
import { batches, parseExport, textFromZip, toImportRows, type ParsedExport } from '@/lib/admin/whatsapp/export'
import { buttonClass, input, muted, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Historiek van een chat importeren uit WhatsApp → "Chat exporteren" (.txt, of .zip van een iPhone).
 * Het bestand wordt in de browser gelezen; enkel de berichten (zonder media) gaan naar het dashboard.
 */
export function ImportHistory({ jid, label, me }: { jid: string; label: string; me: string }) {
  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState<ParsedExport | null>(null)
  const [self, setSelf] = useState('')
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  const read = async (file: File) => {
    setError(null)
    setProgress(null)
    try {
      const text = /\.zip$/i.test(file.name) || file.type.includes('zip') ? await textFromZip(await file.arrayBuffer()) : await file.text()
      const p = parseExport(text)
      if (!p.messages.length) throw new Error('Geen berichten gevonden. Is dit een export van WhatsApp ("Chat exporteren")?')
      setParsed(p)
      setSelf(p.senders.find((s) => s.toLowerCase() === me.toLowerCase()) ?? p.senders.find((s) => s.toLowerCase().startsWith(me.toLowerCase())) ?? '')
    } catch (e) {
      setParsed(null)
      setError(e instanceof Error ? e.message : 'Kon het bestand niet lezen.')
    }
  }

  const run = () =>
    start(async () => {
      if (!parsed) return
      setError(null)
      const groups = batches(toImportRows(parsed, self || null))
      let nieuw = 0
      let overgeslagen = 0
      for (const [i, b] of groups.entries()) {
        setProgress(`Bezig: deel ${i + 1} van ${groups.length}…`)
        const res = await importWhatsappAction(jid, b)
        if (!res.ok) {
          setError(res.error)
          setProgress(null)
          return
        }
        nieuw += res.data?.nieuw ?? 0
        overgeslagen += res.data?.overgeslagen ?? 0
      }
      setProgress(`Klaar: ${nieuw} berichten geïmporteerd${overgeslagen ? `, ${overgeslagen} overgeslagen (al bewaard)` : ''}.`)
      setParsed(null)
      router.refresh()
    })

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn('self-start text-xs font-semibold text-[#0B7F93] underline')}>
        Historiek importeren
      </button>
    )

  const first = parsed?.messages[0]
  const last = parsed?.messages.at(-1)
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/60 p-3 text-sm">
      <p className={cn('m-0 text-xs', muted)}>
        In WhatsApp: open de chat → naam bovenaan (of ⋮ → Meer) → <strong>Chat exporteren</strong> → <strong>Zonder media</strong>. Upload hier het bestand (.txt of .zip). Het wordt in je
        browser gelezen; enkel de tekst gaat naar het dashboard. Opnieuw importeren geeft geen dubbels.
      </p>
      <input
        type="file"
        accept=".txt,.zip,text/plain,application/zip"
        aria-label={`Export van ${label}`}
        onChange={(e) => {
          const f = e.currentTarget.files?.[0]
          if (f) void read(f)
        }}
        className="text-sm"
      />
      {parsed && first && last && (
        <div className="flex flex-col gap-2">
          <p className="m-0">
            <strong>{parsed.messages.length}</strong> berichten van {day(first.date)} tot {day(last.date)} · {parsed.senders.length} afzenders
            {parsed.skipped ? ` · ${parsed.skipped} systeemregels overgeslagen` : ''}
          </p>
          <label className="flex max-w-sm flex-col gap-1 text-xs font-semibold">
            Wie ben jij in deze export? (jouw berichten tellen als &quot;uit&quot;)
            <select value={self} onChange={(e) => setSelf(e.target.value)} className={cn(input, 'min-h-9 py-1 text-sm')}>
              <option value="">(niemand)</option>
              {parsed.senders.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <button type="button" disabled={pending} onClick={run} className={buttonClass('navy', true)}>
              {pending && <Spinner />} Importeren
            </button>
            <button type="button" disabled={pending} onClick={() => (setParsed(null), setOpen(false))} className={buttonClass('soft', true)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
      {progress && <p className="m-0 text-xs text-[#1E5B27]">{progress}</p>}
      {error && (
        <p role="alert" className="m-0 text-xs text-[#A3470F]">
          {error}
        </p>
      )}
    </div>
  )
}

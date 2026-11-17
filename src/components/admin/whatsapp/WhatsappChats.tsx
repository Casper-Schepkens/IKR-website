'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveWhatsappChatAction } from '@/app/admin/whatsapp-actions'
import { buttonClass, Card, Empty, input, muted, Pill, Spinner, Title } from '../ui'
import { cn } from '@/utilities/ui'

export type ChatView = {
  jid: string
  label: string
  groep: boolean
  lead_id: string | null
  klant_id: string | null
  actief: boolean
  laatst_actief: string | null
  berichten: { id: string; richting: 'in' | 'uit'; tekst: string | null; media_type: string | null; tijdstip: string; afzender: string | null }[]
}
type Option = { id: string; label: string }

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'onbekend'
const MEDIA: Record<string, string> = { image: 'foto', video: 'video', audio: 'spraakbericht', document: 'document', sticker: 'sticker', location: 'locatie', contact: 'contact', poll: 'poll', other: 'bericht' }

/** Gedetecteerde WhatsApp-chats koppelen aan een lead of klant en actief zetten. */
export function WhatsappChats({ chats, leads, klanten }: { chats: ChatView[]; leads: Option[]; klanten: Option[] }) {
  const [q, setQ] = useState('')
  const match = (c: ChatView) => !q.trim() || `${c.label} ${c.jid}`.toLowerCase().includes(q.trim().toLowerCase())
  const active = chats.filter((c) => c.actief && match(c))
  const rest = chats.filter((c) => !c.actief && match(c))
  return (
    <>
      <label className="flex max-w-md flex-col gap-1 text-xs font-semibold">
        Zoeken
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam of nummer" className={cn(input, "bg-white")} />
      </label>
      <Card className="flex flex-col gap-2">
        <Title className="m-0 text-2xl">Actief ({active.length})</Title>
        <p className={cn('m-0 text-sm', muted)}>Van deze chats bewaart de bridge nieuwe berichten. Grok Bot leest ze via whatsapp_gesprekken.</p>
        {active.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {active.map((c) => (
              <ChatRow key={c.jid} chat={c} leads={leads} klanten={klanten} />
            ))}
          </ul>
        ) : (
          <Empty>Nog geen actieve chats. Koppel hieronder een chat aan een lead of klant en zet hem actief.</Empty>
        )}
      </Card>
      <Card className="flex flex-col gap-2">
        <Title className="m-0 text-2xl">Gedetecteerd ({rest.length})</Title>
        <p className={cn('m-0 text-sm', muted)}>Van deze chats staat enkel de naam en het laatste tijdstip hier, nooit de inhoud.</p>
        {rest.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {rest.slice(0, 200).map((c) => (
              <ChatRow key={c.jid} chat={c} leads={leads} klanten={klanten} />
            ))}
          </ul>
        ) : (
          <Empty>{q ? 'Niets gevonden.' : 'Nog geen chats gedetecteerd.'}</Empty>
        )}
        {rest.length > 200 && <p className={cn('m-0 text-xs', muted)}>De 200 meest recente; zoek om andere te vinden.</p>}
      </Card>
    </>
  )
}

function ChatRow({ chat: c, leads, klanten }: { chat: ChatView; leads: Option[]; klanten: Option[] }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  return (
    <li className="flex flex-col gap-2 border-t border-[#E6DFD2] py-3 first:border-t-0">
      <form
        className="grid grid-cols-1 items-end gap-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          start(async () => {
            setError(null)
            setSaved(false)
            const res = await saveWhatsappChatAction(c.jid, data)
            if (!res.ok) return setError(res.error)
            setSaved(true)
            router.refresh()
          })
        }}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-1.5 font-bold">
            <span className="truncate">{c.label}</span>
            {c.groep && <Pill tone="light">groep</Pill>}
          </span>
          <span className={cn('text-xs', muted)}>laatst actief: {when(c.laatst_actief)}</span>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Lead
          <select name="lead_id" defaultValue={c.lead_id ?? ''} className={cn(input, 'min-h-9 py-1 text-sm')}>
            <option value="">(geen)</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Klant
          <select name="klant_id" defaultValue={c.klant_id ?? ''} className={cn(input, 'min-h-9 py-1 text-sm')}>
            <option value="">(geen)</option>
            {klanten.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-9 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="actief" defaultChecked={c.actief} className="size-4 accent-ikr-navy" />
          Actief
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className={buttonClass('navy', true)}>
            {pending && <Spinner />} Bewaar
          </button>
          {saved && !pending && <span className="text-xs text-[#1E5B27]">Bewaard</span>}
        </div>
      </form>
      {error && (
        <p role="alert" className="m-0 text-sm text-[#A3470F]">
          {error}
        </p>
      )}
      {c.actief && (
        <details className="rounded-xl bg-white/50 px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold">Laatste berichten ({c.berichten.length})</summary>
          {c.berichten.length ? (
            <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-sm">
              {c.berichten.map((b) => (
                <li key={b.id} className={cn('max-w-[85%] rounded-xl px-3 py-1.5', b.richting === 'uit' ? 'self-end bg-[#DDF2DF]' : 'self-start bg-ikr-cream')}>
                  <span className={cn('block text-[11px]', muted)}>
                    {b.richting === 'uit' ? 'IKR' : (b.afzender ?? c.label)} · {when(b.tijdstip)}
                  </span>
                  {b.tekst ?? <em className={muted}>[{MEDIA[b.media_type ?? 'other'] ?? 'bericht'}]</em>}
                  {b.tekst && b.media_type && <em className={cn('ml-1 text-xs', muted)}>({MEDIA[b.media_type] ?? b.media_type})</em>}
                </li>
              ))}
            </ul>
          ) : (
            <p className={cn('m-0 mt-2 text-sm', muted)}>Nog geen berichten bewaard sinds deze chat actief staat.</p>
          )}
        </details>
      )}
    </li>
  )
}

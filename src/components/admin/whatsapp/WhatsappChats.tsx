'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveWhatsappChatAction } from '@/app/admin/whatsapp-actions'
import { ImportHistory } from './ImportHistory'
import { buttonClass, Card, Empty, input, muted, Pill, Spinner, Title } from '../ui'
import { cn } from '@/utilities/ui'

export type ChatView = {
  jid: string
  label: string
  naamWhatsapp: string | null
  naamEigen: string | null
  telefoon: string | null
  groep: boolean
  /** Groep met Casper, Milan én Cédric. */
  heleTeam: boolean
  deelnemers: number | null
  /** Lead met hetzelfde nummer (voorstel). */
  suggestie: { id: string; label: string } | null
  lead_id: string | null
  klant_id: string | null
  intern: boolean
  actief: boolean
  laatst_actief: string | null
  berichten: { id: string; richting: 'in' | 'uit'; tekst: string | null; media_type: string | null; tijdstip: string; afzender: string | null }[]
}
type Option = { id: string; label: string }

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'onbekend'
const MEDIA: Record<string, string> = { image: 'foto', video: 'video', audio: 'spraakbericht', document: 'document', sticker: 'sticker', location: 'locatie', contact: 'contact', poll: 'poll', other: 'bericht' }

/** Gedetecteerde WhatsApp-chats koppelen aan een lead of klant en actief zetten. */
export function WhatsappChats({ chats, leads, klanten, me }: { chats: ChatView[]; leads: Option[]; klanten: Option[]; me: string }) {
  const [q, setQ] = useState('')
  const match = (c: ChatView) => !q.trim() || `${c.label} ${c.naamWhatsapp ?? ''} ${c.telefoon ?? ''} ${c.jid}`.toLowerCase().includes(q.trim().toLowerCase())
  const active = chats.filter((c) => c.actief && match(c))
  const rest = chats.filter((c) => !c.actief && match(c))
  // Groepen met het hele team (meestal klantgroepen) eerst.
  const team = rest.filter((c) => c.heleTeam)
  const other = rest.filter((c) => !c.heleTeam)
  return (
    <>
      <label className="flex max-w-md flex-col gap-1 text-xs font-semibold">
        Zoeken
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam of nummer" className={cn(input, "bg-adm-raised")} />
      </label>
      <Card className="flex flex-col gap-2">
        <Title className="m-0 text-2xl">Actief ({active.length})</Title>
        <p className={cn('m-0 text-sm', muted)}>Van deze chats bewaart de bridge nieuwe berichten. Grok Bot leest ze via whatsapp_gesprekken.</p>
        {active.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {active.map((c) => (
              <ChatRow key={c.jid} chat={c} leads={leads} klanten={klanten} me={me} />
            ))}
          </ul>
        ) : (
          <Empty>Nog geen actieve chats. Koppel hieronder een chat aan een lead of klant en zet hem actief.</Empty>
        )}
      </Card>
      <Card className="flex flex-col gap-2">
        <Title className="m-0 text-2xl">Gedetecteerd ({rest.length})</Title>
        <p className={cn('m-0 text-sm', muted)}>Van deze chats staat enkel de naam en het laatste tijdstip hier, nooit de inhoud.</p>
        {team.length > 0 && (
          <section aria-label="Groepen met het hele team" className="flex flex-col gap-1 rounded-2xl bg-adm-teal-bg/40 p-3">
            <h3 className="m-0 text-sm font-bold tracking-wide uppercase">Groepen met het hele team ({team.length})</h3>
            <p className={cn('m-0 text-xs', muted)}>Casper, Milan en Cédric zitten erin: meestal een klantgroep. Koppel ze aan de klant.</p>
            <ul className="m-0 flex list-none flex-col p-0">
              {team.map((c) => (
                <ChatRow key={c.jid} chat={c} leads={leads} klanten={klanten} me={me} />
              ))}
            </ul>
          </section>
        )}
        {other.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {other.slice(0, 200).map((c) => (
              <ChatRow key={c.jid} chat={c} leads={leads} klanten={klanten} me={me} />
            ))}
          </ul>
        ) : (
          !team.length && <Empty>{q ? 'Niets gevonden.' : 'Nog geen chats gedetecteerd.'}</Empty>
        )}
        {other.length > 200 && <p className={cn('m-0 text-xs', muted)}>De 200 meest recente; zoek om andere te vinden.</p>}
      </Card>
    </>
  )
}

function ChatRow({ chat: c, leads, klanten, me }: { chat: ChatView; leads: Option[]; klanten: Option[]; me: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  return (
    <li className="flex flex-col gap-2 border-t border-adm-line py-3 first:border-t-0">
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
        <div className="flex min-w-0 flex-col gap-1">
          <label className="flex flex-col gap-0.5 text-xs font-semibold">
            <span className="flex flex-wrap items-center gap-1.5">
              Naam {c.groep && <Pill tone="light">groep{c.deelnemers ? ` · ${c.deelnemers}` : ''}</Pill>}
              {c.heleTeam && <Pill tone="teal">hele team</Pill>}
              {c.intern && <Pill tone="purple">intern</Pill>}
            </span>
            <input
              name="naam_eigen"
              defaultValue={c.naamEigen ?? ''}
              placeholder={c.naamWhatsapp ?? c.label}
              maxLength={300}
              aria-label={`Eigen naam voor ${c.label}`}
              className={cn(input, 'min-h-9 py-1 text-sm font-bold')}
            />
          </label>
          <span className={cn('text-xs', muted)}>
            {c.telefoon && <>{c.telefoon} · </>}
            {c.naamEigen && c.naamWhatsapp && <>in WhatsApp: {c.naamWhatsapp} · </>}
            laatst actief: {when(c.laatst_actief)}
          </span>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Lead
          <select name="lead_id" defaultValue={c.lead_id ?? c.suggestie?.id ?? ''} className={cn(input, 'min-h-9 py-1 text-sm')}>
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
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-xs font-semibold" title="Interne chat (bv. de teamgroep): zonder lead of klant">
            <input type="checkbox" name="intern" defaultChecked={c.intern} className="size-4 accent-adm-fg" />
            Intern (IKR-team)
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="actief" defaultChecked={c.actief} className="size-4 accent-adm-fg" />
            Actief
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className={buttonClass('navy', true)}>
            {pending && <Spinner />} Bewaar
          </button>
          {saved && !pending && <span className="text-xs text-adm-green">Bewaard</span>}
        </div>
      </form>
      {c.suggestie && (
        <p className="m-0 text-xs text-adm-teal">
          Voorstel: zelfde nummer als lead <strong>{c.suggestie.label}</strong> (al ingevuld; klik Bewaar om te koppelen).
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-adm-warn">
          {error}
        </p>
      )}
      {(c.lead_id || c.klant_id || c.intern) && <ImportHistory jid={c.jid} label={c.label} me={me} />}
      {c.actief && (
        <details className="rounded-xl bg-adm-raised/50 px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold">Laatste berichten ({c.berichten.length})</summary>
          {c.berichten.length ? (
            <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-sm">
              {c.berichten.map((b) => (
                <li key={b.id} className={cn('max-w-[85%] rounded-xl px-3 py-1.5 whitespace-pre-line', b.richting === 'uit' ? 'self-end bg-adm-green-bg' : 'self-start bg-adm-soft')}>
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

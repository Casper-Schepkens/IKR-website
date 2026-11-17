import { requireSales } from '@/lib/admin/session'
import { chatLabel, whatsappFor } from '@/lib/admin/whatsapp/service'
import { Card, muted, PageHeader } from '@/components/admin/ui'
import { WhatsappChats, type ChatView } from '@/components/admin/whatsapp/WhatsappChats'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'WhatsApp' }

/**
 * WhatsApp (read-only): chats die de bridge detecteerde. Koppel ze aan een lead of klant en zet ze
 * actief; enkel van actieve chats worden berichten bewaard. Er wordt nooit iets verstuurd.
 */
export default async function WhatsappPage() {
  const session = await requireSales()
  const repo = await whatsappFor(session)
  const [chats, leads, clients] = await Promise.all([repo.chats().catch(() => null), session.leads.list(), session.clients.list()])
  const active = (chats ?? []).filter((c) => c.actief)
  // Laatste berichten van de actieve chats (één query), per chat de 10 nieuwste.
  const recent = await repo.messages(active.map((c) => c.jid), Math.min(1000, active.length * 40)).catch(() => [])
  const view: ChatView[] = (chats ?? []).map((c) => ({
    jid: c.jid,
    label: chatLabel(c),
    groep: c.is_groep,
    lead_id: c.lead_id,
    klant_id: c.klant_id,
    actief: c.actief,
    laatst_actief: c.laatst_actief,
    berichten: c.actief ? recent.filter((b) => b.jid === c.jid).slice(0, 10).reverse() : [],
  }))
  return (
    <>
      <PageHeader eyebrow={`Read-only via de WhatsApp-bridge · ${active.length} actief`} title="WhatsApp" />
      {chats === null ? (
        <Card>
          <p role="alert" className="m-0 text-sm text-[#A3470F]">
            De WhatsApp-tabellen zijn niet bereikbaar.
          </p>
        </Card>
      ) : !chats.length ? (
        <Card className="flex flex-col gap-2">
          <p className="m-0 font-semibold">Nog geen chats gedetecteerd.</p>
          <p className={cn('m-0 text-sm', muted)}>
            Deploy de bridge (map <code>whatsapp-bridge/</code>, zie README) en koppel ze via de QR-code. De chats verschijnen hier vanzelf.
          </p>
        </Card>
      ) : (
        <WhatsappChats
          chats={view}
          leads={leads.map((l) => ({ id: l.id, label: l.company ? `${l.name} (${l.company})` : l.name })).sort((a, b) => a.label.localeCompare(b.label))}
          klanten={clients.map((c) => ({ id: c.id, label: c.name })).sort((a, b) => a.label.localeCompare(b.label))}
        />
      )}
    </>
  )
}

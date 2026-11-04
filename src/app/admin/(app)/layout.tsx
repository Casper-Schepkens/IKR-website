import { requireAdmin } from '@/lib/admin/session'
import { canSeeSales } from '@/lib/admin/env'
import { Sidebar } from '@/components/admin/Sidebar'
import { AdminChat } from '@/components/admin/AdminChat'
import { LiveData } from '@/components/admin/LiveData'
import { chatState } from '@/lib/admin/chat/service'
import { liveStamp } from '@/lib/admin/live-stamp'

export const dynamic = 'force-dynamic'

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  const { user, mode } = session
  // Chat met Grok Bot op elke pagina; geschiedenis uit de database (enkel die van deze gebruiker).
  const [chat, stamp] = await Promise.all([
    chatState(session).catch(() => ({ messages: [], thinking: false })),
    // Stand van de data bij deze render: LiveData vergelijkt daarmee, zodat niets tussen render en eerste controle verloren gaat.
    liveStamp(session).catch(() => null),
  ])
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar name={user.name} email={user.email} demo={mode === 'demo'} sales={canSeeSales(user.email)} />
      <main className="flex min-w-0 flex-1 flex-col gap-7 px-4 pt-6 pb-14 sm:px-9">
        <AdminChat initial={chat} />
        <LiveData stamp={stamp} />
        {children}
      </main>
    </div>
  )
}

import { requireAdmin } from '@/lib/admin/session'
import { canSeeSales } from '@/lib/admin/env'
import { Sidebar } from '@/components/admin/Sidebar'
import { AdminChat } from '@/components/admin/AdminChat'
import { chatState } from '@/lib/admin/chat/service'

export const dynamic = 'force-dynamic'

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  const { user, mode } = session
  // Chat met Grok Bot op elke pagina; geschiedenis uit de database (enkel die van deze gebruiker).
  const chat = await chatState(session).catch(() => ({ messages: [], thinking: false }))
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar name={user.name} email={user.email} demo={mode === 'demo'} sales={canSeeSales(user.email)} />
      <main className="flex min-w-0 flex-1 flex-col gap-7 px-4 pt-6 pb-14 sm:px-9">
        <AdminChat initial={chat} />
        {children}
      </main>
    </div>
  )
}

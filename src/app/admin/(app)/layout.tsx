import { requireAdmin } from '@/lib/admin/session'
import { canSeeSales } from '@/lib/admin/env'
import { Sidebar } from '@/components/admin/Sidebar'

export const dynamic = 'force-dynamic'

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const { user, mode } = await requireAdmin()
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar name={user.name} email={user.email} demo={mode === 'demo'} sales={canSeeSales(user.email)} />
      <main className="flex min-w-0 flex-1 flex-col gap-7 px-4 pt-6 pb-14 sm:px-9">{children}</main>
    </div>
  )
}

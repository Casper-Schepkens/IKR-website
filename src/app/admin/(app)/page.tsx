import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/session'
import { canSeeSales } from '@/lib/admin/env'
import { Card, muted, PageHeader } from '@/components/admin/ui'

export const metadata = { title: 'Dashboard' }

/** Elk teamlid krijgt een eigen dashboard; voorlopig bestaat enkel dat van Casper (sales). */
export default async function AdminHome() {
  const { user } = await requireAdmin()
  if (canSeeSales(user.email)) redirect('/admin/sales')
  return (
    <>
      <PageHeader eyebrow={`Hey ${user.name}`} title="Dashboard" />
      <Card>
        <p className={`m-0 ${muted}`}>Jouw dashboard wordt gebouwd zodra jouw workflow in kaart is gebracht.</p>
      </Card>
    </>
  )
}

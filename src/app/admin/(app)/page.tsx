import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/session'
import { canSeeSales } from '@/lib/admin/env'

/** Startpagina per persoon: Casper begint bij sales, de rest bij de weekly. */
export default async function AdminHome() {
  const { user } = await requireAdmin()
  redirect(canSeeSales(user.email) ? '/admin/sales' : '/admin/weekly')
}

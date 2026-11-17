import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/session'
import { isSalesOwner } from '@/lib/admin/env'

/** Startpagina per persoon: Casper begint bij sales, de rest bij de weekly. */
export default async function AdminHome() {
  const { user } = await requireAdmin()
  redirect(isSalesOwner(user.email) ? '/admin/sales' : '/admin/weekly')
}

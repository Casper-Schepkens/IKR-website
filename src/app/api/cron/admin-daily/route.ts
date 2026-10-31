import { NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/admin/supabase/server'
import { createSupabaseRepo } from '@/lib/admin/data/supabase'
import { isServiceRoleConfigured } from '@/lib/admin/env'
import { prepareUpcomingInvoices } from '@/lib/admin/jobs'
import { syncTikTok } from '@/lib/admin/integrations/tiktok'
import { addDays, isoDay } from '@/lib/admin/format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Dagelijkse admin-job (Vercel Cron):
 * - facturen van de komende 14 dagen klaarzetten
 * - verstuurde facturen > 30 dagen zonder betaling op 'te laat' zetten
 * - TikTok-statistieken ophalen
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isServiceRoleConfigured())
    return NextResponse.json({ skipped: 'supabase niet geconfigureerd' })

  const db = createServiceSupabase()
  const repo = createSupabaseRepo(db)
  const result: Record<string, unknown> = {}

  try {
    result.invoicesPrepared = await prepareUpcomingInvoices(repo, 14)
  } catch (err) {
    result.invoicesError = String(err)
  }

  try {
    const cutoff = isoDay(addDays(new Date(), -30))
    const { data, error } = await db
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('status', 'sent')
      .lt('send_date', cutoff)
      .select('id')
    if (error) throw error
    result.markedOverdue = data?.length ?? 0
  } catch (err) {
    result.overdueError = String(err)
  }

  try {
    result.tiktok = await syncTikTok(db)
  } catch (err) {
    result.tiktokError = String(err)
  }

  return NextResponse.json(result)
}

import { NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/admin/supabase/server'
import { supabaseClients } from '@/lib/admin/clients/repo'
import { supabaseProduction } from '@/lib/admin/production/repo'
import { queueIdeaDocs } from '@/lib/admin/ai/ideeendoc'
import { cronAuthorized, finishCron } from '@/lib/admin/cron'

export const maxDuration = 60

/**
 * Dagelijks: voor elke klant waarvan een draaidag voorbij is (datum in het verleden of draaidagstap af)
 * precies één AI-taak "ideeendoc" voor Grok Bot. Een tweede run maakt niets dubbel.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createServiceSupabase()
  const results = await queueIdeaDocs(supabaseProduction(db), await supabaseClients(db).list(), { by: 'cron' })
  const problems = results.filter((r) => r.resultaat.startsWith('fout')).map((r) => `${r.klant}: ${r.resultaat}`)
  return finishCron('ideeendocs', { aangemaakt: results.filter((r) => r.resultaat === 'aangemaakt').length, results }, problems)
}

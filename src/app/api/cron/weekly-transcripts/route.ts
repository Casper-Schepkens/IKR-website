import { NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/admin/supabase/server'
import { supabaseWeekly } from '@/lib/admin/weekly/repo'
import { findTranscript, isFirefliesConfigured } from '@/lib/admin/fireflies'
import { removeFilePermission, shareWithDomain, uploadDoc } from '@/lib/admin/google'
import { CONTACT_EMAIL } from '@/lib/admin/weekly/types'
import { isoDay } from '@/lib/admin/format'
import { queueWeeklySops } from '@/lib/admin/sops/weekly'

export const maxDuration = 60

/**
 * Dagelijks: zet het Fireflies-transcript van afgesloten online weeklies (laatste 14 dagen)
 * als Google Doc in de Drive van contact@ en bewaart de link bij de weekly.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Veiligheidsnet calls: een setter-opname die voor Fireflies tijdelijk via een link deelbaar was, na 24 uur
  // altijd weer afsluiten (normaal gebeurt dat al zodra het transcript binnen is).
  const revoked = await revokeOldRecordingLinks().catch((e: unknown) => `fout: ${e instanceof Error ? e.message : String(e)}`)
  if (!isFirefliesConfigured()) return NextResponse.json({ skipped: 'FIREFLIES_API_KEY ontbreekt', revoked })

  const repo = supabaseWeekly(createServiceSupabase())
  const since = Date.now() - 14 * 86_400_000
  const todo = (await repo.listWeeklies()).filter(
    (w) =>
      w.mode === 'online' &&
      w.status === 'concluded' &&
      !w.recording_url &&
      w.meet_url &&
      new Date(w.starts_at).getTime() >= since,
  )

  const results: { weekly: string; result: string }[] = []
  for (const w of todo) {
    try {
      const start = new Date(w.starts_at)
      const t = await findTranscript(w.meet_url!, new Date(start.getTime() - 3_600_000), new Date(start.getTime() + 6 * 3_600_000))
      if (!t) {
        results.push({ weekly: w.id, result: 'nog geen transcript' })
        continue
      }
      const day = isoDay(start)
      const text = `IKR weekly ${day}\n${t.url ? `Fireflies: ${t.url}\n` : ''}\n${t.text}`
      const fileId = await uploadDoc({ owner: CONTACT_EMAIL, folder: 'IKR Dashboard – Weeklies', name: `Weekly ${day} – transcript`, text })
      const url = await shareWithDomain(CONTACT_EMAIL, fileId, 'iknowright.be')
      await repo.updateWeekly(w.id, { recording_url: url })
      // Vangnet (als de webhook het transcript miste): SOP-voorstellen. Dubbel kan niet (één taak per transcript).
      await queueWeeklySops({ id: t.id, title: t.title ?? `Weekly ${day}`, date: w.starts_at, text: t.text, url: t.url }, { background: true }).catch((e) => console.error('[sops] weekly', e))
      results.push({ weekly: w.id, result: 'transcript opgeslagen' })
    } catch (e) {
      results.push({ weekly: w.id, result: e instanceof Error ? e.message : 'mislukt' })
    }
  }
  return NextResponse.json({ checked: todo.length, results })
}

async function revokeOldRecordingLinks() {
  const db = createServiceSupabase()
  const { data } = await db
    .from('calls')
    .select('id, recording_file_id, recording_public_permission, updated_at')
    .not('recording_public_permission', 'is', null)
    .lt('updated_at', new Date(Date.now() - 86_400_000).toISOString())
  let n = 0
  // Weeklies: zelfde vangnet voor opnames die naar Fireflies gingen.
  const { data: ws } = await db.from('weeklies').select('id, recording_file_id, recording_public_permission').not('recording_public_permission', 'is', null).lt('starts_at', new Date(Date.now() - 86_400_000).toISOString())
  for (const w of ws ?? []) {
    await removeFilePermission(CONTACT_EMAIL, w.recording_file_id, w.recording_public_permission).catch(() => undefined)
    await db.from('weeklies').update({ recording_public_permission: null }).eq('id', w.id)
    n++
  }
  for (const c of data ?? []) {
    await removeFilePermission(CONTACT_EMAIL, c.recording_file_id, c.recording_public_permission).catch(() => undefined)
    await db.from('calls').update({ recording_public_permission: null }).eq('id', c.id)
    n++
  }
  return n
}

import { NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/admin/supabase/server'
import { supabaseWeekly } from '@/lib/admin/weekly/repo'
import { findTranscript, isFirefliesConfigured } from '@/lib/admin/fireflies'
import { shareWithDomain, uploadDoc } from '@/lib/admin/google'
import { CONTACT_EMAIL } from '@/lib/admin/weekly/types'
import { isoDay } from '@/lib/admin/format'

export const maxDuration = 60

/**
 * Dagelijks: zet het Fireflies-transcript van afgesloten online weeklies (laatste 14 dagen)
 * als Google Doc in de Drive van contact@ en bewaart de link bij de weekly.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isFirefliesConfigured()) return NextResponse.json({ skipped: 'FIREFLIES_API_KEY ontbreekt' })

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
      results.push({ weekly: w.id, result: 'transcript opgeslagen' })
    } catch (e) {
      results.push({ weekly: w.id, result: e instanceof Error ? e.message : 'mislukt' })
    }
  }
  return NextResponse.json({ checked: todo.length, results })
}

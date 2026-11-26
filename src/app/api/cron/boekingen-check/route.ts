import { NextResponse } from 'next/server'
import { cronAuthorized, finishCron } from '@/lib/admin/cron'
import { serverBookingDeps } from '@/lib/booking/deps'
import { agendaCheck, weeklyCheckMail } from '@/lib/booking/check'
import { resendMailer } from '@/lib/booking/mail'

export const maxDuration = 60

/**
 * Elke maandag: per teamlid nakijken of zijn agenda leesbaar is en of er afspraken in zijn weekuren
 * vallen, en hem dat mailen (naar zijn meldingsadres). Zo valt een vergeten afspraak of een verlopen
 * agenda-koppeling op voor er een lead op komt.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const deps = serverBookingDeps()
  if (!deps) return finishCron('boekingen_check', {}, ['Boekingen niet ingesteld.'])
  const config = await deps.store.loadConfig()
  const reports = await agendaCheck(deps, { fresh: true })
  const problems: string[] = []
  const result = []
  for (const r of reports) {
    // Wie nooit iets instelde en niet meedoet, krijgt geen mail.
    if (!r.hasHours && !r.active) continue
    try {
      await resendMailer(weeklyCheckMail(r, config.settings.horizon_days))
      result.push({ teamlid: r.name, fout: r.error, botsingen: r.conflicts.length, vrij: r.freeSlots })
    } catch (e) {
      problems.push(`${r.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return finishCron('boekingen_check', { result }, problems)
}

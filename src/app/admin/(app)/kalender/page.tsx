import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { canSeeSales } from '@/lib/admin/env'
import { monthGrid, shiftMonth } from '@/lib/admin/calendar/core'
import { loadCalendar } from '@/lib/admin/calendar/service'
import { buttonClass, Card, PageHeader } from '@/components/admin/ui'
import { CalendarView } from '@/components/admin/calendar/CalendarView'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Kalender' }

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())
}

/** Kalender (hele team): de contact@-agenda gespiegeld, met filters op weekly, calls, draaidagen … Enkel lezen. */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { user } = await requireAdmin()
  const sp = await searchParams
  const day = today()
  const month = sp.m && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m) ? sp.m : day.slice(0, 7)
  const { days } = monthGrid(month)
  const res = await loadCalendar(days[0], days.at(-1)!).catch((e: unknown) => ({ status: 'not_connected' as const, reason: e instanceof Error ? e.message : 'Agenda lezen mislukt.' }))
  // Calls openen in het dashboard kan enkel Casper (sales); anderen zien ze wel in de kalender.
  const sales = canSeeSales(user.email)
  const items = res.status === 'ok' ? res.items.map((i) => (!sales && i.href?.startsWith('/admin/sales') ? { ...i, href: null } : i)) : []
  const [y, m] = month.split('-').map(Number)
  return (
    <>
      <PageHeader eyebrow={`Bron: contact@-agenda${res.status === 'ok' && res.demo ? ' (demo)' : ''}`} title="Kalender" />
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/kalender?m=${shiftMonth(month, -1)}`} aria-label="Vorige maand" className={buttonClass('light', true)}>
          ←
        </Link>
        <span className="min-w-40 text-center text-lg font-bold capitalize">
          {MONTHS[m - 1]} {y}
        </span>
        <Link href={`/admin/kalender?m=${shiftMonth(month, 1)}`} aria-label="Volgende maand" className={buttonClass('light', true)}>
          →
        </Link>
        {month !== day.slice(0, 7) && (
          <Link href="/admin/kalender" className={cn(buttonClass('soft', true))}>
            Vandaag
          </Link>
        )}
      </div>
      {res.status !== 'ok' ? (
        <Card>
          <p className="m-0 text-sm text-[#A3470F]">{res.reason}</p>
        </Card>
      ) : (
        <CalendarView items={items} days={days} month={month} today={day} />
      )}
    </>
  )
}

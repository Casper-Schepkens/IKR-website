import { systemStatus } from '@/lib/admin/system-status'
import { fmtDate, fmtTime } from '@/lib/admin/format'
import { Card, muted, Pill, Title } from './ui'
import { cn } from '@/utilities/ui'

const when = (iso: string) => `${fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' })} ${fmtTime(iso)}`

/** Achtergrondtaken: wanneer liepen ze laatst en liep er iets mis. Foutteksten enkel voor Casper. */
export async function SystemStatusCard({ details }: { details: boolean }) {
  const s = await systemStatus().catch(() => null)
  if (!s) return null
  return (
    <Card className="flex flex-col gap-1">
      <Title className="m-0 mb-1 text-2xl">Achtergrondtaken</Title>
      <p className={cn('m-0 mb-2 text-sm', muted)}>
        Wat het dashboard zelf doet, buiten de pagina’s om. Loopt hier iets mis, dan krijgt Instellingen een bolletje.
      </p>
      {s.crons.map((c) => (
        <div key={c.key} className="flex flex-wrap items-center gap-3 border-t border-[#E6DFD2] py-3">
          <div className="flex flex-[1_1_240px] flex-col">
            <span className="font-semibold">{c.label}</span>
            <span className={cn('text-xs', muted)}>{c.lastRun ? `Laatst: ${when(c.lastRun)}` : 'Nog nooit gelopen sinds deze versie'}</span>
            {details && c.ok === false && c.error && <span className="text-xs text-[#A3470F]">{c.error}</span>}
          </div>
          {c.ok === false ? <Pill tone="orange">Mislukt</Pill> : c.late ? <Pill tone="orange">Te laat</Pill> : <Pill tone="green">In orde</Pill>}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 border-t border-[#E6DFD2] py-3">
        <div className="flex flex-[1_1_240px] flex-col">
          <span className="font-semibold">Grok Bot bereikbaar</span>
          <span className={cn('text-xs', muted)}>
            {s.grokFailures.length ? `${s.grokFailures.length}× niet bereikt in de laatste 24 uur, laatst ${when(s.grokFailures[0].at)}` : 'Geen problemen in de laatste 24 uur'}
          </span>
          {details && s.grokFailures[0]?.error && <span className="text-xs text-[#A3470F]">{s.grokFailures[0].error}</span>}
        </div>
        {s.grokFailures.length ? <Pill tone="orange">Probleem</Pill> : <Pill tone="green">In orde</Pill>}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-[#E6DFD2] py-3">
        <div className="flex flex-[1_1_240px] flex-col">
          <span className="font-semibold">AI-taken</span>
          <span className={cn('text-xs', muted)}>{s.failedJobs ? `${s.failedJobs} mislukt in de laatste 24 uur` : 'Geen mislukte taken in de laatste 24 uur'}</span>
        </div>
        {s.failedJobs ? <Pill tone="orange">{s.failedJobs} mislukt</Pill> : <Pill tone="green">In orde</Pill>}
      </div>
    </Card>
  )
}

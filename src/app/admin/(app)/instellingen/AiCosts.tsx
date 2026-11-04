import { listJobs, MODEL } from '@/lib/admin/ai/jobs'
import { fmtDate } from '@/lib/admin/format'
import { Card, Empty, muted, Stat, Title } from '@/components/admin/ui'
import { cn } from '@/utilities/ui'

const LABELS: Record<string, string> = { inbox_reply: 'Antwoord klaarzetten (inbox)', mail_rewrite: 'Mail herschrijven', style_profile: 'Schrijfstijl bijwerken' }
const usd = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)}`
const DAY = 86_400_000

function clock() {
  return Date.now()
}

/** Testweek: wat kost elke AI-taak via de API? Basis om te kiezen tussen API en een eigen server. */
export async function AiCosts() {
  const now = clock()
  const since = new Date(now - 30 * DAY)
  const jobs = (await listJobs(since.toISOString())).filter((j) => j.status === 'done' || j.cost_usd)
  const week = jobs.filter((j) => j.created_at >= new Date(now - 7 * DAY).toISOString())
  const sum = (xs: typeof jobs) => xs.reduce((a, j) => a + Number(j.cost_usd ?? 0), 0)
  const first = jobs.length ? jobs[jobs.length - 1].created_at : null
  const days = first ? Math.max(1, (now - new Date(first).getTime()) / DAY) : 1
  const perMonth = (sum(jobs) / Math.min(days, 30)) * 30
  const types = [...new Set(jobs.map((j) => j.type))]

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <Title className="m-0 text-2xl">AI-kosten</Title>
        <p className={cn('m-0 text-sm', muted)}>
          Via de Claude API ({MODEL}). Schatting in USD op basis van de tokens; de echte factuur staat in de Claude Console.
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <Stat label="Laatste 7 dagen" value={usd(sum(week))} note={`${week.length} taken`} noteTone="muted" />
        <Stat label="Laatste 30 dagen" value={usd(sum(jobs))} note={`${jobs.length} taken`} noteTone="muted" />
        <Stat label="Per maand (geschat)" value={usd(perMonth)} note={first ? `sinds ${fmtDate(first)}` : 'nog geen taken'} noteTone="muted" />
      </div>
      {types.length ? (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className={cn('text-xs', muted)}>
              <th scope="col" className="py-2 pr-3 font-semibold">Taak</th>
              <th scope="col" className="px-3 py-2 font-semibold">Aantal</th>
              <th scope="col" className="px-3 py-2 font-semibold">Gemiddeld</th>
              <th scope="col" className="px-3 py-2 font-semibold">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => {
              const xs = jobs.filter((j) => j.type === t)
              return (
                <tr key={t} className="border-t border-[#E6DFD2]">
                  <td className="py-2.5 pr-3 font-semibold">{LABELS[t] ?? t}</td>
                  <td className="px-3 py-2.5">{xs.length}</td>
                  <td className="px-3 py-2.5">{usd(sum(xs) / xs.length)}</td>
                  <td className="px-3 py-2.5">{usd(sum(xs))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <Empty>Nog geen AI-taken.</Empty>
      )}
    </Card>
  )
}

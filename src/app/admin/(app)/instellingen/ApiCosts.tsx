import { runCost, taskLabel, usd } from '@/lib/admin/ai/costs'
import { fmtDate, fmtTime, TZ } from '@/lib/admin/format'
import type { AiRun, Client } from '@/lib/admin/types'
import { Card, Empty, muted, Pill, Stat, Title } from '@/components/admin/ui'
import { cn } from '@/utilities/ui'

const monthKey = (d: Date | string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).format(new Date(d))

function group<K extends string>(rows: (AiRun & { cost: number })[], key: (r: AiRun) => K) {
  const map = new Map<K, { calls: number; errors: number; cost: number; input: number; output: number; models: Set<string> }>()
  for (const r of rows) {
    const k = key(r)
    const g = map.get(k) ?? { calls: 0, errors: 0, cost: 0, input: 0, output: 0, models: new Set<string>() }
    g.calls++
    if (r.status === 'error') g.errors++
    g.cost += r.cost
    g.input += (r.input_tokens ?? 0) + (r.cache_read_tokens ?? 0) + (r.cache_write_tokens ?? 0)
    g.output += r.output_tokens ?? 0
    if (r.model) g.models.add(r.model)
    map.set(k, g)
  }
  return [...map.entries()].map(([k, g]) => ({ key: k, ...g })).sort((a, b) => b.cost - a.cost)
}

const tokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)

/** Wat de Claude API kost: per maand, per taak, per klant en de laatste oproepen. */
export function ApiCosts({ runs, clients, now }: { runs: AiRun[]; clients: Client[]; now: Date }) {
  const rows = runs.map((r) => ({ ...r, cost: runCost(r) }))
  const thisMonth = monthKey(now)
  const prev = new Date(now)
  prev.setUTCDate(1)
  prev.setUTCMonth(prev.getUTCMonth() - 1)
  const lastMonth = monthKey(prev)

  const mtd = rows.filter((r) => monthKey(r.created_at) === thisMonth)
  const prevRows = rows.filter((r) => monthKey(r.created_at) === lastMonth)
  const sum = (xs: { cost: number }[]) => xs.reduce((a, r) => a + r.cost, 0)
  const mtdCost = sum(mtd)

  // Eenvoudige projectie naar het einde van de maand, op basis van het gemiddelde per dag tot nu.
  const dayOfMonth = Number(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day: 'numeric' }).format(now))
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getDate()
  const projected = dayOfMonth > 0 ? (mtdCost / dayOfMonth) * daysInMonth : 0

  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString()
  const last30 = rows.filter((r) => r.created_at >= since30)
  const byTask = group(last30, (r) => r.task)
  const byClient = group(
    last30.filter((r) => r.client_id),
    (r) => r.client_id!,
  ).slice(0, 8)
  const maxTask = Math.max(...byTask.map((t) => t.cost), 0)
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? 'Onbekend'

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Title className="m-0 text-2xl">API-kosten</Title>
        <span className={cn('text-xs', muted)}>
          Schatting in USD op basis van de gelogde tokens · de echte factuur staat in{' '}
          <a href="https://platform.claude.com/settings/billing" target="_blank" rel="noreferrer" className="underline">
            de Claude Console
          </a>
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <Stat label="Deze maand" value={usd(mtdCost)} note={`${mtd.length} oproepen`} noteTone="muted" />
        <Stat label="Verwacht einde maand" value={usd(projected)} note="aan het huidige tempo" noteTone="muted" />
        <Stat label="Vorige maand" value={usd(sum(prevRows))} note={`${prevRows.length} oproepen`} noteTone="muted" />
        <Stat
          label="Gemiddeld per oproep"
          value={usd(last30.length ? sum(last30) / last30.length : 0)}
          note="laatste 30 dagen"
          noteTone="muted"
        />
      </div>

      {!last30.length ? (
        <Empty>Nog geen AI-oproepen in de laatste 30 dagen.</Empty>
      ) : (
        <>
          <div className="overflow-x-auto">
            <h3 className="m-0 mb-2 text-base font-bold">Wat kost het meest · laatste 30 dagen</h3>
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead>
                <tr className={cn('text-xs', muted)}>
                  <th scope="col" className="py-2 pr-3 font-semibold">Taak</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Oproepen</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Tokens in / uit</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Model</th>
                  <th scope="col" className="w-[30%] px-3 py-2 font-semibold">Kosten</th>
                </tr>
              </thead>
              <tbody>
                {byTask.map((t) => (
                  <tr key={t.key} className="border-t border-[#E6DFD2]">
                    <td className="py-2.5 pr-3 font-semibold">{taskLabel(t.key)}</td>
                    <td className="px-3 py-2.5">
                      {t.calls}
                      {t.errors > 0 && <span className={cn('text-xs', muted)}> · {t.errors} mislukt</span>}
                    </td>
                    <td className={cn('px-3 py-2.5 font-mono text-xs', muted)}>
                      {tokens(t.input)} / {tokens(t.output)}
                    </td>
                    <td className={cn('px-3 py-2.5 text-xs', muted)}>
                      {[...t.models].map((m) => m.replace('claude-', '')).join(', ')}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2 rounded-full bg-ikr-cyan"
                          style={{ width: `${maxTask ? Math.max(2, (t.cost / maxTask) * 100) : 0}%`, maxWidth: '60%' }}
                        />
                        <span className="font-semibold tabular-nums">{usd(t.cost)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-5">
            <div className="min-w-0 flex-[1_1_260px]">
              <h3 className="m-0 mb-2 text-base font-bold">Per klant · laatste 30 dagen</h3>
              {byClient.length ? (
                <ul className="m-0 flex list-none flex-col p-0">
                  {byClient.map((c) => (
                    <li key={c.key} className="flex justify-between gap-3 border-t border-[#E6DFD2] py-2 text-sm">
                      <span>
                        {clientName(c.key)} <span className={cn('text-xs', muted)}>· {c.calls}×</span>
                      </span>
                      <span className="font-semibold tabular-nums">{usd(c.cost)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={cn('m-0 text-sm', muted)}>Nog niets per klant.</p>
              )}
            </div>
            <div className="min-w-0 flex-[2_1_360px]">
              <h3 className="m-0 mb-2 text-base font-bold">Laatste oproepen</h3>
              <ul className="m-0 flex list-none flex-col p-0">
                {rows.slice(0, 12).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#E6DFD2] py-2 text-sm">
                    <span className={cn('w-24 shrink-0 text-xs', muted)}>
                      {fmtDate(r.created_at)} {fmtTime(r.created_at)}
                    </span>
                    <span className="min-w-0 flex-1 font-semibold">
                      {taskLabel(r.task)}
                      {r.client_id && <span className={cn('font-normal', muted)}> · {clientName(r.client_id)}</span>}
                    </span>
                    {r.status === 'error' && <Pill tone="orange">mislukt</Pill>}
                    <span className="tabular-nums">{usd(r.cost)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

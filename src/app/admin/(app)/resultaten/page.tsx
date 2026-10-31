import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { summarizeResults } from '@/lib/admin/results'
import { compactNumber, fmtDate, percent } from '@/lib/admin/format'
import { integrationStatus } from '@/lib/admin/env'
import { ActionButton } from '@/components/admin/ActionButton'
import {
  buttonClass,
  Card,
  Empty,
  Icon,
  muted,
  PageHeader,
  Pill,
  Stat,
  Title,
} from '@/components/admin/ui'
import { analyzeResultsAction } from '../../actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Resultaten' }

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ klant?: string }>
}) {
  const { klant } = await searchParams
  const { repo } = await requireAdmin()
  const [clients, videos, insightsRun] = await Promise.all([
    repo.listClients(),
    repo.listVideosWithStats({ clientId: klant || undefined }),
    repo.latestAiRun('results_insights'),
  ])
  const r = summarizeResults(videos)
  const max = Math.max(1, ...r.weeks.map((w) => w.views))
  const insights = (insightsRun?.output as { insights?: string[] } | null)?.insights
  const tiktokOk = integrationStatus().find((i) => i.key === 'tiktok')?.ok
  const withVideos = clients.filter(
    (c) => videos.some((v) => v.client_id === c.id) || c.id === klant,
  )

  return (
    <>
      <PageHeader
        eyebrow={
          tiktokOk ? 'TikTok-cijfers · dagelijks bijgewerkt' : 'TikTok-koppeling nog niet actief'
        }
        title="Resultaten"
      >
        <form className="flex items-center gap-2">
          <label className={cn('flex items-center gap-2 text-[13px]', muted)}>
            Klant
            <select
              name="klant"
              defaultValue={klant ?? ''}
              className="min-h-11 rounded-full border-0 bg-ikr-cream-light px-4 text-sm font-semibold text-ikr-navy"
            >
              <option value="">Alle klanten</option>
              {(withVideos.length ? withVideos : clients).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonClass('light')}>
            Toon
          </button>
        </form>
      </PageHeader>

      {!videos.length ? (
        <Card className="flex flex-col gap-3">
          <Title className="m-0 text-2xl">Nog geen videodata</Title>
          <p className={cn('m-0 text-[15px]', muted)}>
            Zodra de TikTok-accounts van klanten gekoppeld zijn, haalt de dagelijkse job hier de
            cijfers van elke video binnen. Zie{' '}
            <Link href="/admin/instellingen" className="font-semibold text-ikr-navy">
              Instellingen
            </Link>
            .
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
            <Stat
              label="Views · 30 dagen"
              value={compactNumber(r.viewsPeriod)}
              note={
                r.viewsChange != null
                  ? `${r.viewsChange >= 0 ? '+' : ''}${percent(r.viewsChange)}`
                  : undefined
              }
              noteTone={r.viewsChange != null ? (r.viewsChange >= 0 ? 'up' : 'down') : undefined}
            />
            <Stat
              label="Video's"
              value={r.videoCount}
              note={`${r.liveInPeriod} nieuw · ${r.clientCount} klanten`}
            />
            <Stat label="Gem. views / video" value={compactNumber(r.avgPerVideo)} />
            <Stat
              label="Engagement"
              value={percent(r.engagementRate, 1)}
              note="likes + comments + shares"
            />
          </div>

          <div className="flex flex-wrap items-stretch gap-5">
            <Card className="flex min-w-0 flex-[3_1_480px] flex-col gap-4">
              <div className="flex items-center justify-between">
                <Title className="m-0 text-[26px]">Views per week</Title>
                <span className={cn('text-[13px]', muted)}>
                  {klant ? clients.find((c) => c.id === klant)?.name : 'alle klanten'}
                </span>
              </div>
              <div
                role="img"
                aria-label={`Staafdiagram views per week: ${r.weeks.map((w) => `${w.label} ${compactNumber(w.views)}`).join(', ')}`}
                className="flex h-60 items-end gap-3 pt-3"
              >
                {r.weeks.map((w, i) => {
                  const last = i === r.weeks.length - 1
                  return (
                    <div
                      key={w.label}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className={cn('text-[11px]', last ? 'font-bold text-ikr-navy' : muted)}>
                        {compactNumber(w.views)}
                      </span>
                      <span
                        className={cn(
                          'w-full rounded-t-lg rounded-b-[3px]',
                          last ? 'bg-ikr-cyan' : 'bg-[#9FDCE8]',
                        )}
                        style={{ height: `${Math.max(2, (w.views / max) * 100)}%` }}
                      />
                      <span className={cn('text-[11px]', last ? 'font-bold text-ikr-navy' : muted)}>
                        {w.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card dark className="flex min-w-0 flex-[2_1_320px] flex-col gap-3.5">
              <Pill tone="cyan" className="self-start">
                <Icon.sparkle size={14} /> IKR AI · analyse
              </Pill>
              <Title className="m-0 text-[26px]">Wat werkte?</Title>
              {insights?.length ? (
                <>
                  <ul className="m-0 pl-[18px] text-[15px] leading-relaxed text-[#E7E2F0]">
                    {insights.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  <span className="text-xs text-[#B9B2C9]">
                    Analyse van{' '}
                    {fmtDate(insightsRun!.created_at, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </>
              ) : (
                <p className="m-0 text-[15px] text-[#E7E2F0]">
                  Laat IKR AI de cijfers bekijken en zeggen wat opvalt.
                </p>
              )}
              <div className="mt-auto">
                <ActionButton
                  action={analyzeResultsAction.bind(null, klant || null)}
                  variant="cyan"
                  small={false}
                  ai
                  pendingText="Analyseren…"
                >
                  {insights?.length ? 'Opnieuw analyseren' : 'Analyseer'}
                </ActionButton>
              </div>
            </Card>
          </div>

          <section aria-labelledby="top-h" className="flex flex-col gap-3.5">
            <Title as="h2" className="m-0 text-[26px]">
              <span id="top-h">Top video’s</span>
            </Title>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
              {r.top.map((v) => (
                <a
                  key={v.id}
                  href={v.share_url ?? undefined}
                  target={v.share_url ? '_blank' : undefined}
                  rel="noreferrer"
                  className="flex flex-col gap-2.5 rounded-[18px] bg-ikr-cream-light p-2.5 text-ikr-navy no-underline"
                >
                  <div
                    className="flex aspect-[9/16] items-end rounded-xl bg-[#2C2247] bg-cover bg-center p-2.5 text-xs font-semibold text-ikr-cream-light"
                    style={v.cover_url ? { backgroundImage: `url(${v.cover_url})` } : undefined}
                  >
                    {!v.cover_url && 'geen cover'}
                  </div>
                  <span className="text-sm font-bold">{v.client_name}</span>
                  <span className={cn('line-clamp-2 text-[13px]', muted)}>{v.title ?? '—'}</span>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-black">
                      {compactNumber(v.views)}
                    </span>
                    <Pill tone={v.multiple >= 2 ? 'teal' : 'neutral'}>
                      {v.multiple.toFixed(1).replace('.', ',')}× gem.
                    </Pill>
                  </div>
                </a>
              ))}
            </div>
          </section>

          <Card className="flex flex-col gap-3">
            <Title className="m-0 text-[26px]">Per klant</Title>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className={cn('text-xs', muted)}>
                    <th scope="col" className="py-3 pr-3 font-semibold">
                      Klant
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Video's
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Views
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Gem. / video
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Engagement
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Trend 7 d
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {r.clients.map((c) => (
                    <tr key={c.client_id} className="border-t border-[#E6DFD2]">
                      <td className="py-3 pr-3 font-bold">
                        <Link
                          href={`/admin/klanten/${c.client_id}`}
                          className="text-ikr-navy no-underline hover:text-[#0B7F93]"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3">{c.videos}</td>
                      <td className="px-3 py-3">{compactNumber(c.views)}</td>
                      <td className="px-3 py-3">{compactNumber(c.avg)}</td>
                      <td className="px-3 py-3">{percent(c.engagementRate, 1)}</td>
                      <td className="px-3 py-3">
                        {c.trend == null ? (
                          '—'
                        ) : (
                          <Pill tone={c.trend >= 0 ? 'teal' : 'orange'}>
                            {c.trend >= 0 ? '↑' : '↓'} {percent(Math.abs(c.trend))}
                          </Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      {!videos.length && (
        <Empty>
          Tip: de AI-analyse en het maandrapport worden actief zodra er cijfers binnenkomen.
        </Empty>
      )}
    </>
  )
}

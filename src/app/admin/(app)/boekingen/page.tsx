import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { todayBrussels } from '@/lib/admin/dates'
import { fmtDate, fmtTime } from '@/lib/admin/format'
import { serverBookingDeps } from '@/lib/booking/deps'
import { loadAvailability } from '@/lib/booking/service'
import { PROVIDERS } from '@/lib/booking/busy'
import { computeSlots } from '@/lib/booking/slots'
import { agendaCheck, conflictText } from '@/lib/booking/check'
import { Card, Empty, muted, PageHeader, Pill, Title, buttonClass } from '@/components/admin/ui'
import { GeneralSettings, MemberSettings, WeekExceptions, WeeklyHoursEditor } from '@/components/admin/booking/BookingEditors'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Boekingen' }

/** Tijdstip van deze render (servercomponent, één keer per verzoek). */
function clock() {
  return Date.now()
}

/** Beschikbaarheid voor de publieke boekingspagina (/boek) en de komende boekingen. */
export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ lid?: string }> }) {
  const { user } = await requireAdmin()
  const deps = serverBookingDeps()
  if (!deps)
    return (
      <>
        <PageHeader eyebrow="Boekingspagina" title="Boekingen" />
        <Card>
          <Empty>Boekingen zijn nog niet ingesteld (SUPABASE_SERVICE_ROLE_KEY ontbreekt).</Empty>
        </Card>
      </>
    )
  const { lid } = await searchParams
  const [availability, upcoming] = await Promise.all([loadAvailability(deps), deps.store.listBookings({ from: new Date(clock() - 86_400_000).toISOString(), limit: 50 })])
  const { config } = availability
  // Na loadAvailability: de agenda's zitten in de cache, dus dit leest Google niet opnieuw.
  const checks = await agendaCheck(deps)
  const members = config.members
  const selected = members.find((m) => m.member_email === lid?.toLowerCase()) ?? members.find((m) => m.member_email === user.email.toLowerCase()) ?? members[0]
  const today = todayBrussels()
  const slots = computeSlots(availability.members, availability.options)
  const mine = slots.filter((s) => s.member === selected?.member_email)
  const nameOf = (email: string) => members.find((m) => m.member_email === email)?.name ?? email
  const confirmed = upcoming.filter((b) => b.status === 'bevestigd')

  return (
    <>
      <PageHeader eyebrow={`${slots.length} vrije ${slots.length === 1 ? 'moment' : 'momenten'} op /boek (komende ${config.settings.horizon_days} dagen)`} title="Boekingen">
        <Link href="/boek" target="_blank" className={buttonClass('cyan', true)}>
          Open /boek
        </Link>
      </PageHeader>

      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Komende boekingen</Title>
        {!confirmed.length && <Empty>Nog geen boekingen via /boek.</Empty>}
        {confirmed.map((b) => {
          const problems = [b.lead_error && `Dashboard: ${b.lead_error}`, b.calendar_error && `Agenda: ${b.calendar_error}`, b.notify_error && `Melding: ${b.notify_error}`, b.confirm_error && `Bevestiging: ${b.confirm_error}`].filter(Boolean)
          return (
            <div key={b.id} className="flex flex-wrap items-center gap-3 border-t border-adm-line pt-3 first:border-t-0 first:pt-0">
              <div className="flex flex-[1_1_260px] flex-col">
                <span className="font-semibold">
                  {b.name} · {b.company}
                </span>
                <span className={cn('text-sm', muted)}>
                  {fmtDate(b.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} om {fmtTime(b.starts_at)} · {b.email} · {b.phone}
                </span>
                {problems.map((p) => (
                  <span key={p as string} className="text-sm text-adm-warn">
                    {p}
                  </span>
                ))}
              </div>
              <Pill tone="purple">{nameOf(b.member_email)}</Pill>
              {b.meet_url && (
                <a href={b.meet_url} target="_blank" rel="noreferrer" className={buttonClass('soft', true)}>
                  Meet
                </a>
              )}
              {b.lead_id && (
                <Link href={`/admin/sales/leads/${b.lead_id}`} className={buttonClass('soft', true)}>
                  Lead
                </Link>
              )}
            </div>
          )
        })}
      </Card>

      <nav aria-label="Teamlid" className="flex flex-wrap gap-2">
        {members.map((m) => (
          <Link
            key={m.member_email}
            href={`/admin/boekingen?lid=${encodeURIComponent(m.member_email)}`}
            aria-current={m.member_email === selected?.member_email ? 'page' : undefined}
            className={buttonClass(m.member_email === selected?.member_email ? 'navy' : 'soft', true)}
          >
            {m.name}
            {m.member_email === user.email.toLowerCase() && ' (jij)'}
            {(() => {
              const c = checks.find((x) => x.member === m.member_email)
              if (!c?.active || !c.hasHours) return null
              if (c.error) return <span title="Agenda niet leesbaar: geen boekingen">⚠️</span>
              if (c.conflicts.length) return <span title={`${c.conflicts.length} botsing(en) met de agenda`}>· {c.conflicts.length}</span>
              return null
            })()}
          </Link>
        ))}
      </nav>

      {selected && (
        <div className="grid gap-4 xl:grid-cols-2" key={selected.member_email}>
          <Card className="flex flex-col gap-3">
            <Title className="m-0 text-2xl">Vaste weekuren · {selected.name}</Title>
            <p className={cn('m-0 text-sm', muted)}>Elke week opnieuw, in Belgische tijd. Calls starten per kwartier en duren {config.callType.minutes} minuten.</p>
            <WeeklyHoursEditor member={selected.member_email} initial={selected.weekly.map(({ weekday, start, end }) => ({ weekday, start, end }))} />
          </Card>
          <Card className="flex flex-col gap-3">
            <Title className="m-0 text-2xl">Uitzonderingen per week</Title>
            <p className={cn('m-0 text-sm', muted)}>Voor één datum een blok toevoegen of schrappen. Het vaste schema blijft hetzelfde.</p>
            <WeekExceptions member={selected.member_email} weekly={selected.weekly} exceptions={selected.exceptions} today={today} />
          </Card>
          <Card className="flex flex-col gap-3">
            <Title className="m-0 text-2xl">Meldingen en agenda</Title>
            <MemberSettings
              member={selected.member_email}
              active={selected.active}
              notifyEmail={selected.notify_email}
              useBusy={selected.use_busy}
              sources={selected.sources.map((s) => ({ provider: s.provider, active: s.active }))}
              providers={Object.entries(PROVIDERS).map(([id, p]) => ({
                id,
                label: p.label,
                description: p.description,
                status: selected.use_busy && selected.sources.some((s) => s.provider === id && s.active) && selected.busy_error?.startsWith(p.label) ? selected.busy_error : null,
              }))}
            />
          </Card>
          {(() => {
            const c = checks.find((x) => x.member === selected.member_email)
            if (!c) return null
            return (
              <Card className="flex flex-col gap-3 xl:col-span-2">
                <Title className="m-0 text-2xl">Agenda-check · {selected.name}</Title>
                {!c.useBusy ? (
                  <p className="m-0 rounded-2xl bg-adm-warn-bg p-3 text-sm text-adm-warn-strong">
                    Vrij/bezet staat uit: een afspraak in de agenda houdt een lead nu niet tegen. Zet het aan bij &quot;Meldingen en agenda&quot;.
                  </p>
                ) : c.error ? (
                  <p className="m-0 rounded-2xl bg-adm-warn-bg p-3 text-sm text-adm-warn-strong">
                    De agenda kon niet gelezen worden, dus {selected.name} krijgt nu geen boekingen: {c.error}
                  </p>
                ) : !c.conflicts.length ? (
                  <p className="m-0 text-sm text-adm-green">Agenda gelezen: niets in de agenda botst met de weekuren van de komende {config.settings.horizon_days} dagen.</p>
                ) : (
                  <>
                    <p className={cn('m-0 text-sm', muted)}>
                      Deze stukken van de weekuren staan bezet in de agenda. Ze verschijnen niet op /boek. Klopt het schema niet meer, pas dan de weekuren of een uitzondering aan.
                    </p>
                    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                      {c.conflicts.map((x) => (
                        <li key={x.start} className="capitalize">
                          {conflictText(x)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className={cn('m-0 text-xs', muted)}>Elke maandag krijgt iedereen deze check ook per mail.</p>
              </Card>
            )
          })()}
          <Card className="flex flex-col gap-3">
            <Title className="m-0 text-2xl">Zo staat {selected.name} op /boek</Title>
            <p className={cn('m-0 text-sm', muted)}>Momenten die naar {selected.name} gaan (wie hoger in de volgorde staat, gaat voor). De lead ziet enkel &quot;IKnowRight&quot;.</p>
            {!mine.length ? (
              <Empty>{selected.active ? 'Geen vrije momenten. Stel weekuren in.' : `${selected.name} neemt nu geen boekingen aan.`}</Empty>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                {Object.entries(
                  mine.reduce<Record<string, string[]>>((acc, s) => {
                    const d = fmtDate(s.start, { weekday: 'short', day: 'numeric', month: 'short' })
                    ;(acc[d] ??= []).push(fmtTime(s.start))
                    return acc
                  }, {}),
                )
                  .slice(0, 10)
                  .map(([d, t]) => (
                    <li key={d}>
                      <span className="inline-block w-24 font-semibold capitalize">{d}</span> {t.join(' · ')}
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Algemeen</Title>
        <GeneralSettings
          members={members.map((m) => ({ email: m.member_email, name: m.name }))}
          priority={config.settings.priority}
          callName={config.callType.name}
          callMinutes={config.callType.minutes}
          subject={config.settings.confirm_subject}
          template={config.settings.confirm_template}
        />
      </Card>
    </>
  )
}

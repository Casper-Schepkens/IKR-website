import { checkConnection, listOwnConnections, type TeamConnection } from '@/lib/admin/team/connections'
import { tokenKeyProblem } from '@/lib/admin/crypto'
import { isGoogleConfigured } from '@/lib/admin/google'
import { fmtDate } from '@/lib/admin/format'
import { buttonClass, Card, muted, Pill, Title } from '../ui'
import { cn } from '@/utilities/ui'
import { CalendarPicker, DisconnectButton } from './MyConnectionsClient'

/**
 * Instellingen → Mijn koppelingen. Elk teamlid ziet en beheert enkel zijn eigen koppelingen:
 * mail (alleen lezen) en, apart, agenda('s) (alleen lezen). Grok Bot leest ze via MCP; niets verstuurt.
 */
export async function MyConnections({ email }: { email: string }) {
  const own = await listOwnConnections(email).catch(() => [] as TeamConnection[])
  // Werkt de koppeling nog? (verlopen/ingetrokken → "opnieuw koppelen")
  const withStatus = await Promise.all(own.map(async (c) => ({ ...c, status: c.status === 'ok' ? await checkConnection(email, c.kind) : c.status })))
  const mail = withStatus.find((c) => c.kind === 'mail')
  const agenda = withStatus.find((c) => c.kind === 'agenda')
  const blocked = !isGoogleConfigured() ? 'Google is nog niet ingesteld.' : tokenKeyProblem()

  return (
    <div id="koppelingen" className="scroll-mt-24">
    <Card className="flex flex-col gap-4">
      <div>
        <Title className="m-0 text-2xl">Mijn koppelingen</Title>
        <p className={cn('m-0 text-sm', muted)}>
          Grok Bot mag je mail en gekozen agenda&apos;s <strong>lezen</strong> (nooit versturen, nooit iets aanpassen of verwijderen). Je kan voor
          de agenda een ander IKR-account gebruiken dan voor je mail. Enkel jij ziet je koppelingen hier.
        </p>
        {blocked && <p className="m-0 mt-2 text-sm text-[#A3470F]">{blocked}</p>}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        <Block
          title="Mail koppelen"
          hint="Je eigen mailbox, alleen lezen."
          conn={mail}
          kind="mail"
          startHref="/admin/auth/google/start?voor=team-mail"
          disabled={Boolean(blocked)}
        />
        <Block
          title="Agenda koppelen"
          hint="Kies daarna welke agenda's Grok Bot mag lezen."
          conn={agenda}
          kind="agenda"
          startHref="/admin/auth/google/start?voor=team-agenda"
          disabled={Boolean(blocked)}
        >
          {agenda && agenda.status === 'ok' && <CalendarPicker calendars={agenda.calendars} selected={agenda.selected_calendars} />}
        </Block>
      </div>
    </Card>
    </div>
  )
}

function Block({
  title,
  hint,
  conn,
  kind,
  startHref,
  disabled,
  children,
}: {
  title: string
  hint: string
  conn: (TeamConnection & { status: string }) | undefined
  kind: 'mail' | 'agenda'
  startHref: string
  disabled: boolean
  children?: React.ReactNode
}) {
  const broken = conn?.status === 'opnieuw_koppelen'
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-2xl bg-ikr-cream p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-base font-bold">{title}</h3>
        {!conn ? <Pill tone="light">Niet gekoppeld</Pill> : broken ? <Pill tone="orange">Opnieuw koppelen</Pill> : <Pill tone="green">Gekoppeld</Pill>}
      </div>
      {conn ? (
        <p className="m-0 text-sm">
          {conn.google_email} <span className={muted}>· sinds {fmtDate(conn.connected_at)}</span>
          {broken && <span className="mt-1 block text-[#A3470F]">De koppeling werkt niet meer (verlopen of ingetrokken). Koppel opnieuw.</span>}
        </p>
      ) : (
        <p className={cn('m-0 text-sm', muted)}>{hint}</p>
      )}
      {children}
      <div className="flex flex-wrap gap-2">
        {disabled ? (
          <span className={cn(buttonClass('soft', true), 'pointer-events-none opacity-50')}>{conn ? 'Opnieuw koppelen' : title}</span>
        ) : (
          <a href={startHref} className={buttonClass(conn && !broken ? 'soft' : 'navy', true)}>
            {conn ? 'Opnieuw koppelen' : title}
          </a>
        )}
        {conn && <DisconnectButton kind={kind} />}
      </div>
    </section>
  )
}

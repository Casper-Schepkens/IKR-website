import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'
import { canSeeSales } from '@/lib/admin/env'
import { workspaceRepo } from '@/lib/admin/workspace/repo'
import { TEAM } from '@/lib/admin/weekly/types'
import { buttonClass, PageHeader } from '@/components/admin/ui'
import { WorkspaceView } from '@/components/admin/workspace/WorkspaceView'

export const metadata = { title: 'Grok Bot' }

/**
 * Werkplek van Grok Bot: per teamlid een eigen plek waar de bot onderwerpen, brainstorms, vragen en
 * voorgestelde acties klaarzet, met een draadje per kaart. Casper kan voorlopig ook die van anderen bekijken (temp).
 */
export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ voor?: string }> }) {
  const { user } = await requireAdmin()
  const admin = canSeeSales(user.email)
  const sp = await searchParams
  const other = admin ? TEAM.find((t) => t.key === sp.voor && t.email !== user.email) : undefined
  const owner = other ?? TEAM.find((t) => t.email === user.email)
  const ownerEmail = owner?.email ?? user.email
  const cards = await workspaceRepo().list(ownerEmail)
  const names = Object.fromEntries(TEAM.map((t) => [t.email, t.name]))
  const waiting = cards.filter((c) => c.status === 'open' && (c.action_status === 'voorgesteld' || (c.unread && c.owner_email === user.email))).length
  return (
    <>
      <PageHeader eyebrow={waiting ? `${waiting} wacht${waiting > 1 ? 'en' : ''} op je` : 'Werkplek'} title={other ? `Grok Bot · ${other.name} (temp)` : 'Grok Bot'}>
        {admin && (
          <nav aria-label="Werkplek van" className="flex flex-wrap gap-1.5">
            {TEAM.map((t) => {
              const mine = t.email === user.email
              const active = mine ? !other : other?.key === t.key
              return (
                <Link key={t.key} href={mine ? '/admin/werkplek' : `/admin/werkplek?voor=${t.key}`} aria-current={active ? 'page' : undefined} className={buttonClass(active ? 'navy' : 'light', true)}>
                  {mine ? 'Mijn werkplek' : `${t.name} (temp)`}
                </Link>
              )
            })}
          </nav>
        )}
      </PageHeader>
      <WorkspaceView cards={cards} names={names} me={user.email} ownerName={owner?.name ?? ''} canOrderFor={other ? other.key : null} />
    </>
  )
}

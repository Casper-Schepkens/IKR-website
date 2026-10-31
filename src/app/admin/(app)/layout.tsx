import { requireAdmin } from '@/lib/admin/session'
import { Sidebar } from '@/components/admin/Sidebar'
import { AiModeProvider } from '@/components/admin/AiMode'
import { aiRouting } from '@/lib/admin/env'

// AI-taken (ideeën, decks, draaiboeken) kunnen even duren.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  return (
    <AiModeProvider routing={aiRouting()}>
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar name={session.user.name} email={session.user.email} demo={session.mode === 'demo'} />
      <main className="flex min-w-0 flex-1 flex-col gap-7 px-4 pt-6 pb-14 sm:px-9">
        {session.mode === 'demo' && (
          <p className="m-0 rounded-2xl bg-[#FFF0C2] px-4 py-3 text-sm text-[#6B5300]">
            <strong>Demomodus</strong> · voorbeelddata in het geheugen, geen database gekoppeld.
            Wijzigingen verdwijnen bij een herstart.
          </p>
        )}
        {children}
      </main>
    </div>
    </AiModeProvider>
  )
}

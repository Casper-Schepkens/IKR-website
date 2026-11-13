import { Suspense } from 'react'
import { RefreshOnce } from './RefreshOnce'
import { Spinner, muted } from './ui'
import { cn } from '@/utilities/ui'

export type SyncResult = { changed: boolean }

/**
 * Een trage sync met een externe dienst (Odoo, Google Agenda …) zonder dat de pagina erop wacht:
 * de pagina toont meteen de opgeslagen data, de sync loopt in de stream erna, en enkel als er iets
 * veranderde wordt de pagina één keer ververst. Een fout verschijnt op de plek van dit blok.
 */
export function BackgroundSync({
  run,
  label,
  errorPrefix,
  knownError,
}: {
  run: () => Promise<SyncResult>
  /** Getoond tijdens de sync, bv. "Odoo bijwerken…" */
  label: string
  errorPrefix: string
  /** Fout die de pagina zelf al toont (bv. bewaard bij de vorige poging): niet dubbel tonen. */
  knownError?: string | null
}) {
  return (
    <Suspense
      fallback={
        <p role="status" className={cn('m-0 flex items-center gap-2 text-sm', muted)}>
          <Spinner /> {label}
        </p>
      }
    >
      <Runner run={run} errorPrefix={errorPrefix} knownError={knownError ?? null} />
    </Suspense>
  )
}

async function Runner({ run, errorPrefix, knownError }: { run: () => Promise<SyncResult>; errorPrefix: string; knownError: string | null }) {
  const outcome = await run().then(
    (r) => ({ changed: r.changed, error: null as string | null }),
    (e: unknown) => ({ changed: false, error: e instanceof Error ? e.message : String(e) }),
  )
  if (outcome.changed) return <RefreshOnce />
  if (!outcome.error || (knownError && outcome.error.includes(knownError))) return null
  return (
    <p role="alert" className="m-0 rounded-2xl bg-[#FCE3D2] p-3 text-sm text-[#6E2E09]">
      {errorPrefix}: {outcome.error}
    </p>
  )
}

import { Card } from '@/components/admin/ui'

/**
 * Laadstaat van elke adminpagina: verschijnt meteen bij een klik (Next haalt hem vooraf op),
 * terwijl de server de echte pagina maakt. Sidebar en chat blijven gewoon staan.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-7">
      <span className="sr-only">Pagina laden…</span>
      <div className="flex flex-col gap-3" aria-hidden>
        <div className="h-4 w-48 animate-pulse rounded-full bg-ikr-navy/10" />
        <div className="h-12 w-72 max-w-full animate-pulse rounded-2xl bg-ikr-navy/10 md:h-16" />
      </div>
      {[0, 1, 2].map((i) => (
        <Card key={i} className="flex flex-col gap-3">
          <div aria-hidden className="h-5 w-1/3 animate-pulse rounded-full bg-ikr-navy/10" />
          <div aria-hidden className="h-4 w-full animate-pulse rounded-full bg-ikr-navy/[0.07]" />
          <div aria-hidden className="h-4 w-2/3 animate-pulse rounded-full bg-ikr-navy/[0.07]" />
        </Card>
      ))}
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { buttonClass, Card, muted, Title } from '@/components/admin/ui'
import { cn } from '@/utilities/ui'

/**
 * Foutscherm voor elke adminpagina: de zijbalk en de chat blijven staan, enkel de pagina toont wat
 * misliep en een knop om opnieuw te proberen. De technische melding komt in de Vercel-logs.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin] pagina kon niet laden', error)
  }, [error])
  return (
    <Card className="flex flex-col gap-3">
      <Title as="h1" className="m-0 text-3xl">
        Deze pagina kon niet laden
      </Title>
      <p className="m-0 text-sm">
        Er liep iets mis bij het ophalen van de gegevens (bv. de database of een gekoppelde dienst antwoordde niet). Probeer het opnieuw; lukt
        het blijvend niet, zeg het dan aan Casper.
      </p>
      {error.digest && <p className={cn('m-0 text-xs', muted)}>Foutcode voor de logs: {error.digest}</p>}
      <div>
        <button type="button" onClick={reset} className={buttonClass('navy')}>
          Opnieuw proberen
        </button>
      </div>
    </Card>
  )
}

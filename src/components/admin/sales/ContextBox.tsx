import { muted } from '../ui'
import { cn } from '@/utilities/ui'

/** Rechterkolom (25%) bij een mail: de bot beschrijft de context. */
export function ContextBox({ text, pending }: { text: string | null | undefined; pending?: boolean }) {
  return (
    <aside aria-label="Context" className="flex flex-col gap-2 rounded-2xl bg-ikr-cream p-4 lg:self-stretch">
      <h3 className="m-0 text-sm font-bold">Context</h3>
      {text ? (
        <p className="m-0 text-sm leading-relaxed whitespace-pre-line">{text}</p>
      ) : (
        <p className={cn('m-0 text-sm', muted)}>{pending ? 'De bot schrijft de context…' : 'Geen context meegegeven.'}</p>
      )}
    </aside>
  )
}

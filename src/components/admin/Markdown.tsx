import { Fragment } from 'react'
import { parseMarkdown, type Inline } from '@/lib/admin/markdown'
import { cn } from '@/utilities/ui'

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((x, i) => {
        if (x.t === 'text') return <Fragment key={i}>{x.v}</Fragment>
        if (x.t === 'b') return <strong key={i}><Inlines items={x.c} /></strong>
        if (x.t === 'i') return <em key={i}><Inlines items={x.c} /></em>
        if (x.t === 'code') return <code key={i} className="rounded bg-ikr-cream px-1 text-[0.9em]">{x.v}</code>
        return (
          <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className="font-semibold break-words text-[#0B7F93] underline">
            <Inlines items={x.c} />
          </a>
        )
      })}
    </>
  )
}

/** Markdown veilig tonen (geen HTML): kopjes, opsommingen, vet/cursief en klikbare links. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = parseMarkdown(text)
  return (
    <div className={cn('flex flex-col gap-2 text-sm leading-relaxed', className)}>
      {blocks.map((b, i) =>
        b.t === 'h' ? (
          b.level === 1 ? <h3 key={i} className="m-0 text-base font-bold"><Inlines items={b.c} /></h3> : b.level === 2 ? <h4 key={i} className="m-0 text-sm font-bold"><Inlines items={b.c} /></h4> : <h5 key={i} className="m-0 text-sm font-semibold"><Inlines items={b.c} /></h5>
        ) : b.t === 'p' ? (
          <p key={i} className="m-0"><Inlines items={b.c} /></p>
        ) : b.t === 'ul' ? (
          <ul key={i} className="m-0 list-disc pl-5">{b.items.map((it, j) => <li key={j}><Inlines items={it} /></li>)}</ul>
        ) : (
          <ol key={i} className="m-0 list-decimal pl-5">{b.items.map((it, j) => <li key={j}><Inlines items={it} /></li>)}</ol>
        ),
      )}
    </div>
  )
}

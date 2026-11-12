/**
 * Kleine, veilige markdown voor het dashboard (geen HTML): kopjes (#, ##, ###), opsommingen (- * of 1.),
 * paragrafen, **vet**, *cursief*, `code`, [links](https://…) en losse https-links. Links enkel http(s)/mailto.
 */
export type Inline = { t: 'text'; v: string } | { t: 'b'; c: Inline[] } | { t: 'i'; c: Inline[] } | { t: 'code'; v: string } | { t: 'a'; href: string; c: Inline[] }
export type Block = { t: 'h'; level: 1 | 2 | 3; c: Inline[] } | { t: 'p'; c: Inline[] } | { t: 'ul' | 'ol'; items: Inline[][] }

export const safeHref = (href: string) => (/^(https?:\/\/|mailto:)/i.test(href.trim()) ? href.trim() : null)

export function parseInline(s: string): Inline[] {
  const out: Inline[] = []
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*([^*\s][^*]*)\*)|(_([^_\s][^_]*)_)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) })
    if (m[2] !== undefined) out.push({ t: 'b', c: parseInline(m[2]) })
    else if (m[4] !== undefined) out.push({ t: 'code', v: m[4] })
    else if (m[6] !== undefined) {
      const href = safeHref(m[7])
      out.push(href ? { t: 'a', href, c: parseInline(m[6]) } : { t: 'text', v: m[0] })
    } else if (m[9] !== undefined) out.push({ t: 'i', c: parseInline(m[9]) })
    else if (m[11] !== undefined) out.push({ t: 'i', c: parseInline(m[11]) })
    else if (m[12] !== undefined) out.push({ t: 'a', href: m[12], c: [{ t: 'text', v: m[12] }] })
    last = re.lastIndex
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) })
  return out
}

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let list: { t: 'ul' | 'ol'; items: string[] } | null = null
  const flush = () => {
    if (para.length) blocks.push({ t: 'p', c: parseInline(para.join(' ')) })
    para = []
    if (list) blocks.push({ t: list.t, items: list.items.map(parseInline) })
    list = null
  }
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    const ul = line.match(/^\s*[-*•]\s+(.*)$/)
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (!line.trim()) flush()
    else if (h) {
      flush()
      blocks.push({ t: 'h', level: h[1].length as 1 | 2 | 3, c: parseInline(h[2]) })
    } else if (ul || ol) {
      const kind = ul ? 'ul' : 'ol'
      if (para.length || (list && list.t !== kind)) flush()
      list ??= { t: kind, items: [] }
      list.items.push((ul ?? ol)![1])
    } else if (list && /^\s{2,}\S/.test(raw)) list.items[list.items.length - 1] += ` ${line.trim()}`
    else {
      if (list) flush()
      para.push(line.trim())
    }
  }
  flush()
  return blocks
}

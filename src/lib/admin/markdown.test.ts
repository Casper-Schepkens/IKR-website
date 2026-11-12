import { describe, expect, it } from 'vitest'
import { parseInline, parseMarkdown } from './markdown'

describe('markdown', () => {
  it('kopjes, opsommingen en paragrafen', () => {
    const b = parseMarkdown('# Lead\nJan van **Bakkerij Peeters**.\n\n## Punten\n- prijs\n- timing\n\n1. bellen\n2. mailen')
    expect(b.map((x) => x.t)).toEqual(['h', 'p', 'h', 'ul', 'ol'])
    expect(b[3]).toMatchObject({ t: 'ul', items: [[{ t: 'text', v: 'prijs' }], [{ t: 'text', v: 'timing' }]] })
  })
  it('links: markdown en los, enkel http(s); javascript wordt tekst', () => {
    expect(parseInline('zie [ppt](https://docs.google.com/x) en https://iknowright.be.')).toEqual([
      { t: 'text', v: 'zie ' },
      { t: 'a', href: 'https://docs.google.com/x', c: [{ t: 'text', v: 'ppt' }] },
      { t: 'text', v: ' en ' },
      { t: 'a', href: 'https://iknowright.be', c: [{ t: 'text', v: 'https://iknowright.be' }] },
      { t: 'text', v: '.' },
    ])
    expect(parseInline('[klik](javascript:alert(1))')[0]).toMatchObject({ t: 'text' })
  })
})

import { describe, expect, it } from 'vitest'
import { parseSelection, selectSequences } from './sequence-filter'

const seqs = [
  { id: 'a', active: true },
  { id: 'b', active: false },
  { id: 'c', active: true },
]

describe('sequences filteren', () => {
  it('standaard enkel actieve', () => {
    expect(selectSequences(seqs, parseSelection({})).shown.map((s) => s.id)).toEqual(['a', 'c'])
  })
  it('ook inactieve', () => {
    expect(selectSequences(seqs, parseSelection({ alle: '1' })).shown.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })
  it('eigen keuze, enkel binnen wat zichtbaar is', () => {
    expect(selectSequences(seqs, parseSelection({ seq: 'c,b' })).shown.map((s) => s.id)).toEqual(['c'])
    expect(selectSequences(seqs, parseSelection({ seq: 'c,b', alle: '1' })).shown.map((s) => s.id)).toEqual(['b', 'c'])
  })
})

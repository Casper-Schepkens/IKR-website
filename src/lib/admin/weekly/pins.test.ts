import { beforeEach, describe, expect, it } from 'vitest'
import { inferKind, linkSource, safeUrl, sortPins, type Pin } from './pins'
import { memoryWeekly } from './repo'

describe('prikbord-helpers', () => {
  it('laat enkel http(s)-links toe', () => {
    expect(safeUrl('docs.google.com/document/d/1')).toBe('https://docs.google.com/document/d/1')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('  ')).toBeNull()
  })
  it('herkent de bron en kiest de soort', () => {
    expect(linkSource('https://docs.google.com/spreadsheets/d/1')).toEqual({ label: 'Google Sheet', isDocument: true })
    expect(linkSource('https://www.tiktok.com/@ikr/video/1').label).toBe('TikTok')
    expect(inferKind(null, 'https://drive.google.com/file/d/1')).toBe('document')
    expect(inferKind(null, 'https://www.tiktok.com/@ikr')).toBe('link')
    expect(inferKind(null, null)).toBe('tekst')
    expect(inferKind('bespreekpunt', null)).toBe('bespreekpunt')
  })
  it('vastgepind eerst, daarna nieuwste', () => {
    const p = (id: string, pinned: boolean, created_at: string) => ({ id, pinned, created_at }) as Pin
    expect(sortPins([p('a', false, '1'), p('b', true, '0'), p('c', false, '2')]).map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('prikbord leegmaken', () => {
  beforeEach(() => ((globalThis as { __ikrWeekly?: unknown }).__ikrWeekly = undefined))
  it('haalt alles weg behalve vastgepinde kaartjes', async () => {
    const repo = memoryWeekly()
    const base = { kind: 'tekst' as const, body: null, url: null, for_owner: null, created_by: 'x', created_via: 'dashboard' as const }
    const a = await repo.createPin({ ...base, title: 'Weg' })
    const b = await repo.createPin({ ...base, title: 'Blijft' })
    await repo.updatePin(b.id, { pinned: true })
    expect(await repo.clearPins()).toBe(1)
    expect((await repo.listPins()).map((p) => p.title)).toEqual(['Blijft'])
    expect(a.id).toBeTruthy()
  })
})

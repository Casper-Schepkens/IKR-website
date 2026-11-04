import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  chatContentKey,
  chatSnap,
  fnv,
  isLivePath,
  isNearBottom,
  keepEdited,
  NEAR_BOTTOM_PX,
  refreshSoon,
  resetRefreshSoon,
  shouldRefreshForChat,
  stampFromParts,
} from './live'

describe('chat blijft staan als je omhoog scrolt', () => {
  it('zit vast aan de bodem als je er vlakbij bent', () => {
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 900, clientHeight: 100 })).toBe(true)
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 800, clientHeight: 104 }, NEAR_BOTTOM_PX)).toBe(true)
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 700, clientHeight: 100 }, NEAR_BOTTOM_PX)).toBe(false)
  })

  it('merkt een nieuw bericht of de denk-regel', () => {
    const base = chatContentKey([{ id: 'a' }], false)
    expect(chatContentKey([{ id: 'a' }], false)).toBe(base)
    expect(chatContentKey([{ id: 'a' }, { id: 'b' }], false)).not.toBe(base)
    expect(chatContentKey([{ id: 'a' }], true)).not.toBe(base)
  })
})

describe('pagina verversen na een chat-antwoord', () => {
  const bot = (id: string) => ({ id, role: 'bot' })
  const user = (id: string) => ({ id, role: 'user' })

  it('ververst niet als er niets veranderde', () => {
    const s = chatSnap([user('1'), bot('2')], false)
    expect(shouldRefreshForChat(s, { ...s })).toBe(false)
  })

  it('ververst als er een antwoord van de bot bij komt', () => {
    const prev = chatSnap([user('1')], true)
    const next = chatSnap([user('1'), bot('2')], false)
    expect(shouldRefreshForChat(prev, next)).toBe(true)
  })

  it('ververst als het nadenken stopt zonder nieuw antwoord', () => {
    const prev = chatSnap([bot('1')], true)
    const next = chatSnap([bot('1')], false)
    expect(shouldRefreshForChat(prev, next)).toBe(true)
  })

  it('ververst niet als enkel de gebruiker net iets stuurde', () => {
    const prev = chatSnap([bot('1')], false)
    const next = chatSnap([bot('1'), user('2')], true)
    expect(shouldRefreshForChat(prev, next)).toBe(false)
  })
})

describe('live pagina’s', () => {
  it('geldt voor sales, inbox, leads en weekly', () => {
    expect(isLivePath('/admin/sales')).toBe(true)
    expect(isLivePath('/admin/sales/inbox')).toBe(true)
    expect(isLivePath('/admin/sales/leads/abc')).toBe(true)
    expect(isLivePath('/admin/weekly')).toBe(true)
    expect(isLivePath('/admin/weekly/abc')).toBe(true)
  })

  it('geldt niet voor de rest van het dashboard', () => {
    expect(isLivePath('/admin')).toBe(false)
    expect(isLivePath('/admin/instellingen')).toBe(false)
    expect(isLivePath('/admin/salesman')).toBe(false)
  })
})

describe('velden volgen de server tot je zelf typt', () => {
  it('neemt een AI-wijziging over als het veld nog onaangeroerd is', () => {
    expect(keepEdited('oude tekst', 'oude tekst', 'nieuwe tekst')).toBe('nieuwe tekst')
  })

  it('laat een eigen aanpassing staan', () => {
    expect(keepEdited('mijn versie', 'oude tekst', 'nieuwe tekst')).toBe('mijn versie')
  })
})

describe('data-stempel', () => {
  it('is stabiel en ongevoelig voor de volgorde van de delen', () => {
    expect(stampFromParts({ b: '2', a: '1' })).toBe(stampFromParts({ a: '1', b: '2' }))
    expect(stampFromParts({ a: '1' })).not.toBe(stampFromParts({ a: '2' }))
    expect(fnv('zelfde')).toBe(fnv('zelfde'))
    expect(fnv('zelfde')).not.toBe(fnv('anders'))
  })
})

describe('refreshSoon', () => {
  afterEach(() => {
    resetRefreshSoon()
    vi.useRealTimers()
  })

  it('slaat een tweede verversing binnen het interval over', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-04T08:00:00Z'))
    resetRefreshSoon()
    const refresh = vi.fn()
    expect(refreshSoon(refresh, 1000)).toBe(true)
    expect(refreshSoon(refresh, 1000)).toBe(false)
    vi.setSystemTime(new Date('2026-11-04T08:00:01.100Z'))
    expect(refreshSoon(refresh, 1000)).toBe(true)
    expect(refresh).toHaveBeenCalledTimes(2)
  })
})

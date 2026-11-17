import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('next/server', () => ({ after: () => { throw new Error('geen request') } }))

import { workspaceRepo } from './repo'
import { getOwnCard } from './service'

beforeEach(() => {
  ;(globalThis as { __ikrWorkspace?: unknown }).__ikrWorkspace = undefined
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
})

describe('werkplek: wie mag wat', () => {
  it('een teamlid ziet enkel eigen kaarten; Casper (voorlopig) alles', async () => {
    const card = await workspaceRepo().create({ owner_email: 'cedric@iknowright.be', kind: 'vraag', title: 'Vraag', body: 'x' })
    expect((await getOwnCard(card.id, 'cedric@iknowright.be')).id).toBe(card.id)
    await expect(getOwnCard(card.id, 'milan@iknowright.be')).rejects.toThrow('Kaart niet gevonden.')
    expect((await getOwnCard(card.id, 'casper@iknowright.be')).id).toBe(card.id)
  })

  it('"Doe maar" twee keer: de tweede keer is er geen actie meer', async () => {
    const card = await workspaceRepo().create({ owner_email: 'milan@iknowright.be', kind: 'update', title: 'T', body: 'x', action_label: 'To-do maken', action_status: 'voorgesteld' })
    expect(await workspaceRepo().decideAction(card.id, true)).toBe(true)
    expect(await workspaceRepo().decideAction(card.id, true)).toBe(false)
    expect((await workspaceRepo().get(card.id))?.action_status).toBe('goedgekeurd')
  })
})

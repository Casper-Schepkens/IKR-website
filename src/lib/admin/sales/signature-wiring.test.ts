import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { memoryDrafts } from './drafts'
import { signMailOutput } from '../ai/jobs'

describe('concepten en AI-resultaten', () => {
  const base = { lead_id: 'L1', from_email: 'casper@iknowright.be' as const, to_email: 'jan@x.be', cc: [], subject: 'Hoi', is_html: false, thread_id: null, in_reply_to: null, context: null, created_by: 'grokbot' }

  it('aanmaken en bijwerken van een concept zet IKnowRight onder de naam', async () => {
    const repo = memoryDrafts([])
    const d = await repo.create({ ...base, body: 'Hoi Jan,\n\nGroetjes,\nCasper', original_body: 'Hoi Jan,\n\nGroetjes,\nCasper' })
    expect(d.body).toBe('Hoi Jan,\n\nGroetjes,\nCasper\nIKnowRight')
    expect(d.original_body).toBe(d.body)
    await repo.update(d.id, { body: 'Hoi Jan, nieuw.\n\nGroetjes,\nCasper' })
    expect((await repo.get(d.id))!.body).toBe('Hoi Jan, nieuw.\n\nGroetjes,\nCasper\nIKnowRight')
    await repo.update(d.id, { subject: 'Ander onderwerp' })
    expect((await repo.get(d.id))!.body).toBe('Hoi Jan, nieuw.\n\nGroetjes,\nCasper\nIKnowRight')
  })

  it('mailvelden in AI-resultaten (inbox-antwoord, bedankmail, herschrijven)', () => {
    expect(signMailOutput('inbox_reply', { draft: 'Top!\n\nGroetjes,\nCasper', call: null }).draft).toBe('Top!\n\nGroetjes,\nCasper\nIKnowRight')
    expect(signMailOutput('inbox_reply', { draft: null }).draft).toBeNull()
    expect(signMailOutput('call_verwerken', { bedankmail: 'Merci!\n\nGroetjes,\nCasper' }).bedankmail).toBe('Merci!\n\nGroetjes,\nCasper\nIKnowRight')
    expect(signMailOutput('mail_rewrite', { body: '<p>Hoi</p><p>Groetjes,<br>Casper</p>', subject: null }).body).toBe('<p>Hoi</p><p>Groetjes,<br>Casper<br>IKnowRight</p>')
    expect(signMailOutput('chat', { tekst: 'Casper' }).tekst).toBe('Casper')
  })
})

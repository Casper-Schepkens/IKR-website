import { beforeEach, describe, expect, it, vi } from 'vitest'

const gmail = vi.hoisted(() => ({ sendMail: vi.fn(), sendReply: vi.fn(), getThread: vi.fn() }))
vi.mock('../gmail', () => gmail)
vi.mock('../google', () => ({
  SCOPES: { gmailSend: 'send' },
  hasScopes: () => true,
  listConnections: async () => [{ email: 'casper@iknowright.be', scopes: 'send' }],
}))
vi.mock('../ai/style-profile', () => ({ recordFeedback: vi.fn(), styleKeyFor: () => 'casper' }))

import { sendDraft, sendInboxReply } from './send'
import { memoryDrafts, type MailDraft } from './drafts'

const newDraft = async () => {
  const store: MailDraft[] = []
  const drafts = memoryDrafts(store)
  const d = await drafts.create({
    lead_id: 'L1',
    from_email: 'casper@iknowright.be',
    to_email: 'jan@peeters.be',
    cc: [],
    subject: 'Voorstel',
    body: 'Hoi Jan\n\nGroetjes,\nCasper\nIKnowRight',
    is_html: false,
    thread_id: null,
    in_reply_to: null,
    context: null,
    created_by: 'grokbot',
  })
  return { drafts, store, id: d.id }
}

beforeEach(() => vi.clearAllMocks())

describe('concept versturen', () => {
  it('twee klikken tegelijk: de mail vertrekt één keer', async () => {
    const { drafts, id } = await newDraft()
    let release!: () => void
    gmail.sendMail.mockImplementation(() => new Promise<void>((r) => (release = r)))
    const first = sendDraft(drafts, id, 'casper@iknowright.be')
    await vi.waitFor(() => expect(gmail.sendMail).toHaveBeenCalledTimes(1))
    await expect(sendDraft(drafts, id, 'casper@iknowright.be')).rejects.toThrow(/wordt al verstuurd/)
    release()
    await first
    expect(gmail.sendMail).toHaveBeenCalledTimes(1)
    expect((await drafts.get(id))?.status).toBe('verstuurd')
  })

  it('Gmail weigert: niets vertrokken, opnieuw proberen kan', async () => {
    const { drafts, id } = await newDraft()
    gmail.sendMail.mockRejectedValueOnce(new Error('Gmail: quota'))
    await expect(sendDraft(drafts, id, 'casper@iknowright.be')).rejects.toThrow('Gmail: quota')
    expect((await drafts.get(id))?.sent_at).toBeNull()
    gmail.sendMail.mockResolvedValueOnce(undefined)
    await sendDraft(drafts, id, 'casper@iknowright.be')
    expect((await drafts.get(id))?.status).toBe('verstuurd')
  })

  it('mail vertrokken maar markeren mislukt: geen tweede verzending mogelijk', async () => {
    const { drafts, id } = await newDraft()
    gmail.sendMail.mockResolvedValue(undefined)
    const broken = { ...drafts, markSent: vi.fn().mockRejectedValue(new Error('DB plat')) }
    await expect(sendDraft(broken, id, 'casper@iknowright.be')).rejects.toThrow('DB plat')
    await expect(sendDraft(drafts, id, 'casper@iknowright.be')).rejects.toThrow(/wordt al verstuurd/)
    expect(gmail.sendMail).toHaveBeenCalledTimes(1)
  })

  it('een concept dat verstuurd wordt, kan niet meer bewerkt of verwijderd worden', async () => {
    const { drafts, id } = await newDraft()
    expect(await drafts.claimSend(id, 'casper@iknowright.be')).not.toBeNull()
    expect(await drafts.update(id, { body: 'anders' })).toBe(false)
    expect(await drafts.remove(id)).toBe(false)
  })
})

describe('inbox-antwoord', () => {
  const mail = (fromEmail: string, id: string) => ({ id, threadId: 'T1', messageId: `<${id}@x>`, references: null, fromName: fromEmail, fromEmail, to: '', subject: 'Re: TikTok', date: '', text: '' })

  it('Casper antwoordde al na de laatste mail van de lead: weigeren', async () => {
    gmail.getThread.mockResolvedValue({ id: 'T1', mails: [mail('jan@peeters.be', 'm1'), mail('casper@iknowright.be', 'm2')] })
    await expect(sendInboxReply('T1', 'Hoi')).rejects.toThrow(/al op deze mail/)
    expect(gmail.sendReply).not.toHaveBeenCalled()
  })

  it('twee klikken tegelijk: één antwoord', async () => {
    gmail.getThread.mockResolvedValue({ id: 'T1', mails: [mail('jan@peeters.be', 'm1')] })
    let release!: () => void
    gmail.sendReply.mockImplementation(() => new Promise<void>((r) => (release = r)))
    const first = sendInboxReply('T1', 'Hoi')
    await vi.waitFor(() => expect(gmail.sendReply).toHaveBeenCalledTimes(1))
    await expect(sendInboxReply('T1', 'Hoi')).rejects.toThrow(/wordt al verstuurd/)
    release()
    expect(await first).toBe('jan@peeters.be')
  })
})

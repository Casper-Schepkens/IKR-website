import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('../supabase/server', () => ({ createServiceSupabase: () => ({}) }))
import { memoryChat, type ChatMessage } from './repo'
import { sendChatMessage } from './service'
import type { AdminSession } from '../session'

describe('chat met bijlagen', () => {
  it('bewaart de bijlagen bij het bericht; zonder tekst wordt de bestandsnaam het bericht', async () => {
    const store: ChatMessage[] = []
    const session = { mode: 'demo', user: { id: 'u1', email: 'cedric@iknowright.be', name: 'Cedric' }, chat: memoryChat(store) } as unknown as AdminSession
    const ppt = { file_id: 'FILEID12345', name: 'Tomeco sales.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', url: 'https://drive.google.com/open?id=FILEID12345', size: 1000 }
    await sendChatMessage(session, { text: '', page: '/admin/sales/calls', attachments: [ppt] })
    expect(store[0]).toMatchObject({ role: 'user', text: '📎 Tomeco sales.pptx', attachments: [ppt] })
    await expect(sendChatMessage(session, { text: '  ', page: null })).rejects.toThrow(/Typ eerst/)
  })
})

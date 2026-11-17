import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Vangnet: nergens in de bridge een oproep die iets verstuurt of als gelezen markeert. */
describe('read-only broncode', () => {
  it('geen sendMessage/readMessages/sendPresenceUpdate/chatModify-oproepen en markOnlineOnConnect: false', () => {
    const dir = join(import.meta.dirname)
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    for (const f of files) {
      const src = readFileSync(join(dir, f), 'utf8')
      expect(src, f).not.toMatch(/\.(sendMessage|readMessages|sendReceipts|sendPresenceUpdate|chatModify|relayMessage|star)\s*\(/)
    }
    expect(readFileSync(join(dir, 'index.ts'), 'utf8')).toMatch(/markOnlineOnConnect:\s*false/)
  })
})

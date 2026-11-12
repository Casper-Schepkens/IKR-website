'use server'

import { requireAdmin } from '@/lib/admin/session'
import { chatState, sendChatMessage, type ChatState } from '@/lib/admin/chat/service'
import type { ChatAttachment } from '@/lib/admin/chat/repo'
import { shareWithDomain, startDriveUpload } from '@/lib/admin/google'
import { CONTACT_EMAIL } from '@/lib/admin/weekly/types'

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

/** Bericht naar Grok Bot vanuit de chatbalk (op elke admin-pagina). */
export async function sendChatAction(text: string, page: string, attachments: ChatAttachment[] = []): Promise<Result<ChatState>> {
  try {
    const session = await requireAdmin()
    const safePage = page.startsWith('/admin') ? page.slice(0, 300) : null
    await sendChatMessage(session, { text, page: safePage, attachments: cleanAttachments(attachments) })
    return { ok: true, data: await chatState(session) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Versturen mislukt.' }
  }
}

/** Geschiedenis + of Grok Bot nog nadenkt (de chat ververst hiermee). */
export async function getChatAction(): Promise<Result<ChatState>> {
  try {
    const session = await requireAdmin()
    return { ok: true, data: await chatState(session) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Laden mislukt.' }
  }
}

const FILE_ID = /^[\w-]{10,}$/
/** Enkel bijlagen die er uitzien als een Drive-bestand van het dashboard; max. 5. */
function cleanAttachments(list: ChatAttachment[]): ChatAttachment[] {
  return (Array.isArray(list) ? list : [])
    .filter((a) => a && FILE_ID.test(String(a.file_id)))
    .slice(0, 5)
    .map((a) => ({ file_id: String(a.file_id), name: String(a.name ?? 'bestand').slice(0, 200), mime: String(a.mime ?? '').slice(0, 120), url: `https://drive.google.com/open?id=${a.file_id}`, size: typeof a.size === 'number' ? a.size : null }))
}

/** Bijlage voor de chat: upload-URL naar de Drive van contact@ (map "IKR Dashboard – Chat"); de browser uploadt zelf. */
export async function startChatUploadAction(name: string, mimeType: string, origin: string): Promise<Result<string>> {
  try {
    await requireAdmin()
    const clean = name.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 180)
    if (!clean) throw new Error('Bestand zonder naam.')
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(mimeType) ? mimeType : 'application/octet-stream'
    return { ok: true, data: await startDriveUpload({ owner: CONTACT_EMAIL, folder: 'IKR Dashboard – Chat', name: clean, mimeType: mime, origin }) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload starten mislukt.' }
  }
}

/** Na de upload: delen met het team (lezen) en de link teruggeven. */
export async function finishChatUploadAction(fileId: string): Promise<Result<string>> {
  try {
    await requireAdmin()
    if (!FILE_ID.test(fileId)) throw new Error('Ongeldig bestand.')
    return { ok: true, data: await shareWithDomain(CONTACT_EMAIL, fileId, 'iknowright.be') }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delen mislukt.' }
  }
}

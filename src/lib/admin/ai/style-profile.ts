import 'server-only'
import { createServiceSupabase } from '../supabase/server'

/**
 * Eén profiel: de schrijfstijl van Casper. Opgebouwd uit zijn verzonden mails van casper@ én contact@
 * (vroeger stuurde hij meestal via contact@; voortaan enkel via casper@).
 */
export const STYLE_KEYS = ['casper'] as const
export type StyleKey = (typeof STYLE_KEYS)[number]
export const STYLE_SOURCES = ['casper@iknowright.be', 'contact@iknowright.be'] as const
export const STYLE_LABEL: Record<StyleKey, string> = { casper: 'Jouw schrijfstijl (uit casper@ en contact@)' }

export function styleKeyFor(): StyleKey {
  return 'casper'
}

export type StyleProfile = { key: StyleKey; guide: string; examples: string[]; mail_count: number; updated_at: string; updated_by: string | null }

const db = () => createServiceSupabase()

export async function getProfiles(): Promise<StyleProfile[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return []
  const { data } = await db().from('style_profiles').select('*')
  return (data ?? []) as StyleProfile[]
}

export async function saveProfile(key: StyleKey, p: { guide: string; examples?: string[]; mail_count?: number }, by: string) {
  const { error } = await db()
    .from('style_profiles')
    .upsert({ key, guide: p.guide, ...(p.examples ? { examples: p.examples } : {}), ...(p.mail_count !== undefined ? { mail_count: p.mail_count } : {}), updated_at: new Date().toISOString(), updated_by: by })
  if (error) throw new Error(error.message)
}

/** Tekstblok voor de AI: de stijlgids en de voorbeelden van dit profiel (leeg als er nog geen is). */
export async function styleInstructions(key: StyleKey) {
  try {
    const p = (await getProfiles()).find((x) => x.key === key)
    if (!p?.guide) return ''
    const examples = (p.examples ?? []).slice(0, 8).map((e) => `<voorbeeld>\n${e}\n</voorbeeld>`).join('\n')
    return `Schrijfstijl (${STYLE_LABEL[key]}), afgeleid uit echte verzonden mails. Schrijf zo:\n${p.guide}${examples ? `\n\nVoorbeelden van echte mails:\n${examples}` : ''}`
  } catch {
    return ''
  }
}

const norm = (t: string) => t.replace(/\s+/g, ' ').trim()

/** Bewaart wat de AI voorstelde tegenover wat Casper echt verstuurde (enkel als het verschilt). */
export async function recordFeedback(key: StyleKey, aiText: string | null | undefined, sentText: string) {
  if (!aiText || norm(aiText) === norm(sentText)) return
  try {
    await db().from('style_feedback').insert({ key, ai_text: aiText.slice(0, 4000), sent_text: sentText.slice(0, 4000) })
  } catch {
    // feedback is een extraatje: nooit het versturen laten mislukken
  }
}


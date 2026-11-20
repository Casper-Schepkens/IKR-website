'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import { isVoice, saveVoiceSettings } from '@/lib/admin/voice/store'
import type { ActionResult } from './actions'

/** Spraakbot-instellingen: iedereen van het team mag de daglimiet, stem en koers aanpassen. */
export async function saveVoiceSettingsAction(form: FormData): Promise<ActionResult> {
  try {
    const { user, mode } = await requireAdmin()
    if (mode === 'demo') throw new Error('Niet in demomodus.')
    const limit = Number(String(form.get('daily_limit_eur') ?? '').replace(',', '.'))
    const fx = Number(String(form.get('usd_to_eur') ?? '').replace(',', '.'))
    const voice = String(form.get('voice') ?? '')
    if (!Number.isFinite(limit) || limit < 0 || limit > 1000) throw new Error('Daglimiet: tussen €0 en €1000.')
    if (!Number.isFinite(fx) || fx <= 0 || fx >= 5) throw new Error('Koers: bv. 0,86.')
    if (!isVoice(voice)) throw new Error('Onbekende stem.')
    await saveVoiceSettings({ daily_limit_eur: Math.round(limit * 100) / 100, usd_to_eur: fx, voice }, user.email)
    revalidatePath('/admin/instellingen')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Opslaan mislukt.' }
  }
}

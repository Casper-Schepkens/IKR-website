'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/session'
import { cleanException, cleanNotifyEmail, cleanPriority, cleanWeekly, unknownFields } from '@/lib/booking/core'
import { serverBookingDeps } from '@/lib/booking/deps'
import { PROVIDERS } from '@/lib/booking/busy'
import { clearBusyCache } from '@/lib/booking/service'
import { todayBrussels } from '@/lib/admin/dates'
import type { ActionResult } from './actions'

/**
 * Beschikbaarheid voor /boek. Elk teamlid mag zijn eigen schema (en dat van de anderen) aanpassen; alles
 * wordt server-side gecontroleerd. Wijzigingen zijn meteen zichtbaar op /boek (geen cache op de slots).
 */

async function withStore<T>(fn: (store: NonNullable<ReturnType<typeof serverBookingDeps>>['store'], by: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const { user } = await requireAdmin()
    const deps = serverBookingDeps()
    if (!deps) throw new Error('Boekingen zijn nog niet ingesteld (SUPABASE_SERVICE_ROLE_KEY).')
    const data = await fn(deps.store, user.email)
    revalidatePath('/admin/boekingen')
    revalidatePath('/boek')
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Er ging iets mis.' }
  }
}

async function knownMember(store: NonNullable<ReturnType<typeof serverBookingDeps>>['store'], member: string) {
  const email = String(member ?? '').toLowerCase()
  const config = await store.loadConfig()
  if (!config.members.some((m) => m.member_email === email)) throw new Error('Onbekend teamlid.')
  return { email, config }
}

export async function saveWeeklyAction(member: string, blocks: unknown) {
  return withStore(async (store) => {
    const { email } = await knownMember(store, member)
    await store.saveWeekly(email, cleanWeekly(blocks))
  })
}

export async function addExceptionAction(member: string, raw: { day?: string; kind?: string; start?: string; end?: string }) {
  return withStore(async (store, by) => {
    const { email } = await knownMember(store, member)
    const ex = cleanException(raw)
    if (ex.day < todayBrussels()) throw new Error('Die datum ligt in het verleden.')
    await store.addException(email, ex, by)
  })
}

export async function removeExceptionAction(member: string, id: string) {
  return withStore(async (store) => {
    const { email } = await knownMember(store, member)
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Onbekende uitzondering.')
    await store.removeException(email, id)
  })
}

export async function saveMemberAction(member: string, patch: { active?: boolean; notify_email?: string | null; use_busy?: boolean }) {
  return withStore(async (store) => {
    const { email } = await knownMember(store, member)
    const clean: { active?: boolean; notify_email?: string | null; use_busy?: boolean } = {}
    if (typeof patch.active === 'boolean') clean.active = patch.active
    if (typeof patch.use_busy === 'boolean') clean.use_busy = patch.use_busy
    if (patch.notify_email !== undefined) clean.notify_email = cleanNotifyEmail(patch.notify_email)
    await store.saveMember(email, clean)
    clearBusyCache()
  })
}

export async function setSourceAction(member: string, provider: string, active: boolean) {
  return withStore(async (store) => {
    const { email } = await knownMember(store, member)
    if (!PROVIDERS[provider]) throw new Error('Onbekende agenda-bron.')
    await store.setSource(email, provider, Boolean(active))
    clearBusyCache()
  })
}

export async function saveGeneralAction(input: { priority?: unknown; confirm_subject?: string; confirm_template?: string; call_name?: string; call_minutes?: number }) {
  return withStore(async (store, by) => {
    const config = await store.loadConfig()
    const subject = String(input.confirm_subject ?? '').trim()
    const template = String(input.confirm_template ?? '').trim()
    if (subject.length < 3 || subject.length > 200) throw new Error('Onderwerp: tussen 3 en 200 tekens.')
    if (template.length < 10 || template.length > 5000) throw new Error('Mailtekst: tussen 10 en 5000 tekens.')
    const bad = [...new Set([...unknownFields(subject), ...unknownFields(template)])]
    if (bad.length) throw new Error(`Onbekende plaatshouder: ${bad.map((b) => `{${b}}`).join(', ')}.`)
    const name = String(input.call_name ?? '').trim()
    const minutes = Number(input.call_minutes)
    if (name.length < 2 || name.length > 80) throw new Error('Naam van de call: tussen 2 en 80 tekens.')
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 120 || minutes % 5) throw new Error('Duur: tussen 15 en 120 minuten, per 5 minuten.')
    await store.saveSettings({ priority: cleanPriority(input.priority, config.members.map((m) => m.member_email)), confirm_subject: subject, confirm_template: template }, by)
    await store.saveCallType(config.callType.id, { name, minutes })
  })
}

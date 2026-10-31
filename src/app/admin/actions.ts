'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/session'
import {
  STAGES,
  type IdeaStatus,
  type InvoiceStatus,
  type Stage,
  type EventKind,
  type BillingCycle,
} from '@/lib/admin/types'
import {
  analyzeResults,
  askAssistant,
  dailyBriefing,
  developIdea,
  draftEmail,
  EMAIL_PURPOSES,
  generateIdeas,
  shootBrief,
  summarizeClient,
  type EmailPurpose,
} from '@/lib/admin/ai/tasks'
import { generateDeck, uploadTemplateToClaude } from '@/lib/admin/ai/decks'
import { computeTodos } from '@/lib/admin/todos'
import { prepareUpcomingInvoices } from '@/lib/admin/jobs'
import { createBillitInvoice } from '@/lib/admin/integrations/billit'
import { requestGrokDevelopment } from '@/lib/admin/integrations/grok'
import { headers } from 'next/headers'
import { putFile } from '@/lib/admin/storage'
import { isSupabaseConfigured } from '@/lib/admin/env'
import { createServerSupabase } from '@/lib/admin/supabase/server'
import { brusselsToIso, slugify } from '@/lib/admin/format'
import { resultsToText, summarizeResults } from '@/lib/admin/results'

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

function refresh() {
  revalidatePath('/admin', 'layout')
}

async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    refresh()
    return { ok: true, data }
  } catch (err) {
    console.error('[admin action]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Er liep iets mis.' }
  }
}

function str(form: FormData, key: string) {
  const v = form.get(key)
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

async function loadClient(clientId: string) {
  const s = await requireAdmin()
  const client = await s.repo.getClient(clientId)
  if (!client) throw new Error('Klant niet gevonden')
  return { s, client }
}

// ─────────────────────────────────────────────────────────────
// Klanten
// ─────────────────────────────────────────────────────────────

export async function createClientAction(form: FormData) {
  const s = await requireAdmin()
  const name = str(form, 'name')
  if (!name) throw new Error('Naam is verplicht')
  const stage = (str(form, 'stage') as Stage | null) ?? 'lead'
  const client = await s.repo.createClient({
    name,
    stage: STAGES.includes(stage) ? stage : 'lead',
    source: str(form, 'source'),
    sector: str(form, 'sector'),
    website: str(form, 'website'),
  })
  await s.repo.addActivity({
    client_id: client.id,
    kind: 'system',
    title: 'Klant aangemaakt',
    created_by: s.user.name,
  })
  refresh()
  redirect(`/admin/klanten/${client.id}`)
}

const LOGO_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

export async function updateClientAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { s, client } = await loadClient(clientId)
    let logo_url = client.logo_url
    const logo = form.get('logo')
    if (logo instanceof File && logo.size > 0) {
      const ext = LOGO_TYPES[logo.type]
      if (!ext) throw new Error('Logo moet een PNG, JPG, WebP of SVG zijn')
      if (logo.size > 900 * 1024) throw new Error('Logo is te groot (max 900 KB)')
      logo_url = `${clientId}/${Date.now()}.${ext}`
      await putFile('logos', logo_url, Buffer.from(await logo.arrayBuffer()), logo.type)
    } else if (form.has('logo_url')) {
      const u = str(form, 'logo_url')
      // Lege waarde = logo weghalen; een https-URL = extern logo; een geüpload pad blijft staan.
      if (!u) logo_url = null
      else if (/^https:\/\//i.test(u)) logo_url = u
      else if (u !== client.logo_url) throw new Error('Logo-URL moet met https:// beginnen')
    }
    await s.repo.updateClient(clientId, {
      name: str(form, 'name') ?? undefined,
      logo_url,
      source: str(form, 'source'),
      sector: str(form, 'sector'),
      website: str(form, 'website'),
      tiktok_handle: str(form, 'tiktok_handle'),
      drive_folder_url: str(form, 'drive_folder_url'),
      vat_number: str(form, 'vat_number'),
      billing_email: str(form, 'billing_email'),
      summary: str(form, 'summary'),
    })
  })
}

export async function moveStageAction(clientId: string, stage: Stage) {
  return attempt(async () => {
    if (!STAGES.includes(stage)) throw new Error('Onbekende fase')
    const { s, client } = await loadClient(clientId)
    if (client.stage === stage) return
    await s.repo.moveStage(clientId, stage, s.user.name)
    await s.repo.addActivity({
      client_id: clientId,
      kind: 'system',
      title: `${s.user.name} zette de fase op ${stage}`,
      created_by: s.user.name,
    })
  })
}

export async function addNoteAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { s } = await loadClient(clientId)
    const body = str(form, 'body')
    if (!body) throw new Error('Notitie is leeg')
    const kind = str(form, 'kind') === 'call' ? 'call' : 'note'
    await s.repo.addActivity({
      client_id: clientId,
      kind,
      title: str(form, 'title') ?? (kind === 'call' ? 'Call' : 'Notitie'),
      body,
      created_by: s.user.name,
    })
  })
}

export async function addContactAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { s } = await loadClient(clientId)
    const name = str(form, 'name')
    if (!name) throw new Error('Naam is verplicht')
    const existing = await s.repo.listContacts(clientId)
    await s.repo.addContact({
      client_id: clientId,
      name,
      role: str(form, 'role'),
      email: str(form, 'email'),
      phone: str(form, 'phone'),
      is_primary: existing.length === 0,
    })
  })
}

export async function saveProfileAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { s } = await loadClient(clientId)
    await s.repo.upsertProfile(clientId, {
      brand_summary: str(form, 'brand_summary'),
      tone_of_voice: str(form, 'tone_of_voice'),
      target_audience: str(form, 'target_audience'),
      what_works: str(form, 'what_works'),
      avoid: str(form, 'avoid'),
      learnings: str(form, 'learnings'),
    })
  })
}

// ─────────────────────────────────────────────────────────────
// Contracten & facturen
// ─────────────────────────────────────────────────────────────

export async function saveContractAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { s } = await loadClient(clientId)
    const start = str(form, 'start_date')
    if (!start) throw new Error('Startdatum is verplicht')
    const amount = Number((str(form, 'monthly_amount') ?? '0').replace(',', '.'))
    const cycle = (str(form, 'billing_cycle') ?? 'monthly') as BillingCycle
    await s.repo.saveContract({
      id: str(form, 'id') ?? undefined,
      client_id: clientId,
      package_name: str(form, 'package_name'),
      videos_per_month: Number(str(form, 'videos_per_month') ?? '') || null,
      monthly_amount_cents: Math.round((Number.isFinite(amount) ? amount : 0) * 100),
      billing_cycle: ['monthly', 'quarterly', 'one_off'].includes(cycle) ? cycle : 'monthly',
      billing_day: Math.min(28, Math.max(1, Number(str(form, 'billing_day') ?? '1') || 1)),
      start_date: start,
      end_date: str(form, 'end_date'),
      renewal_notice_days: Number(str(form, 'renewal_notice_days') ?? '30') || 30,
      status: (str(form, 'status') as 'draft' | 'active' | 'ended' | null) ?? 'active',
      billit_customer_id: null,
      notes: str(form, 'notes'),
    })
    await prepareUpcomingInvoices(s.repo)
  })
}

export async function prepareInvoicesAction() {
  return attempt(async () => {
    const s = await requireAdmin()
    return prepareUpcomingInvoices(s.repo)
  })
}

export async function setInvoiceStatusAction(invoiceId: string, status: InvoiceStatus) {
  return attempt(async () => {
    const s = await requireAdmin()
    const now = new Date().toISOString()
    await s.repo.updateInvoice(invoiceId, {
      status,
      ...(status === 'sent' ? { sent_at: now } : {}),
      ...(status === 'paid' ? { paid_at: now } : {}),
    })
  })
}

export async function pushInvoiceToBillitAction(invoiceId: string) {
  return attempt(async () => {
    const s = await requireAdmin()
    const invoice = (await s.repo.listInvoices()).find((i) => i.id === invoiceId)
    if (!invoice) throw new Error('Factuur niet gevonden')
    const client = await s.repo.getClient(invoice.client_id)
    if (!client) throw new Error('Klant niet gevonden')
    const contract =
      (await s.repo.listContracts(client.id)).find((c) => c.id === invoice.contract_id) ?? null
    const contact = (await s.repo.listContacts(client.id)).find((c) => c.is_primary)
    const billitId = await createBillitInvoice({
      client,
      contract,
      invoice,
      contactEmail: contact?.email,
    })
    await s.repo.updateInvoice(invoiceId, { status: 'draft', billit_invoice_id: billitId })
    await s.repo.addActivity({
      client_id: client.id,
      kind: 'system',
      title: `Factuur ${invoice.label ?? ''} klaargezet in Billit`,
      created_by: s.user.name,
    })
    return billitId
  })
}

// ─────────────────────────────────────────────────────────────
// Kalender
// ─────────────────────────────────────────────────────────────

export async function createEventAction(form: FormData) {
  return attempt(async () => {
    const s = await requireAdmin()
    const title = str(form, 'title')
    const date = str(form, 'date')
    const start = str(form, 'start') ?? '09:00'
    const end = str(form, 'end')
    if (!title || !date) throw new Error('Titel en datum zijn verplicht')
    const toIso = (t: string) => brusselsToIso(date, t)
    const kind = (str(form, 'kind') ?? 'meeting') as EventKind
    await s.repo.createEvent({
      client_id: str(form, 'client_id'),
      kind,
      title,
      starts_at: toIso(start),
      ends_at: end ? toIso(end) : null,
      location: str(form, 'location'),
      attendees: form.getAll('attendees').filter((v): v is string => typeof v === 'string'),
      notes: str(form, 'notes'),
    })
  })
}

export async function deleteEventAction(eventId: string) {
  return attempt(async () => {
    const s = await requireAdmin()
    await s.repo.deleteEvent(eventId)
  })
}

// ─────────────────────────────────────────────────────────────
// Ideeën & decks
// ─────────────────────────────────────────────────────────────

export async function addIdeaAction(clientId: string, form: FormData) {
  return attempt(async () => {
    const { s } = await loadClient(clientId)
    const title = str(form, 'title')
    if (!title) throw new Error('Titel is verplicht')
    await s.repo.insertIdeas(clientId, [
      { title, summary: str(form, 'summary'), source: 'manual', status: 'proposal' },
    ])
  })
}

export async function setIdeaStatusAction(ideaId: string, status: IdeaStatus, feedback?: string) {
  return attempt(async () => {
    const s = await requireAdmin()
    const idea = await s.repo.getIdea(ideaId)
    if (!idea) throw new Error('Idee niet gevonden')
    await s.repo.updateIdea(ideaId, { status, ...(feedback ? { feedback } : {}) })
    // Leerlus: afgekeurde ideeën met reden komen in het klantprofiel.
    if (status === 'rejected' && feedback) {
      const profile = await s.repo.getProfile(idea.client_id)
      const line = `“${idea.title}” afgekeurd: ${feedback}`
      await s.repo.upsertProfile(idea.client_id, {
        learnings: profile?.learnings ? `${profile.learnings}\n${line}` : line,
      })
    }
  })
}

export async function updateIdeaAction(ideaId: string, form: FormData) {
  return attempt(async () => {
    const s = await requireAdmin()
    const lines = (key: string) =>
      (str(form, key) ?? '')
        .split('\n')
        .map((l) => l.replace(/^[-•\d.\s]+/, '').trim())
        .filter(Boolean)
    await s.repo.updateIdea(ideaId, {
      title: str(form, 'title') ?? undefined,
      summary: str(form, 'summary'),
      format: str(form, 'format'),
      hook: str(form, 'hook'),
      cta: str(form, 'cta'),
      structure: lines('structure'),
      shots: lines('shots'),
      needs: lines('needs'),
    })
  })
}

export async function createDeckAction(
  clientId: string,
  ideaIds: string[],
  templateId: string | null,
) {
  return attempt(async () => {
    const { s, client } = await loadClient(clientId)
    if (!ideaIds.length) throw new Error('Selecteer minstens één idee')
    const allIdeas = await s.repo.listIdeas(clientId)
    const ideas = ideaIds
      .map((id) => allIdeas.find((i) => i.id === id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i))
    const template = templateId
      ? ((await s.repo.listTemplates()).find((t) => t.id === templateId) ?? null)
      : null
    const deck = await s.repo.createDeck({
      client_id: clientId,
      template_id: template?.id ?? null,
      title: `Content-voorstel ${client.name}`,
      idea_ids: ideas.map((i) => i.id),
    })
    after(() => generateDeck({ session: s, deckId: deck.id, client, ideas, template }))
    return deck.id
  })
}

export async function uploadTemplateAction(form: FormData) {
  return attempt(async () => {
    await requireAdmin()
    const name = str(form, 'name')
    const file = form.get('file')
    if (!name || !(file instanceof File) || file.size === 0)
      throw new Error('Naam en .pptx-bestand zijn verplicht')
    if (!file.name.toLowerCase().endsWith('.pptx')) throw new Error('Alleen .pptx-bestanden')
    if (file.size > 50 * 1024 * 1024) throw new Error('Bestand is te groot (max 50 MB)')
    const data = Buffer.from(await file.arrayBuffer())
    const path = `${slugify(name)}-${Date.now()}.pptx`
    await putFile(
      'templates',
      path,
      data,
      file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    )
    const fileId = await uploadTemplateToClaude(file.name, data).catch((e) => {
      console.error('[template] upload naar Claude mislukt', e)
      return null
    })
    if (!isSupabaseConfigured())
      throw new Error(
        'Templates opslaan vraagt Supabase (demomodus heeft al 2 voorbeeldtemplates).',
      )
    const db = await createServerSupabase()
    const { error } = await db.from('templates').insert({
      name,
      description: str(form, 'description'),
      storage_path: path,
      anthropic_file_id: fileId,
    })
    if (error) throw new Error(error.message)
  })
}

// ─────────────────────────────────────────────────────────────
// IKR-kennis
// ─────────────────────────────────────────────────────────────

export async function saveKnowledgeAction(form: FormData) {
  return attempt(async () => {
    const s = await requireAdmin()
    const title = str(form, 'title')
    if (!title) throw new Error('Titel is verplicht')
    await s.repo.saveKnowledge({
      slug: str(form, 'slug') ?? slugify(title),
      title,
      body: (form.get('body') as string | null) ?? '',
      updated_by: s.user.name,
    })
  })
}

// ─────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────

export async function generateIdeasAction(clientId: string, count: number, focus: string) {
  return attempt(async () => {
    const { s, client } = await loadClient(clientId)
    return generateIdeas(s, client, {
      count: Math.min(12, Math.max(1, count || 5)),
      focus: focus.trim() || undefined,
    })
  })
}

export async function developIdeaAction(ideaId: string, instruction?: string) {
  return attempt(async () => {
    const s = await requireAdmin()
    const idea = await s.repo.getIdea(ideaId)
    if (!idea) throw new Error('Idee niet gevonden')
    const client = await s.repo.getClient(idea.client_id)
    if (!client) throw new Error('Klant niet gevonden')
    await developIdea(s, client, idea, instruction)
  })
}

export async function grokDevelopIdeaAction(ideaId: string, instruction?: string) {
  return attempt(async () => {
    const s = await requireAdmin()
    const idea = await s.repo.getIdea(ideaId)
    if (!idea) throw new Error('Idee niet gevonden')
    const client = await s.repo.getClient(idea.client_id)
    if (!client) throw new Error('Klant niet gevonden')
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'iknowright.be'
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
    await requestGrokDevelopment({ session: s, client, idea, origin: `${proto}://${host}`, instruction })
  })
}

export async function summarizeClientAction(clientId: string) {
  return attempt(async () => {
    const { s, client } = await loadClient(clientId)
    await summarizeClient(s, client)
  })
}

export async function draftEmailAction(clientId: string, purpose: EmailPurpose) {
  return attempt(async () => {
    if (!(purpose in EMAIL_PURPOSES)) throw new Error('Onbekend doel')
    const { s, client } = await loadClient(clientId)
    const contact = (await s.repo.listContacts(clientId)).find((c) => c.is_primary)
    const mail = await draftEmail(s, client, purpose)
    return { ...mail, to: contact?.email ?? client.billing_email ?? null }
  })
}

export async function dailyBriefingAction() {
  return attempt(async () => {
    const s = await requireAdmin()
    const todos = await computeTodos(s)
    return dailyBriefing(
      s,
      todos.map((t) => `${t.title} — ${t.detail}`),
    )
  })
}

export async function shootBriefAction(eventId: string) {
  return attempt(async () => {
    const s = await requireAdmin()
    await shootBrief(s, eventId)
  })
}

export async function askAction(question: string) {
  return attempt(async () => {
    const q = question.trim()
    if (!q) throw new Error('Stel een vraag')
    const s = await requireAdmin()
    return (await askAssistant(s, q.slice(0, 2000))).answer
  })
}

export async function analyzeResultsAction(clientId: string | null) {
  return attempt(async () => {
    const s = await requireAdmin()
    const videos = await s.repo.listVideosWithStats({ clientId: clientId ?? undefined })
    if (!videos.length) throw new Error('Nog geen videodata om te analyseren.')
    return (await analyzeResults(s, resultsToText(summarizeResults(videos)))).insights
  })
}

// ─────────────────────────────────────────────────────────────
// Sessie
// ─────────────────────────────────────────────────────────────

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const db = await createServerSupabase()
    await db.auth.signOut()
  }
  redirect('/admin/login')
}

import 'server-only'
import type { Lead } from '../../sales/types'
import { z } from 'zod'
import { createServiceSupabase } from '../../supabase/server'
import { isoDay } from '../../format'
import { cancelCall, finishCall, registerCall, syncCallsFromCalendar } from '../../calls/service'
import { CALL_KIND_LABELS, CALL_STATUSES, callStats, cleanPptUrl, nextBotContext, salesPptUrl, type Call } from '../../calls/types'
import { addBotToMeeting, getTranscript, isBotInMeeting } from '../../fireflies'
import { linkTranscript, serviceDeps } from '../../calls/transcripts'

import { BY, dateStr, uuid, type ToolCtx } from '../tool'

/** Setter- en sales calls, Fireflies en transcripts (sales). */
export function registerCallTools(ctx: ToolCtx) {
  const { tool, session, resolveLead } = ctx
  const { leads, drafts, calls } = session
  // ─── Calls (sales) ───────────────────────────────────────
  /** Met een lijst van leads (calls_lijst): geen aparte query per call. */
  const callView = async (c: Call, known?: Map<string, Lead>) => {
    const l = known ? (known.get(c.lead_id) ?? null) : await leads.get(c.lead_id)
    return {
      call_id: c.id,
      soort: c.kind,
      status: c.status,
      start: c.starts_at,
      eind: c.ends_at,
      lead_id: c.lead_id,
      lead: l ? { naam: l.name, bedrijf: l.company, email: l.email, telefoon: l.phone, fase: l.stage, volgende_actie: l.next_action } : null,
      meet: c.meet_url,
      opname: c.recording_url,
      fireflies_toegevoegd: c.fireflies_added_at,
      lead_uitgenodigd: c.invited,
      bron: c.created_via,
      notitie: c.note,
      agenda_fout: c.calendar_error,
      transcript: c.transcript_url ?? null,
      bedankmail_concept_id: c.thank_you_draft_id ?? null,
      analyse: c.analysis ?? null,
      sales_ppt_url: c.kind === 'sales' ? salesPptUrl(c) : null,
      sales_ppt_eigen: Boolean(c.sales_ppt_url),
      heeft_context: Boolean(c.bot_context?.trim()),
    }
  }
  const callDeps = { calls, leads }
  const getCall = async (id: string) => {
    const c = await calls.get(uuid(id, 'call_id'))
    if (!c) throw new Error('Call niet gevonden.')
    return c
  }
  tool(
    'calls_lijst',
    'Setter- en sales calls met lead, context en links. Standaard de geplande calls (vroegste eerst). Kijkt eerst in de contact-agenda naar nieuwe calls.',
    { status: z.enum(CALL_STATUSES).optional().describe('standaard: gepland'), soort: z.enum(['setter', 'sales']).optional(), lead_id: z.string().optional() },
    true,
    async ({ status = 'gepland', soort, lead_id }) => {
      await syncCallsFromCalendar(callDeps).catch(() => undefined)
      const list = (await calls.list(lead_id ? { leadId: uuid(lead_id, 'lead_id') } : {})).filter((c) => c.status === status && (!soort || c.kind === soort))
      const known = new Map((await leads.list()).map((l) => [l.id, l]))
      return Promise.all(list.slice(0, 50).map((c) => callView(c, known)))
    },
  )
  tool('call_context_lezen', '"Context van Grok Bot" van een call lezen (markdown, apart van Caspers notitie), met wie en wanneer laatst bijgewerkt.', { call_id: z.string() }, true, async ({ call_id }) => {
    const c = await getCall(call_id)
    return { call_id: c.id, tekst: c.bot_context ?? '', bijgewerkt_op: c.bot_context_updated_at ?? null, door: c.bot_context_updated_by ?? null }
  })
  tool(
    'call_context_bijwerken',
    '"Context van Grok Bot" van een call invullen (markdown: kopjes, opsommingen, links). modus "vervangen" = hele tekst vervangen, "toevoegen" = onderaan toevoegen. Raakt Caspers notitie niet aan.',
    { call_id: z.string(), tekst: z.string(), modus: z.enum(['vervangen', 'toevoegen']) },
    false,
    async ({ call_id, tekst, modus }) => {
      const c = await getCall(call_id)
      const next = nextBotContext(c.bot_context, tekst, modus)
      await calls.update(c.id, { bot_context: next, bot_context_updated_at: new Date().toISOString(), bot_context_updated_by: BY })
      return { call_id: c.id, tekens: next?.length ?? 0 }
    },
  )
  tool(
    'call_sales_ppt_zetten',
    'De sales-ppt van één call aanpassen (komt op de callkaart en in de bedankmail). url = https-link, of leeg om terug te gaan naar de standaard-ppt.',
    { call: z.string().describe('call_id'), url: z.string().describe('https-link of leeg') },
    false,
    async ({ call, url }) => {
      const c = await getCall(call)
      const next = cleanPptUrl(url)
      await calls.update(c.id, { sales_ppt_url: next })
      return next ? `Sales-ppt van deze call: ${next}` : 'Terug naar de standaard-ppt.'
    },
  )
  tool(
    'calls_cijfers',
    'Cijfers over calls (enkel opvragen): per soort gepland/afgerond/no-show/geannuleerd en no-show-%, en hoeveel leads na een setter call een sales call kregen. Periode op startdatum (YYYY-MM-DD, tot inclusief).',
    { van: dateStr.optional(), tot: dateStr.optional() },
    true,
    async ({ van, tot }) => ({ periode: { van: van ?? null, tot: tot ?? null }, ...callStats(await calls.list(), van, tot) }),
  )
  tool(
    'call_registreren',
    'Een call registreren die al in de agenda staat (bv. zelf ingepland). Maakt GEEN agenda-item en stuurt GEEN uitnodiging. Zet de fase van de lead vooruit (setter/sales call gepland).',
    {
      lead: z.string().describe('naam, e-mail of id van de lead'),
      soort: z.enum(['setter', 'sales']),
      datum: dateStr,
      uur: z.string().regex(/^\d{2}:\d{2}$/),
      duur_minuten: z.number().int().min(5).max(240).optional(),
      meet_link: z.string().optional().describe('Google Meet-link als die er is'),
    },
    false,
    async ({ lead, soort, datum, uur, duur_minuten, meet_link }) => {
      const l = await resolveLead(lead)
      return callView(await registerCall(callDeps, { leadId: l.id, kind: soort, date: datum, time: uur, minutes: duur_minuten, meetUrl: meet_link, by: BY }))
    },
  )
  tool(
    'call_afronden',
    'Call afronden: "afgerond" (fase vooruit: setter/sales call gehouden) of "no_show" (kwam niet opdagen: er komt een mailconcept om een nieuwe call te plannen; Casper verstuurt het zelf).',
    { call_id: z.string(), resultaat: z.enum(['afgerond', 'no_show']), notitie: z.string().optional() },
    false,
    async ({ call_id, resultaat, notitie }) => {
      const c = await getCall(call_id)
      const r = await finishCall({ ...callDeps, drafts }, c.id, resultaat, notitie?.trim() || null, BY)
      return { ...(await callView(r.call)), concept_id: r.draftId }
    },
  )
  tool(
    'call_annuleren',
    'Call op geannuleerd zetten. Haalt het agenda-item NIET weg en verwittigt niemand (dat doet Casper zelf, bv. via de knop in het dashboard).',
    { call_id: z.string(), reden: z.string().optional() },
    false,
    async ({ call_id, reden }) => {
      const c = await getCall(call_id)
      await cancelCall(callDeps, c.id, { removeFromCalendar: false, note: reden?.trim() || null })
      return 'Call geannuleerd (agenda-item blijft staan).'
    },
  )
  tool('call_fireflies_check', 'Zit de Fireflies-bot in de Google Meet van deze sales call?', { call_id: z.string() }, true, async ({ call_id }) => {
    const c = await getCall(call_id)
    if (!c.meet_url) throw new Error('Deze call heeft geen Meet-link.')
    return { in_meeting: await isBotInMeeting(c.meet_url) }
  })
  tool('call_fireflies_toevoegen', 'Fireflies aan de Google Meet van deze sales call toevoegen (als hij er niet in zit).', { call_id: z.string() }, false, async ({ call_id }) => {
    const c = await getCall(call_id)
    if (!c.meet_url) throw new Error('Deze call heeft geen Meet-link.')
    await addBotToMeeting(c.meet_url, `IKR ${CALL_KIND_LABELS[c.kind].toLowerCase()} ${isoDay(new Date(c.starts_at))}`)
    await calls.update(c.id, { fireflies_added_at: new Date().toISOString() })
    return 'Fireflies toegevoegd.'
  })
  tool(
    'transcripts_ongekoppeld',
    'Fireflies-transcripts die niet automatisch aan een call gekoppeld konden worden (of waarbij iets misliep). Vraag Casper bij welke call ze horen en koppel ze met transcript_koppelen.',
    {},
    true,
    async () => {
      const { data, error } = await createServiceSupabase()
        .from('call_transcripts')
        .select('fireflies_id, title, meeting_link, started_at, attendees, status, error, received_at')
        .in('status', ['ongekoppeld', 'fout'])
        .order('received_at', { ascending: false })
        .limit(30)
      if (error) throw new Error(error.message)
      return data ?? []
    },
  )
  tool(
    'transcript_koppelen',
    'Een Fireflies-transcript aan een call koppelen en verwerken (Drive, call afronden, lead bijwerken, bedankmail, analyse). Enkel na bevestiging van Casper als het niet zeker is.',
    { fireflies_id: z.string(), call_id: z.string() },
    false,
    async ({ fireflies_id, call_id }) => {
      const c = await getCall(call_id)
      await linkTranscript(fireflies_id.trim(), c.id, session.mode === 'demo' ? { calls, leads, drafts } : serviceDeps())
      return callView((await calls.get(c.id))!)
    },
  )
  tool('call_transcript', 'Het volledige Fireflies-transcript van een call (tekst).', { call_id: z.string() }, true, async ({ call_id }) => {
    const c = await getCall(call_id)
    if (!c.fireflies_id) throw new Error('Deze call heeft (nog) geen transcript.')
    const t = await getTranscript(c.fireflies_id)
    return { titel: t.title, drive: c.transcript_url, fireflies: t.firefliesUrl, tekst: t.text }
  })
  tool('calls_agenda_nakijken', 'Nu in de contact-agenda kijken naar nieuwe of verschoven calls met leads (enkel lezen in de agenda).', {}, false, async () =>
    syncCallsFromCalendar(callDeps, { force: true }),
  )
}

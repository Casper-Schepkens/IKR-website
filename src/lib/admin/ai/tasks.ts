import 'server-only'
import { z } from 'zod'
import { runStructured } from './run'
import type { AdminSession } from '../session'
import {
  STAGE_LABELS,
  IDEA_STATUS_LABELS,
  type Client,
  type ContentIdea,
  type ShootBrief,
} from '../types'
import { euro, fmtDate, fmtTime, isoDay, addDays } from '../format'
import { nextSendDate } from '../billing'

// ─────────────────────────────────────────────────────────────
// Context (laag 2)
// ─────────────────────────────────────────────────────────────

function ideaLine(i: ContentIdea) {
  const fb = i.feedback ? ` — feedback: ${i.feedback}` : ''
  return `- [${IDEA_STATUS_LABELS[i.status]}] ${i.title}${i.summary ? `: ${i.summary}` : ''}${fb}`
}

export async function clientContext(session: AdminSession, client: Client) {
  const [profile, ideas, activities, contracts] = await Promise.all([
    session.repo.getProfile(client.id),
    session.repo.listIdeas(client.id),
    session.repo.listActivities({ clientId: client.id, limit: 10 }),
    session.repo.listContracts(client.id),
  ])
  const contract = contracts.find((c) => c.status === 'active')
  const lines = [
    `<klant naam="${client.name}">`,
    `Fase: ${STAGE_LABELS[client.stage]}`,
    client.sector ? `Sector: ${client.sector}` : null,
    client.summary ? `Omschrijving: ${client.summary}` : null,
    client.tiktok_handle ? `TikTok: ${client.tiktok_handle}` : null,
    contract
      ? `Contract: ${contract.package_name ?? ''} · ${euro(contract.monthly_amount_cents)}/maand · loopt tot ${contract.end_date ?? 'onbepaald'}`
      : null,
    profile
      ? [
          '',
          'Klantprofiel:',
          profile.brand_summary && `- Merk: ${profile.brand_summary}`,
          profile.tone_of_voice && `- Toon: ${profile.tone_of_voice}`,
          profile.target_audience && `- Doelgroep: ${profile.target_audience}`,
          profile.what_works && `- Werkt goed: ${profile.what_works}`,
          profile.avoid && `- Liever niet: ${profile.avoid}`,
          profile.learnings && `- Geleerd: ${profile.learnings}`,
        ]
          .filter(Boolean)
          .join('\n')
      : null,
    ideas.length
      ? `\nEerdere ideeën (nieuwste eerst):\n${ideas.slice(0, 25).map(ideaLine).join('\n')}`
      : null,
    activities.length
      ? `\nRecente activiteit:\n${activities
          .map(
            (a) =>
              `- ${fmtDate(a.created_at)} · ${a.title ?? a.kind}${a.body ? `: ${a.body}` : ''}`,
          )
          .join('\n')}`
      : null,
    `</klant>`,
  ]
  return lines.filter((l) => l !== null).join('\n')
}

/** Compacte momentopname van het hele bedrijf, voor de assistent en de dagbriefing. */
export async function companySnapshot(session: AdminSession) {
  const now = new Date()
  const today = isoDay(now)
  const [clients, events, invoices, contracts, activities] = await Promise.all([
    session.repo.listClients(),
    session.repo.listEvents(addDays(now, -1).toISOString(), addDays(now, 21).toISOString()),
    session.repo.listInvoices({ statuses: ['to_send', 'draft', 'sent', 'overdue'] }),
    session.repo.listContracts(),
    session.repo.listActivities({ limit: 25 }),
  ])
  const name = (id: string | null) => clients.find((c) => c.id === id)?.name ?? '—'
  return [
    `Vandaag: ${fmtDate(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
    '',
    'Klanten:',
    ...clients.map(
      (c) =>
        `- ${c.name} · fase ${STAGE_LABELS[c.stage]} sinds ${fmtDate(c.stage_changed_at)}`,
    ),
    '',
    'Agenda (komende 3 weken):',
    ...(events.length
      ? events.map(
          (e) =>
            `- ${fmtDate(e.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })} ${fmtTime(e.starts_at)} · ${e.title}${e.kind === 'shoot' ? (e.brief ? ' (draaiboek klaar)' : ' (geen draaiboek)') : ''}`,
        )
      : ['- niets gepland']),
    '',
    'Open facturen:',
    ...(invoices.length
      ? invoices.map(
          (i) =>
            `- ${name(i.client_id)} · ${i.label ?? ''} · ${euro(i.amount_cents)} · ${i.status} · ${i.send_date}`,
        )
      : ['- geen']),
    '',
    'Contracten:',
    ...contracts
      .filter((c) => c.status === 'active')
      .map(
        (c) =>
          `- ${name(c.client_id)} · ${euro(c.monthly_amount_cents)}/maand · tot ${c.end_date ?? 'onbepaald'} · volgende factuur ${nextSendDate(c, today) ?? '—'}`,
      ),
    '',
    'Recente activiteit:',
    ...activities.map(
      (a) => `- ${fmtDate(a.created_at)} · ${name(a.client_id)} · ${a.title ?? a.kind}`,
    ),
  ].join('\n')
}

// ─────────────────────────────────────────────────────────────
// Taken
// ─────────────────────────────────────────────────────────────

const IdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string().describe('Korte, pakkende werktitel'),
      summary: z.string().describe('Eén of twee zinnen: wat zie je in de video?'),
      format: z.string().describe('Bv. "Losse video", "Reeks · 3 delen", "Sketch", "Talking head"'),
    }),
  ),
})

export async function generateIdeas(
  session: AdminSession,
  client: Client,
  opts: { count: number; focus?: string },
) {
  const out = await runStructured({
    session,
    task: 'generate_ideas',
    clientId: client.id,
    schema: IdeasSchema,
    effort: 'high',
    context: await clientContext(session, client),
    prompt: `Bedenk ${opts.count} nieuwe TikTok-ideeën voor ${client.name}.${
      opts.focus ? `\nFocus/briefing van het team: ${opts.focus}` : ''
    }\nHerhaal geen eerdere ideeën. Mik op variatie in format. Elk idee moet haalbaar zijn op een draaidag bij de klant.`,
  })
  await session.repo.insertIdeas(
    client.id,
    out.ideas.map((i) => ({ ...i, status: 'proposal' as const, source: 'ai' as const })),
  )
  await session.repo.addActivity({
    client_id: client.id,
    kind: 'ai',
    title: `IKR AI maakte ${out.ideas.length} ideeën`,
    body: opts.focus ? `Focus: ${opts.focus}` : null,
    created_by: 'IKR AI',
  })
  return out.ideas.length
}

const DevelopSchema = z.object({
  hook: z.string().describe('Letterlijke openingszin of beeld voor de eerste 0–2 seconden'),
  structure: z.array(z.string()).describe('Opbouw in 3–6 korte stappen'),
  shots: z.array(z.string()).describe('Concrete shots voor de draaidag'),
  needs: z.array(z.string()).describe('Props, mensen of locaties die nodig zijn'),
  cta: z.string().describe('Call to action op het einde'),
})

export async function developIdea(
  session: AdminSession,
  client: Client,
  idea: ContentIdea,
  instruction?: string,
) {
  const out = await runStructured({
    session,
    task: 'develop_idea',
    clientId: client.id,
    schema: DevelopSchema,
    context: await clientContext(session, client),
    prompt: `Werk dit idee volledig uit zodat we het op een draaidag kunnen filmen.\n\nIdee: ${idea.title}\n${
      idea.summary ?? ''
    }${idea.hook ? `\nHuidige hook: ${idea.hook}` : ''}${instruction ? `\n\nExtra instructie: ${instruction}` : ''}`,
  })
  await session.repo.updateIdea(idea.id, {
    ...out,
    status: idea.status === 'approved' ? 'approved' : 'developed',
  })
}

const SummarySchema = z.object({
  summary: z.string().describe('Waar staan we met deze klant? 2–4 zinnen.'),
  next_steps: z.array(z.string()).describe('Concrete volgende stappen, max 4'),
})

export async function summarizeClient(session: AdminSession, client: Client) {
  const out = await runStructured({
    session,
    task: 'summarize_client',
    clientId: client.id,
    schema: SummarySchema,
    effort: 'low',
    context: await clientContext(session, client),
    prompt:
      'Vat samen waar we staan met deze klant op basis van de notities en activiteit, en geef de volgende stappen.',
  })
  await session.repo.addActivity({
    client_id: client.id,
    kind: 'ai',
    title: 'Samenvatting door IKR AI',
    body: `${out.summary}\n\nVolgende stappen:\n${out.next_steps.map((s) => `- ${s}`).join('\n')}`,
    created_by: 'IKR AI',
  })
  return out
}

export const EMAIL_PURPOSES = {
  follow_up: 'Opvolgmail na het laatste contact',
  idea_feedback: 'Vriendelijke herinnering: feedback vragen op de voorgestelde ideeën',
  renewal: 'Voorstel om het contract te verlengen, met wat we samen bereikt hebben',
  lead_intro: 'Eerste mail aan een nieuwe lead om een kennismakingscall in te plannen',
} as const
export type EmailPurpose = keyof typeof EMAIL_PURPOSES

const EmailSchema = z.object({
  subject: z.string(),
  body: z
    .string()
    .describe('Volledige mailtekst, met aanhef en afsluiting. Ondertekend met [naam].'),
})

export async function draftEmail(session: AdminSession, client: Client, purpose: EmailPurpose) {
  return runStructured({
    session,
    task: 'draft_email',
    clientId: client.id,
    schema: EmailSchema,
    effort: 'low',
    context: await clientContext(session, client),
    prompt: `Schrijf een mail aan ${client.name}. Doel: ${EMAIL_PURPOSES[purpose]}.\nToon: persoonlijk, kort, zoals IKR zelf schrijft. Geen verzonnen cijfers; gebruik [plaatshouders].`,
  })
}

const BriefingSchema = z.object({
  briefing: z.string().describe('Eén alinea van max 3 zinnen: de belangrijkste dingen vandaag'),
})

export async function dailyBriefing(session: AdminSession, todos: string[]) {
  return runStructured({
    session,
    task: 'daily_briefing',
    schema: BriefingSchema,
    effort: 'low',
    context: `${await companySnapshot(session)}\n\nOpenstaande actiepunten:\n${todos.map((t) => `- ${t}`).join('\n') || '- geen'}`,
    prompt: `Geef ${session.user.name} een korte briefing voor vandaag: wat is het belangrijkst en waarom? Noem klanten bij naam.`,
  })
}

const ShootBriefSchema = z.object({
  schedule: z.array(z.object({ time: z.string().describe('HH:MM'), what: z.string() })),
  shotlist: z.array(z.string()),
  checklist: z.array(z.string()).describe('Wat mee te nemen / te regelen'),
  notes: z.string().describe('Aandachtspunten voor de dag'),
})

export async function shootBrief(session: AdminSession, eventId: string): Promise<ShootBrief> {
  const event = await session.repo.getEvent(eventId)
  if (!event) throw new Error('Event niet gevonden')
  const client = event.client_id ? await session.repo.getClient(event.client_id) : null
  const ideas = client
    ? (await session.repo.listIdeas(client.id)).filter(
        (i) => i.status === 'approved' || i.status === 'developed',
      )
    : []
  const brief = await runStructured({
    session,
    task: 'shoot_brief',
    clientId: client?.id ?? null,
    schema: ShootBriefSchema,
    context: client ? await clientContext(session, client) : undefined,
    prompt: `Maak een draaiboek voor deze draaidag.\nWanneer: ${fmtDate(event.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} van ${fmtTime(event.starts_at)} tot ${
      event.ends_at ? fmtTime(event.ends_at) : '[einde]'
    }\nLocatie: ${event.location ?? '[locatie]'}\nTeam: ${event.attendees.join(', ') || '[team]'}\n${event.notes ? `Notities: ${event.notes}\n` : ''}\nTe filmen ideeën:\n${
      ideas
        .map(
          (i) =>
            `- ${i.title}${i.hook ? ` (hook: ${i.hook})` : ''}${i.shots.length ? ` · shots: ${i.shots.join('; ')}` : ''}`,
        )
        .join('\n') || '- [nog geen goedgekeurde ideeën]'
    }\n\nPlan realistisch met opbouw, pauze en buffer.`,
  })
  await session.repo.updateEvent(eventId, { brief })
  return brief
}

const AskSchema = z.object({
  answer: z
    .string()
    .describe(
      'Antwoord in een paar zinnen of een korte lijst. Zeg het eerlijk als de info ontbreekt.',
    ),
})

export async function askAssistant(session: AdminSession, question: string) {
  return runStructured({
    session,
    task: 'ask',
    schema: AskSchema,
    effort: 'low',
    context: `<ikr_data>\n${await companySnapshot(session)}\n</ikr_data>`,
    prompt: `Vraag van ${session.user.name}: ${question}`,
  })
}

const InsightsSchema = z.object({
  insights: z
    .array(z.string())
    .describe('3 concrete inzichten: wat werkte, wat niet, wat proberen we volgende keer'),
})

export async function analyzeResults(session: AdminSession, summary: string) {
  return runStructured({
    session,
    task: 'results_insights',
    schema: InsightsSchema,
    effort: 'medium',
    context: summary,
    prompt:
      'Analyseer deze TikTok-resultaten. Wat valt op? Baseer je enkel op de cijfers en titels hierboven; verzin geen oorzaken die je niet kan onderbouwen en zeg het als de data te dun is.',
  })
}

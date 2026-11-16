import 'server-only'
import { z } from 'zod'
import { closeChatJob, completeJob, getJob, instructionsFor, isTeamJob, JOB_ALREADY_HANDLED, openJobs, teamScopeConfigured } from '../../ai/jobs'
import { HANDLERS } from '../../ai/handlers'

import { BY, nonEmpty, uuid, type ToolCtx } from '../tool'

/** AI-taken van het dashboard en de chat met Grok Bot. */
export function registerJobTools(ctx: ToolCtx) {
  const { tool, session, scope } = ctx
  const { chat } = session
  // Team-sessie: enkel taken en chats van Cédric en Milan. Sales-sessie: met een team-sleutel enkel de rest.
  const audience = scope === 'team' ? 'team' : teamScopeConfigured() ? 'sales' : 'all'
  /** In een team-sessie: de taak moet van Cédric of Milan zijn (anders zou deze sessie Caspers chat zien). */
  const teamJob = async (jobId: string | undefined) => {
    if (scope !== 'team') return null
    if (!jobId) throw new Error('Geef job_id mee (in deze sessie enkel voor taken van het team).')
    const j = await getJob(uuid(jobId, 'job_id'))
    if (!j || !isTeamJob(j)) throw new Error('Deze taak hoort niet bij deze sessie.')
    return j
  }
  // ─── Chat met Grok Bot (per gebruiker) ────────────────────
  tool(
    'ai_chat_geschiedenis',
    'De chat van één gebruiker met Grok Bot (oudste eerst), met pagina en gekoppeld object per bericht.',
    { user_id: z.string(), limit: z.number().int().min(1).max(100).optional(), job_id: z.string().optional().describe('verplicht in een team-sessie') },
    true,
    async ({ user_id, limit = 20, job_id }) => {
      const j = await teamJob(job_id)
      if (j && (j.input as { user_id?: string }).user_id !== user_id.trim()) throw new Error('Deze taak hoort bij een andere gebruiker.')
      return (await chat.list(uuid(user_id, 'user_id'), limit)).map((m) => ({
        id: m.id,
        rol: m.role,
        tekst: m.text,
        pagina: m.page,
        object: m.object_type ? { type: m.object_type, id: m.object_id } : null,
        aangemaakt: m.created_at,
      }))
    },
  )
  tool(
    'ai_chat_antwoorden',
    'Zet een antwoord van Grok Bot in de chat van een gebruiker. Geef job_id mee om de chat-taak af te sluiten (dan verdwijnt "Grok Bot denkt na…").',
    { user_id: z.string(), tekst: z.string(), job_id: z.string().optional() },
    false,
    async ({ user_id, tekst, job_id }) => {
      const userId = uuid(user_id, 'user_id')
      const text = nonEmpty(tekst, 'tekst', 8000)
      await teamJob(job_id)
      if (!(await chat.hasUser(userId))) throw new Error('Deze gebruiker heeft nog geen chat.')
      // Eerst de taak controleren, zodat een verkeerd job_id geen bericht achterlaat. Was ze al
      // afgesloten (antwoord al geplaatst), dan niet nog eens: anders staat het antwoord er twee keer.
      if (job_id && !(await closeChatJob(uuid(job_id, 'job_id'), userId, BY))) return 'Deze chat-taak was al beantwoord; er is niets meer te doen.'
      const m = await chat.add({ user_id: userId, role: 'bot', text })
      return { bericht_id: m.id }
    },
  )
  // ─── AI-taken (Grokbot als uitvoerder) ────────────────────
  tool(
    'ai_taken_open',
    'Open AI-taken van het dashboard (bv. een antwoord klaarzetten op een sales-mail). Per taak: de instructies, de opdracht en de vorm van het resultaat. Voer elke taak uit en geef het resultaat terug met ai_taak_klaarzetten.',
    { aantal: z.number().int().min(1).max(20).optional() },
    true,
    async ({ aantal = 10 }) =>
      Promise.all(
        (await openJobs(aantal, audience)).map(async (j) => {
          const h = HANDLERS[j.type]
          return {
            job_id: j.id,
            type: j.type,
            instructies: await instructionsFor(j),
            opdracht: h.prompt(j.input),
            resultaat_vorm: z.toJSONSchema(h.schema),
          }
        }),
      ),
  )
  tool(
    'ai_taak_klaarzetten',
    'Resultaat van een AI-taak terugzetten (een object in de vorm van resultaat_vorm uit ai_taken_open). Bij een inbox-taak verschijnt het antwoord meteen als voorstel in de inbox; Casper verstuurt zelf.',
    { job_id: z.string(), resultaat: z.record(z.string(), z.unknown()) },
    false,
    async ({ job_id, resultaat }) => {
      await teamJob(job_id)
      // Al afgehandeld (bv. door een parallelle run): geen fout, zodat Grok niet blijft proberen.
      const current = await getJob(job_id)
      if (current && (current.status === 'done' || current.status === 'dismissed'))
        return `Deze taak was al ${current.status === 'done' ? 'klaargezet' : 'weggeklikt'}; er is niets meer te doen.`
      try {
        await completeJob(job_id, resultaat, BY)
      } catch (e) {
        // Net tegelijk door een andere run afgerond: ook geen fout.
        if (e instanceof Error && e.message === JOB_ALREADY_HANDLED) return 'Deze taak was net al klaargezet; er is niets meer te doen.'
        throw e
      }
      return 'Klaargezet in het dashboard.'
    },
  )
}

import 'server-only'
import { createServiceSupabase } from '../../supabase/server'
import { styleKeyFor } from '../style-profile'
import { MAIL_REWRITE, type Handler } from './schemas'

export const mail_rewriteTask = {
  instructions: `Taak: herschrijf een mail van Casper volgens zijn uitleg.
- Casper legt kort uit wat er anders moet. Interpreteer dat zoals hij het bedoelt: jij kent de lead, IKR en de schrijfstijl; vul aan wat hij impliciet bedoelt.
- Behoud de feiten, afspraken en namen uit de oorspronkelijke mail, tenzij Casper vraagt om ze te veranderen. Verzin niets nieuws.
- Was de mail HTML, geef dan ook HTML terug; anders gewone tekst.
- Pas het onderwerp enkel aan als Casper daarom vraagt of als het niet meer klopt (anders subject = null).`,
  prompt: (input) => {
    const lead = input.lead as { name?: string; company?: string | null; notes?: string | null } | undefined
    return [
      lead?.name ? `Lead: ${lead.name}${lead.company ? ` (${lead.company})` : ''}` : '',
      lead?.notes ? `Notities van Casper over deze lead:\n${lead.notes}` : '',
      input.context ? `Context bij deze mail:\n${String(input.context)}` : '',
      `Uitleg van Casper (wat er anders moet):\n${String(input.instruction)}`,
      `Onderwerp: ${String(input.subject ?? '')}`,
      `<mail>\n${String(input.body)}\n</mail>`,
    ]
      .filter(Boolean)
      .join('\n\n')
  },
  schema: MAIL_REWRITE,
  style: () => styleKeyFor(),
  // Het resultaat meteen op de juiste plek zetten (concept of voorstel in de inbox).
  afterDone: async (input, output) => {
    const body = typeof output.body === 'string' ? output.body : null
    if (!body) return
    const db = createServiceSupabase()
    const subject = typeof output.subject === 'string' && output.subject.trim() ? output.subject.trim() : null
    if (input.target === 'draft') {
      // Enkel als het concept nog de tekst heeft die herschreven werd: wat Casper intussen bewaarde, blijft staan.
      await db
        .from('mail_drafts')
        .update({ body, ...(subject ? { subject } : {}), updated_at: new Date().toISOString() })
        .eq('id', String(input.targetId))
        .eq('status', 'concept')
        .is('sent_at', null)
        .eq('body', String(input.body))
    } else if (input.target === 'inbox') {
      const { data } = await db.from('ai_jobs').select('output').eq('id', String(input.targetId)).maybeSingle()
      if (data) await db.from('ai_jobs').update({ output: { ...(data.output ?? {}), draft: body } }).eq('id', String(input.targetId))
    }
  },
} satisfies Handler

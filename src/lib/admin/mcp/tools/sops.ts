import 'server-only'
import { z } from 'zod'
import { CATEGORY_KEYS, cleanSopInput, SOP_CATEGORIES, searchSops, type Sop } from '../../sops/types'

import { BY, type ToolCtx } from '../tool'

/** SOP's: afspraken en best practices (hele team). */
export function registerSopTools(ctx: ToolCtx) {
  const { tool, session } = ctx
  const { sops } = session
  // ─── SOP's ──────────────────────────────────────────────
  const sopView = (x: Sop) => ({ sop_id: x.id, titel: x.title, tekst: x.body, categorie: x.category, categorie_label: SOP_CATEGORIES[x.category], status: x.status, bron: x.source, bron_link: x.source_url, citaat: x.quote, sinds: x.created_at.slice(0, 10) })
  const categorie = z.enum(CATEGORY_KEYS as [string, ...string[]])
  const findSop = async (id: string) => {
    const x = (await sops.list()).find((y) => y.id === id.trim())
    if (!x) throw new Error('SOP niet gevonden.')
    return x
  }
  tool(
    'sops_zoeken',
    `SOP's van IKR (afspraken en best practices) doorzoeken. Zonder zoekwoorden: alle SOP's van die categorie/status. Standaard enkel geldende (afgesproken). Categorieën: ${CATEGORY_KEYS.map((k) => `${k} (${SOP_CATEGORIES[k as keyof typeof SOP_CATEGORIES]})`).join(', ')}.`,
    { zoek: z.string().optional().describe('woorden, bv. "revisie feedback"'), categorie: categorie.optional(), status: z.enum(['afgesproken', 'voorstel', 'verouderd', 'alle']).optional() },
    true,
    async ({ zoek, categorie: cat, status }) => searchSops(await sops.list(), zoek ?? '', { category: cat, status: (status as never) ?? 'afgesproken' }).map(sopView),
  )
  tool(
    'sop_aanmaken',
    'Nieuwe SOP. Standaard als voorstel (het team keurt goed met een vinkje of wijst af met een kruisje). Zegt iemand letterlijk dat het al afgesproken is, mag status "afgesproken".',
    { titel: z.string(), tekst: z.string().describe('De afspraak zelf, kort en concreet'), categorie, status: z.enum(['voorstel', 'afgesproken']).optional(), bron: z.string().optional().describe('bv. "Weekly 19/11" of "chat met Casper"'), citaat: z.string().optional() },
    false,
    async ({ titel, tekst, categorie: cat, status = 'voorstel', bron, citaat }) =>
      sopView(await sops.create(cleanSopInput({ title: titel, body: tekst, category: cat, status, source: bron ?? null, quote: citaat ?? null }), BY, 'grokbot')),
  )
  tool(
    'sop_bijwerken',
    'Titel, tekst, categorie of status (afgesproken / voorstel / verouderd) van een SOP aanpassen. Niet meegegeven velden blijven.',
    { sop_id: z.string(), titel: z.string().optional(), tekst: z.string().optional(), categorie: categorie.optional(), status: z.enum(['afgesproken', 'voorstel', 'verouderd']).optional() },
    false,
    async ({ sop_id, titel, tekst, categorie: cat, status }) => {
      const x = await findSop(sop_id)
      const next = cleanSopInput({ title: titel ?? x.title, body: tekst ?? x.body, category: cat ?? x.category, status: status ?? x.status })
      await sops.update(x.id, next)
      return `"${next.title}" bijgewerkt.`
    },
  )
  tool('sop_voorstel_beslissen', 'Een SOP-voorstel goedkeuren (wordt afgesproken) of afwijzen (wordt verwijderd). Enkel als iemand van het team dat vraagt.', { sop_id: z.string(), goedkeuren: z.boolean() }, false, async ({ sop_id, goedkeuren }) => {
    const x = await findSop(sop_id)
    if (x.status !== 'voorstel') throw new Error('Dit is geen voorstel.')
    if (goedkeuren) await sops.update(x.id, { status: 'afgesproken' })
    else await sops.remove(x.id)
    return goedkeuren ? `"${x.title}" is nu afgesproken.` : `Voorstel "${x.title}" verwijderd.`
  })
  tool('sop_verwijderen', 'SOP verwijderen. Liever op "verouderd" zetten als het een oude afspraak is.', { sop_id: z.string() }, false, async ({ sop_id }) => {
    const x = await findSop(sop_id)
    await sops.remove(x.id)
    return `"${x.title}" verwijderd.`
  })
}

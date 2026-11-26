import 'server-only'
import { z } from 'zod'
import type { Client } from '../../clients/types'
import { cleanFreelancerInput, cleanFreelancerPatch, filterFreelancers, SCORE_LABELS, SCORE_MEANING, SCORES, type Freelancer } from '../../freelancers/types'
import { sameText, textMatches } from '../../search'

import { BY, type ToolCtx } from '../tool'

const SCORE_TEXT = SCORES.map((s) => `${s} (${SCORE_MEANING[s]})`).join('; ')

/** Freelancers: wie bij welke klant zit en wie het al bewezen heeft (hele team). */
export function registerFreelancerTools(ctx: ToolCtx) {
  const { tool, session, resolveClient } = ctx
  const { freelancers, clients } = session

  const view = (f: Freelancer, byId: Map<string, Client>) => ({
    freelancer_id: f.id,
    naam: f.name,
    email: f.email,
    telefoon: f.phone,
    score: f.score,
    score_betekenis: f.score ? SCORE_MEANING[f.score] : null,
    klanten_opdrachten: f.assignments,
    gekoppelde_klanten: f.client_ids.flatMap((id) => {
      const c = byId.get(id)
      return c ? [{ klant_id: c.id, naam: c.name }] : []
    }),
    link: f.portfolio_url,
    bron_opmerking: f.notes,
    bijgewerkt: f.updated_at,
  })
  const clientMap = async () => new Map((await clients.list()).map((c) => [c.id, c]))

  async function resolveFreelancer(ref: string) {
    const all = await freelancers.list()
    const q = ref.trim()
    const hit = all.find((f) => f.id === q) ?? all.find((f) => f.email && f.email === q.toLowerCase())
    if (hit) return hit
    const exact = all.filter((f) => sameText(f.name, q))
    const partial = exact.length ? exact : all.filter((f) => textMatches(f.name, q))
    if (partial.length === 1) return partial[0]
    if (!partial.length) throw new Error(`Geen freelancer gevonden voor "${ref}".`)
    throw new Error(`Meerdere freelancers passen bij "${ref}": ${partial.map((f) => `${f.name} (${f.email ?? f.id})`).join(', ')}. Gebruik het id of e-mailadres.`)
  }
  const clientIds = async (refs: string[] | undefined) => (refs === undefined ? undefined : Promise.all(refs.map(async (r) => (await resolveClient(r)).id)))

  const score = z
    .union([z.enum(SCORES), z.literal('')])
    .nullable()
    .optional()
    .describe(`Fase uit Milans kleurensysteem (de score ís de fase): ${SCORE_TEXT}. Leeg of null = nog geen score.`)
  const fields = {
    email: z.string().optional().describe('E-mailadres (leeg = leegmaken)'),
    telefoon: z.string().optional(),
    score,
    klanten_opdrachten: z.string().optional().describe('Vrije tekst: bij welke klanten of opdrachten ze werkten/werken'),
    klanten: z.array(z.string()).optional().describe('Koppelen aan klanten in het dashboard (naam of klant_id). Vervangt de huidige koppelingen; [] = alles loskoppelen.'),
    link: z.string().optional().describe('URL naar het portfolio (http/https)'),
    bron_opmerking: z.string().optional().describe('Bron (hoe we ze kennen) en opmerking'),
  }

  tool(
    'freelancers_lijst',
    `Alle freelancers van IKR (filmen, monteren, contentplanning, schermgezichten) met contact, score, klanten/opdrachten, portfolio-link en bron/opmerking. Alfabetisch. Filter op naam (zoek), score (${SCORES.join(', ')} of "geen") of gekoppelde klant. Handig bij een afzegging: zoek groen/zekerheid.`,
    {
      zoek: z.string().optional().describe('deel van de naam'),
      score: z.enum([...SCORES, 'geen']).optional(),
      klant: z.string().optional().describe('enkel freelancers gekoppeld aan deze klant (naam of id)'),
    },
    true,
    async ({ zoek, score: s, klant }) => {
      const byId = await clientMap()
      const c = klant ? await resolveClient(klant) : null
      const list = filterFreelancers(await freelancers.list(), zoek ?? '', s ?? '').filter((f) => !c || f.client_ids.includes(c.id))
      return list.map((f) => view(f, byId))
    },
  )

  tool(
    'freelancer_aanmaken',
    'Nieuwe freelancer toevoegen. Enkel de naam is verplicht; vul enkel in wat je zeker weet (verzin geen score of contactgegevens).',
    { naam: z.string().describe('Voor- en achternaam, eventueel handelsnaam'), ...fields },
    false,
    async ({ naam, email, telefoon, score: s, klanten_opdrachten, klanten, link, bron_opmerking }) => {
      const input = cleanFreelancerInput({ name: naam, email, phone: telefoon, score: s, assignments: klanten_opdrachten, client_ids: await clientIds(klanten), portfolio_url: link, notes: bron_opmerking })
      return view(await freelancers.create(input, BY), await clientMap())
    },
  )

  tool(
    'freelancer_bijwerken',
    'Velden van een freelancer aanpassen. Alle velden optioneel: niet meegegeven blijft, een lege tekst maakt het veld leeg. klanten vervangt de koppelingen.',
    { freelancer: z.string().describe('naam, e-mail of freelancer_id'), naam: z.string().optional(), ...fields },
    false,
    async ({ freelancer, naam, email, telefoon, score: s, klanten_opdrachten, klanten, link, bron_opmerking }) => {
      const f = await resolveFreelancer(freelancer)
      const patch = cleanFreelancerPatch({ name: naam, email, phone: telefoon, score: s, assignments: klanten_opdrachten, client_ids: await clientIds(klanten), portfolio_url: link, notes: bron_opmerking })
      if (!Object.keys(patch).length) throw new Error('Niets om aan te passen.')
      await freelancers.update(f.id, patch)
      const changed = Object.keys(patch).length
      return `${patch.name ?? f.name} bijgewerkt (${changed} ${changed === 1 ? 'veld' : 'velden'}${patch.score !== undefined ? `, score: ${patch.score ? SCORE_LABELS[patch.score] : 'leeg'}` : ''}).`
    },
  )

  tool('freelancer_verwijderen', 'Freelancer uit de lijst halen. Enkel als iemand van het team daarom vraagt.', { freelancer: z.string().describe('naam, e-mail of freelancer_id') }, false, async ({ freelancer }) => {
    const f = await resolveFreelancer(freelancer)
    await freelancers.remove(f.id)
    return `${f.name} verwijderd.`
  })
}

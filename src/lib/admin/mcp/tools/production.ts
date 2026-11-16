import 'server-only'
import { z } from 'zod'
import { ANCHOR_LABEL, WHO_LABEL, byPosition, myInternalItems, myNextSteps, upcoming, type ClientProduction, type InternalItem, type Step, type StepDef, type TeamMember } from '../../production/core'
import { rhythmLabel, ruleLabel, ruleText, scheduleLabel } from '../../production/rules'
import {
  addInternalTask,
  addShootDay,
  addStepDef,
  getClientProduction,
  listChanges,
  loadProduction,
  moveStepDef,
  removeInternalTask,
  removeShootDay,
  removeStepDef,
  revert,
  setActive,
  setAnchor,
  setInternalDone,
  setRhythm,
  setStartPoint,
  startProduction,
  updateInternalTask,
  updateStep,
  updateStepDef,
} from '../../production/service'

import { BY, owner, uuid, type ToolCtx } from '../tool'

/** Productie: workflow per klant, sjabloon, interne taken en wijzigingslog (hele team). */
export function registerProductionTools(ctx: ToolCtx) {
  const { tool, resolveClient, session } = ctx
  const { clients, production } = session
  // ─── Productie ──────────────────────────────────────────
  const stepView = (x: Step) => ({ stap: x.key, titel: x.title, wie: WHO_LABEL[x.owner], draaidag: x.cycle?.no ?? null, deadline: x.due_on, regel: ruleLabel(x.rule), af: x.done, te_laat: x.overdue, link: x.link, notitie: x.note })
  const defView = (d: StepDef, i: number) => ({ plaats: i + 1, stap: d.key, titel: d.title, eigenaar: WHO_LABEL[d.owner], deadlineregel: ruleLabel(d.rule), regel_tekst: ruleText(d.rule), ...(d.done_when ? { vanzelf_af_als: `${ANCHOR_LABEL[d.done_when]} ingevuld` } : {}), ...(d.is_shoot ? { is_de_draaidag: true } : {}), link: d.link, notitie: d.note })
  const defsView = (defs: StepDef[]) => ({
    opstart: defs.filter((d) => d.phase === 'opstart').sort(byPosition).map(defView),
    per_draaidag: defs.filter((d) => d.phase === 'draaidag').sort(byPosition).map(defView),
  })
  const internalView = (i: InternalItem) => ({ taak_id: i.task.id, taak: i.task.title, wie: WHO_LABEL[i.task.owner], planning: scheduleLabel(i.task.schedule), deadline: i.due_on, te_laat: i.overdue, laatst_af: i.last_done?.occurrence ?? null, link: i.task.link, notitie: i.task.note })
  const prodView = (cp: ClientProduction) => ({
    klant: cp.name,
    fase: cp.phase,
    actief: cp.production.active,
    ritme: rhythmLabel(cp.production.rhythm),
    data: { getekend: cp.production.signed_on, kickoff: cp.production.kickoff_on, strategiemeeting: cp.production.strategy_on },
    draaidagen: cp.cycles.map((c) => ({ nr: c.no, datum: c.shoot_on, uur: c.shoot_time })),
    nu_aan_de_beurt: upcoming(cp).map(stepView),
  })
  const clientRef = async (klant: string) => {
    const c = await resolveClient(klant)
    return { id: c.id, name: c.name }
  }
  const allClients = async () => (await clients.list()).map((c) => ({ id: c.id, name: c.name }))
  const allProduction = async () => loadProduction(production, await allClients())
  const RULE_HELP =
    'Deadlineregel als tekst: "7 dagen voor draaidag", "2 weken na kick-off", "op draaidag", "21 dagen na vorige draaidag, anders 7 dagen na strategiemeeting", "eerste woensdag" (eerste woensdag op of na de draaidag; bij de opstart na het contract), "laatste vrijdag vanaf kick-off", een vaste datum "2026-12-24" of "geen". Ankers: contract, kick-off, strategiemeeting, draaidag, vorige draaidag.'
  const stepOwner = z.string().describe('Casper, Cédric, Milan, freelancer of klant (de klant volgt Cédric op, de freelancer Milan)')
  const fase = z.enum(['opstart', 'draaidag']).describe('opstart (eenmalig) of draaidag (elke draaidag opnieuw)')
  const target = async (klant?: string) => (klant ? { kind: 'client' as const, client: await clientRef(klant) } : { kind: 'template' as const })
  const afterChange = async (klant?: string) => (klant ? defsView((await getClientProduction(production, await clientRef(klant))).defs) : defsView((await allProduction()).template?.steps ?? []))

  tool('productie_overzicht', 'Productie van alle klanten (fase, ritme, data, draaidagen, wat nu aan de beurt is met wie en deadline), klanten die nog niet gestart zijn, en de interne terugkerende taken.', {}, true, async () => {
    const { list, notStarted, internal } = await allProduction()
    return { klanten: list.map(prodView), nog_niet_gestart: notStarted.map((c) => c.name), intern: internal.map(internalView) }
  })
  tool('productie_klant', 'Alle stappen van één klant (opstart en elke draaidag) met eigenaar, deadline(regel), af, link en notitie, plus het ritme en de eigen stappenlijst van de klant.', { klant: z.string() }, true, async ({ klant }) => {
    const cp = await getClientProduction(production, await clientRef(klant))
    return { ...prodView(cp), stappen_van_deze_klant: defsView(cp.defs), opstart: cp.onboarding.map(stepView), per_draaidag: cp.cycleSteps.map((x) => ({ draaidag: x.cycle.no, datum: x.cycle.shoot_on, stappen: x.steps.map(stepView) })) }
  })
  tool('productie_volgende_stappen', 'Wat een teamlid nu moet doen over alle klanten (eigen stappen; Milan volgt de freelancer op, Cédric de klant) en zijn interne taken, op deadline.', { teamlid: owner }, true, async ({ teamlid }) => {
    const { list, internal } = await allProduction()
    return {
      klanten: myNextSteps(list, teamlid as TeamMember).map(({ client, step }) => ({ klant: client.name, ...stepView(step) })),
      intern: myInternalItems(internal, teamlid as TeamMember).map(internalView),
    }
  })
  tool('productie_starten', 'Productie starten voor een klant (na het getekende contract): de klant krijgt een eigen kopie van het workflow-sjabloon. Optioneel de datum van ondertekening.', { klant: z.string(), getekend: z.string().optional().describe('YYYY-MM-DD') }, false, async ({ klant, getekend }) => {
    const c = await clientRef(klant)
    await startProduction(production, c, getekend, BY)
    return `Productie gestart voor ${c.name}.`
  })
  tool(
    'productie_startpunt',
    '"We zitten nu hier": voor klanten die niet van nul beginnen. Alles vóór deze stap wordt afgevinkt, deze stap en wat erna komt staat open. Bij een draaidagstap: welke draaidag (nr, standaard 1). De stapsleutels staan in productie_klant.',
    { klant: z.string(), stap: z.string(), draaidag: z.number().int().min(1).optional() },
    false,
    async ({ klant, stap, draaidag }) => {
      const c = await clientRef(klant)
      await setStartPoint(production, c, stap, draaidag ?? null, BY)
      return prodView(await getClientProduction(production, c))
    },
  )
  tool(
    'productie_datum',
    `Een datum zetten (leeg = wissen): getekend (${ANCHOR_LABEL.getekend}), kickoff, strategie (${ANCHOR_LABEL.strategie}) of draaidag (met nr en optioneel uur). Deadlines worden daaruit berekend. Een draaidag komt ook in de contact-agenda.`,
    { klant: z.string(), soort: z.enum(['getekend', 'kickoff', 'strategie', 'draaidag']), datum: z.string().describe('YYYY-MM-DD of leeg'), draaidag: z.number().int().min(1).optional().describe('nr van de draaidag; leeg = de eerstvolgende zonder datum'), uur: z.string().optional().describe('UU:MM') },
    false,
    async ({ klant, soort, datum, draaidag, uur }) => {
      const c = await clientRef(klant)
      await setAnchor(production, c, soort as 'getekend', datum || null, { cycleNo: draaidag ?? null, time: uur ?? null, by: BY })
      return prodView(await getClientProduction(production, c))
    },
  )
  tool('productie_draaidag_toevoegen', 'Nieuwe draaidag (volgende cyclus) voor een klant, optioneel met datum en uur.', { klant: z.string(), datum: z.string().optional(), uur: z.string().optional() }, false, async ({ klant, datum, uur }) => {
    const c = await clientRef(klant)
    const cy = await addShootDay(production, c, datum ?? null, uur ?? null, BY)
    return `Draaidag ${cy.no} toegevoegd voor ${c.name}${datum ? ` op ${datum}` : ''}.`
  })
  tool('productie_draaidag_verwijderen', 'Een draaidag (en zijn afgevinkte stappen) verwijderen. Terug te draaien via productie_terugdraaien.', { klant: z.string(), draaidag: z.number().int().min(1) }, false, async ({ klant, draaidag }) => {
    const c = await clientRef(klant)
    await removeShootDay(production, c, draaidag, BY)
    return `Draaidag ${draaidag} van ${c.name} verwijderd.`
  })
  tool(
    'productie_stap',
    'Eén stap van één keer aanpassen: af (true/false), eigen deadline (YYYY-MM-DD, leeg = berekend), link (https) of notitie. Bij een draaidagstap: welke draaidag (standaard de huidige). Is het de draaidag zelf en heeft de klant een ritme, dan wordt de volgende draaidag automatisch gepland.',
    { klant: z.string(), stap: z.string(), draaidag: z.number().int().min(1).optional(), af: z.boolean().optional(), deadline: z.string().optional(), link: z.string().optional(), notitie: z.string().optional() },
    false,
    async ({ klant, stap, draaidag, af, deadline, link, notitie }) => {
      const c = await clientRef(klant)
      const created = await updateStep(production, c, stap, { done: af, due_on: deadline === undefined ? undefined : deadline || null, link, note: notitie }, { cycleNo: draaidag ?? null, by: BY })
      return { ...prodView(await getClientProduction(production, c)), ...(created ? { automatisch_gepland: `draaidag ${created.no} op ${created.shoot_on}` } : {}) }
    },
  )
  tool('productie_pauzeren', 'Productie van een klant (de)activeren, bv. als de klant stopt. Inactief = niet meer bij de volgende stappen.', { klant: z.string(), actief: z.boolean() }, false, async ({ klant, actief }) => {
    const c = await clientRef(klant)
    await setActive(production, c, actief, BY)
    return `${c.name}: productie ${actief ? 'actief' : 'gepauzeerd'}.`
  })

  // Workflow: sjabloon (voor nieuwe klanten) en de eigen kopie per klant.
  tool('workflow_sjabloon_lezen', 'Het workflow-sjabloon: de standaardstappen (opstart en per draaidag) met eigenaar, volgorde en deadlineregel. Nieuwe klanten krijgen hier een kopie van; bestaande klanten hebben hun eigen kopie (zie productie_klant).', {}, true, async () => {
    const t = (await allProduction()).template
    if (!t) return 'Er is nog geen sjabloon.'
    return { sjabloon: t.template.name, ...defsView(t.steps) }
  })
  tool(
    'workflow_sjabloon_bijwerken',
    `Het workflow-sjabloon aanpassen (geldt voor klanten die vanaf nu starten; bestaande klanten niet). actie: toevoegen (fase, titel, eigenaar, regel, optioneel na_stap of plaats), wijzigen (stap + wat verandert), verplaatsen (stap + plaats of na_stap), verwijderen (stap). ${RULE_HELP}`,
    {
      actie: z.enum(['toevoegen', 'wijzigen', 'verplaatsen', 'verwijderen']),
      stap: z.string().optional().describe('sleutel van een bestaande stap (zie workflow_sjabloon_lezen)'),
      fase: fase.optional(),
      titel: z.string().optional(),
      eigenaar: stepOwner.optional(),
      regel: z.string().optional(),
      link: z.string().optional(),
      notitie: z.string().optional(),
      plaats: z.number().int().min(1).optional().describe('1 = eerst in de fase'),
      na_stap: z.string().optional(),
    },
    false,
    async (a) => {
      const t = { kind: 'template' as const }
      if (a.actie === 'toevoegen') {
        if (!a.fase || !a.titel || !a.eigenaar) throw new Error('Toevoegen vraagt fase, titel en eigenaar.')
        await addStepDef(production, t, { phase: a.fase, title: a.titel, owner: a.eigenaar, rule: a.regel, link: a.link, note: a.notitie, after: a.na_stap, position: a.plaats }, BY)
      } else {
        if (!a.stap) throw new Error('Welke stap? Geef de sleutel (zie workflow_sjabloon_lezen).')
        if (a.actie === 'wijzigen') await updateStepDef(production, t, a.stap, { title: a.titel, owner: a.eigenaar, rule: a.regel, link: a.link, note: a.notitie }, BY)
        else if (a.actie === 'verplaatsen') await moveStepDef(production, t, a.stap, { position: a.plaats, after: a.na_stap }, BY)
        else await removeStepDef(production, t, a.stap, BY)
      }
      return afterChange()
    },
  )
  tool(
    'productie_stap_toevoegen',
    `Nieuwe stap voor één klant (in zijn eigen kopie van de workflow). ${RULE_HELP}`,
    { klant: z.string(), fase, titel: z.string(), eigenaar: stepOwner, regel: z.string().optional().describe('deadlineregel; leeg = geen deadline'), na_stap: z.string().optional().describe('sleutel van de stap waarna hij komt'), plaats: z.number().int().min(1).optional().describe('1 = eerst in de fase; leeg = achteraan'), link: z.string().optional(), notitie: z.string().optional() },
    false,
    async ({ klant, fase: ph, titel, eigenaar, regel, na_stap, plaats, link, notitie }) => {
      await addStepDef(production, await target(klant), { phase: ph, title: titel, owner: eigenaar, rule: regel, after: na_stap, position: plaats, link, note: notitie }, BY)
      return afterChange(klant)
    },
  )
  tool('productie_stap_verwijderen', 'Een stap uit de workflow van één klant halen (afvinkingen blijven bewaard; terug te draaien).', { klant: z.string(), stap: z.string() }, false, async ({ klant, stap }) => {
    await removeStepDef(production, await target(klant), stap, BY)
    return afterChange(klant)
  })
  tool('productie_stap_verplaatsen', 'Een stap van één klant verplaatsen binnen zijn fase: naar een plaats (1 = eerst) of na een andere stap.', { klant: z.string(), stap: z.string(), plaats: z.number().int().min(1).optional(), na_stap: z.string().optional() }, false, async ({ klant, stap, plaats, na_stap }) => {
    await moveStepDef(production, await target(klant), stap, { position: plaats, after: na_stap }, BY)
    return afterChange(klant)
  })
  tool('productie_eigenaar', 'Eigenaar van een stap van één klant wijzigen (Casper, Cédric, Milan, freelancer of klant).', { klant: z.string(), stap: z.string(), eigenaar: stepOwner }, false, async ({ klant, stap, eigenaar }) => {
    await updateStepDef(production, await target(klant), stap, { owner: eigenaar }, BY)
    return afterChange(klant)
  })
  tool('productie_deadlineregel', `Deadlineregel van een stap van één klant wijzigen (geldt voor elke keer; een eigen deadline voor één keer zet je met productie_stap). ${RULE_HELP}`, { klant: z.string(), stap: z.string(), regel: z.string() }, false, async ({ klant, stap, regel }) => {
    await updateStepDef(production, await target(klant), stap, { rule: regel }, BY)
    return afterChange(klant)
  })
  tool(
    'productie_ritme',
    'Draaidag-ritme van een klant: "elke 2e zondag" (2e zondag van de maand), "elke laatste vrijdag", "elke 3 weken", "elke week" of "geen". Is een draaidag af (de stap van de draaidag zelf), dan wordt de volgende automatisch aangemaakt met berekende datum en deadlines.',
    { klant: z.string(), ritme: z.string() },
    false,
    async ({ klant, ritme }) => {
      const c = await clientRef(klant)
      const r = await setRhythm(production, c, ritme, BY)
      return `${c.name}: ${rhythmLabel(r.rhythm)}.${r.created ? ` Draaidag ${r.created.no} meteen gepland op ${r.created.shoot_on}.` : ''}`
    },
  )

  // Intern: terugkerende taken zonder klant.
  const SCHEDULE_HELP = 'Planning als tekst: "elke maandag" (wekelijks), "laatste maandag" of "eerste woensdag" (maandelijks).'
  tool('intern_taak_toevoegen', `Terugkerende interne taak zonder klant (blok "Intern" op Productie), met eigenaar; de deadline volgt uit de planning. ${SCHEDULE_HELP}`, { titel: z.string(), eigenaar: owner, planning: z.string(), link: z.string().optional(), notitie: z.string().optional() }, false, async ({ titel, eigenaar, planning, link, notitie }) => {
    const t = await addInternalTask(production, { title: titel, owner: eigenaar, schedule: planning, link, note: notitie }, BY)
    return `"${t.title}" toegevoegd (${scheduleLabel(t.schedule)}, ${WHO_LABEL[t.owner]}).`
  })
  tool(
    'intern_taak_bijwerken',
    `Interne taak aanpassen (titel, eigenaar, planning, link, notitie, actief) of de huidige keer afvinken (af: true) / de laatst afgevinkte terug open zetten (af: false). ${SCHEDULE_HELP}`,
    { taak: z.string().describe('id of (deel van) de titel'), titel: z.string().optional(), eigenaar: owner.optional(), planning: z.string().optional(), link: z.string().optional(), notitie: z.string().optional(), actief: z.boolean().optional(), af: z.boolean().optional() },
    false,
    async ({ taak, titel, eigenaar, planning, link, notitie, actief, af }) => {
      const patch = { title: titel, owner: eigenaar, schedule: planning, link, note: notitie, active: actief }
      if (Object.values(patch).some((v) => v !== undefined)) await updateInternalTask(production, taak, patch, BY)
      if (af !== undefined) await setInternalDone(production, taak, af, BY)
      return (await allProduction()).internal.map(internalView)
    },
  )
  tool('intern_taak_verwijderen', 'Een interne taak verwijderen (terug te draaien via productie_terugdraaien).', { taak: z.string() }, false, async ({ taak }) => {
    await removeInternalTask(production, taak, BY)
    return 'Verwijderd.'
  })

  // Wijzigingslog.
  tool('productie_wijzigingen', 'Wijzigingslog van Productie (wie, wat, wanneer), nieuwste eerst. Optioneel enkel voor één klant.', { klant: z.string().optional(), aantal: z.number().int().min(1).max(100).optional() }, true, async ({ klant, aantal }) => {
    const c = klant ? await clientRef(klant) : null
    return (await listChanges(production, { clientId: c?.id, limit: aantal ?? 20 })).map((e) => ({ wijziging_id: e.id, wanneer: e.created_at, wie: e.by, wat: e.summary, rijen: e.changes.length, teruggedraaid: e.reverted_at ? `${e.reverted_at} door ${e.reverted_by}` : null, draait_terug: e.revert_of }))
  })
  tool('productie_terugdraaien', 'Een wijziging uit het log terugdraaien (alles terug zoals ervoor). Lukt niet als er sindsdien nog iets aan veranderde: draai dan eerst de latere wijziging terug. Het terugdraaien komt zelf ook in het log.', { wijziging_id: z.string() }, false, async ({ wijziging_id }) => {
    const r = await revert(production, uuid(wijziging_id, 'wijziging_id'), BY, await allClients())
    return `Teruggedraaid: ${r.entry.summary}`
  })
}

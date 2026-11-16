import 'server-only'
import { z } from 'zod'
import { inferKind, PIN_KINDS, safeUrl, sortPins, type Pin } from '../../weekly/pins'
import { fmtDate, isoDay } from '../../format'
import { boardTodos, currentWeekly, weeklyTimeRange } from '../../weekly/board'
import { scheduleWeekly } from '../../weekly/schedule'
import { TEAM } from '../../weekly/types'

import { BY, dateStr, owner, type ToolCtx } from '../tool'

/** Weekly, to-do's en prikbord (hele team). */
export function registerWeeklyTools(ctx: ToolCtx) {
  const { tool, session } = ctx
  const { weekly } = session
  // ─── Weekly ───────────────────────────────────────────────
  const todoView = (t: Awaited<ReturnType<typeof weekly.listTodos>>[number]) => ({
    id: t.id,
    voor: TEAM.find((x) => x.key === t.owner)?.name,
    titel: t.title,
    soort: t.kind === 'long' ? 'lang' : 'tegen de volgende weekly',
    af: Boolean(t.done_at),
    afgewerkt_voor_weekly: Boolean(t.checked_at),
    doorgeschoven: t.pushed_count,
    notities: t.notes.map((n) => n.body),
  })
  tool('weekly_overzicht', 'Volgende weekly en alle to-do’s (open + sinds de vorige weekly afgevinkt), per persoon en lange to-do’s.', {}, true, async () => {
    const [ws, todos] = await Promise.all([weekly.listWeeklies(), weekly.listTodos()])
    const next = currentWeekly(ws)
    const { byOwner, long } = boardTodos(todos, ws)
    return {
      volgende_weekly: next
        ? { id: next.id, wanneer: `${fmtDate(next.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} ${weeklyTimeRange(next)}`, modus: next.mode, status: next.status, meet: next.meet_url }
        : null,
      todos: Object.fromEntries(TEAM.map((p) => [p.name, byOwner('weekly', p.key).map(todoView)])),
      lange_todos: long.map(todoView),
    }
  })
  tool('vorige_weeklies', 'Afgesloten weeklies met hun to-do’s en de link naar opname of transcript.', { aantal: z.number().int().min(1).max(20).optional() }, true, async ({ aantal = 5 }) => {
    const [ws, todos] = await Promise.all([weekly.listWeeklies(), weekly.listTodos()])
    return ws
      .filter((w) => w.status === 'concluded')
      .slice(0, aantal)
      .map((w) => ({ datum: isoDay(new Date(w.starts_at)), modus: w.mode, opname: w.recording_url, todos: todos.filter((t) => t.weekly_id === w.id).map(todoView) }))
  })
  tool('todo_aanmaken', 'Nieuwe to-do. Soort "weekly" = tegen de volgende weekly, "long" = lange to-do.', { voor: owner, titel: z.string(), soort: z.enum(['weekly', 'long']).optional(), notitie: z.string().optional() }, false, async ({ voor, titel, soort = 'weekly', notitie }) => {
    const next = currentWeekly(await weekly.listWeeklies())
    await weekly.createTodo(
      { owner: voor as never, title: titel, kind: soort, weekly_id: soort === 'weekly' && next?.status === 'planned' ? next.id : null, created_by: BY },
      notitie ?? null,
    )
    return 'To-do aangemaakt.'
  })
  tool('todo_bijwerken', 'Titel, persoon of soort van een to-do aanpassen.', { todo_id: z.string(), titel: z.string().optional(), voor: owner.optional(), soort: z.enum(['weekly', 'long']).optional() }, false, async ({ todo_id, titel, voor, soort }) => {
    await weekly.updateTodo(todo_id, Object.fromEntries(Object.entries({ title: titel, owner: voor, kind: soort }).filter(([, v]) => v !== undefined)))
    return 'Bijgewerkt.'
  })
  tool('todo_af', 'To-do afvinken (af = true) of terug openzetten (af = false).', { todo_id: z.string(), af: z.boolean() }, false, async ({ todo_id, af }) => {
    await weekly.setDone(todo_id, af ? BY : null)
    return af ? 'Afgevinkt.' : 'Terug open.'
  })
  tool(
    'todo_afgewerkt',
    'Vóór de weekly: een to-do als afgewerkt aanvinken (grijs, niet doorstreept) of weer uitzetten. Anders dan todo_af ("done" = tijdens de weekly). De vinkjes verdwijnen als de weekly start.',
    { todo_id: z.string(), afgewerkt: z.boolean() },
    false,
    async ({ todo_id, afgewerkt }) => {
      await weekly.setChecked(todo_id, afgewerkt)
      return afgewerkt ? 'Aangevinkt als afgewerkt.' : 'Vinkje weg.'
    },
  )
  tool('todo_notitie', 'Notitie bij een to-do toevoegen.', { todo_id: z.string(), notitie: z.string() }, false, async ({ todo_id, notitie }) => {
    await weekly.addNote(todo_id, notitie, BY)
    return 'Notitie toegevoegd.'
  })
  tool('todo_doorschuiven', 'To-do doorschuiven naar de volgende weekly.', { todo_id: z.string() }, false, async ({ todo_id }) => {
    await weekly.push(todo_id)
    return 'Doorgeschoven.'
  })
  // ─── Prikbord ───────────────────────────────────────────
  const pinView = (p: Pin) => ({ pin_id: p.id, soort: p.kind, titel: p.title, tekst: p.body, link: p.url, voor: p.for_owner, vastgepind: p.pinned, door: p.created_via === 'grokbot' ? 'Grok Bot' : p.created_by, op: p.created_at })
  tool('prikbord_lijst', 'Alle kaartjes op het prikbord van de weekly (vastgepind eerst).', {}, true, async () => sortPins(await weekly.listPins()).map(pinView))
  tool(
    'prikbord_toevoegen',
    'Kaartje op het prikbord van de weekly zetten (zichtbaar voor het hele team). Voor een link of document: geef de link mee. Geen sales-gegevens tenzij Casper daarom vraagt.',
    {
      titel: z.string().describe('Korte titel, bv. "Contract Studio Claes"'),
      tekst: z.string().optional().describe('Optionele uitleg'),
      link: z.string().optional().describe('https-link (Google Doc, Drive, TikTok …)'),
      soort: z.enum(PIN_KINDS).optional().describe('standaard: automatisch (document bij Google Docs/Drive/Notion/Canva, link bij een andere link, tekst zonder link)'),
      voor: owner.optional().describe('Voor wie (toont @naam); leeg = iedereen'),
    },
    false,
    async ({ titel, tekst, link, soort, voor }) => {
      const url = safeUrl(link)
      if (link && !url) throw new Error('Die link klopt niet (enkel http/https).')
      const t = titel.trim()
      if (!t) throw new Error('Geef een titel.')
      const p = await weekly.createPin({ kind: inferKind(soort, url), title: t.slice(0, 200), body: tekst?.trim().slice(0, 4000) || null, url, for_owner: (voor as never) ?? null, created_by: BY, created_via: 'grokbot' })
      return pinView(p)
    },
  )
  tool(
    'prikbord_bijwerken',
    'Kaartje op het prikbord aanpassen of (los)pinnen. Vastgepinde kaartjes blijven staan als het prikbord leeggemaakt wordt.',
    { pin_id: z.string(), titel: z.string().optional(), tekst: z.string().optional(), link: z.string().optional(), soort: z.enum(PIN_KINDS).optional(), voor: owner.nullable().optional(), vastgepind: z.boolean().optional() },
    false,
    async ({ pin_id, titel, tekst, link, soort, voor, vastgepind }) => {
      const url = link === undefined ? undefined : safeUrl(link)
      if (link && !url) throw new Error('Die link klopt niet (enkel http/https).')
      await weekly.updatePin(pin_id, {
        ...(titel?.trim() ? { title: titel.trim().slice(0, 200) } : {}),
        ...(tekst !== undefined ? { body: tekst.trim() || null } : {}),
        ...(url !== undefined ? { url } : {}),
        ...(soort ? { kind: soort } : {}),
        ...(voor !== undefined ? { for_owner: (voor as never) ?? null } : {}),
        ...(vastgepind !== undefined ? { pinned: vastgepind } : {}),
      })
      return 'Kaartje bijgewerkt.'
    },
  )
  tool('prikbord_verwijderen', 'Kaartje van het prikbord halen.', { pin_id: z.string() }, false, async ({ pin_id }) => {
    await weekly.deletePin(pin_id)
    return 'Kaartje verwijderd.'
  })
  tool('todo_doorschuiven_annuleren', 'Doorschuiven ongedaan maken (bv. per ongeluk doorgeschoven), zolang de volgende weekly nog niet ingepland is.', { todo_id: z.string() }, false, async ({ todo_id }) => {
    await weekly.unpush(todo_id)
    return 'Doorschuiven geannuleerd.'
  })
  tool('todo_verwijderen', 'To-do definitief verwijderen.', { todo_id: z.string() }, false, async ({ todo_id }) => {
    await weekly.deleteTodo(todo_id)
    return 'Verwijderd.'
  })
  tool('weekly_inplannen', 'De volgende weekly inplannen (enkel als er nog geen gepland is). Online = met Google Meet en altijd 1 uur; live = met einduur.', { datum: dateStr, uur: z.string().regex(/^\d{2}:\d{2}$/), einduur: z.string().regex(/^\d{2}:\d{2}$/).optional().describe('verplicht bij live, genegeerd bij online'), modus: z.enum(['live', 'online']) }, false, async ({ datum, uur, einduur, modus }) => {
    if (currentWeekly(await weekly.listWeeklies())) throw new Error('Er staat al een weekly ingepland.')
    const w = await scheduleWeekly(weekly, BY, { date: datum, time: uur, endTime: einduur ?? null, mode: modus })
    await weekly.assignPending(w.id)
    return { id: w.id, ingepland: `${datum} ${uur}`, modus }
  })
  tool('weekly_afsluiten', 'Een weekly afsluiten en meteen de volgende inplannen (live: met einduur; online: altijd 1 uur).', { weekly_id: z.string(), datum: dateStr, uur: z.string().regex(/^\d{2}:\d{2}$/), einduur: z.string().regex(/^\d{2}:\d{2}$/).optional().describe('verplicht bij live, genegeerd bij online'), modus: z.enum(['live', 'online']) }, false, async ({ weekly_id, datum, uur, einduur, modus }) => {
    const w = await weekly.getWeekly(weekly_id)
    if (!w || w.status === 'concluded') throw new Error('Deze weekly bestaat niet of is al afgesloten.')
    const next = await scheduleWeekly(weekly, BY, { date: datum, time: uur, endTime: einduur ?? null, mode: modus })
    await weekly.assignPending(next.id)
    await weekly.updateWeekly(weekly_id, { status: 'concluded', concluded_at: new Date().toISOString() })
    return { afgesloten: weekly_id, volgende: `${datum} ${uur}`, modus }
  })
}

import 'server-only'
import { z } from 'zod'
import { listAllConnections, memberName, resolveMember } from '../../team/connections'
import { calendarEvents, getAttachment, gmailQuery, readMessage, readThread, searchMail } from '../../team/google-read'
import { isoDay } from '../../format'
import { TEAM, CONTACT_EMAIL as IKR_DRIVE } from '../../weekly/types'
import { createDocInFolder, driveFileInfo, driveSearch, driveText, ensureDrivePath, escDriveQuery, moveDriveFile } from '../../google'
import { KIND_KEYS as CAL_KINDS, KINDS as CAL_KIND_LABELS, timeIn } from '../../calendar/core'
import { loadCalendar } from '../../calendar/service'
import { inviteAddresses, moveUpcomingInvites, setInviteAddress } from '../../team/invites'

import { MCP_CONTENT, dateStr, owner, type ToolCtx } from '../tool'

/** IKR-Drive, gedeelde agenda en (enkel lezen) mail en agenda van teamleden. */
export function registerDriveTeamTools(ctx: ToolCtx) {
  const { tool } = ctx
  const member_ = resolveMember
  tool(
    'agenda_uitnodigingsadres',
    'Naar welk adres uitnodigingen voor weeklies (en voor Casper ook calls) gaan, per teamlid. Zonder email: toont de huidige adressen. Met email: zet het adres (leeg = standaard) en past komende items aan. Enkel als dat teamlid erom vraagt.',
    { teamlid: owner.optional(), email: z.string().optional() },
    false,
    async ({ teamlid, email }) => {
      if (!teamlid || email === undefined) return Object.fromEntries(Object.entries(await inviteAddresses()).map(([k, v]) => [TEAM.find((t) => t.key === k)!.name, v]))
      const { before, after } = await setInviteAddress(teamlid as never, email)
      const moved = await moveUpcomingInvites(teamlid as never, before, after)
      return `Uitnodigingen voor ${TEAM.find((t) => t.key === teamlid)!.name} gaan nu naar ${after}${moved ? ` (${moved} komende items aangepast)` : ''}.`
    },
  )
  tool(
    'kalender',
    `De contact@-agenda (gedeelde IKR-agenda): weeklies, sales- en setter calls, draaidagen en andere afspraken. Enkel lezen. Soorten: ${CAL_KINDS.join(', ')}.`,
    { van: dateStr.optional().describe('standaard vandaag'), tot: dateStr.optional().describe('standaard van + 14 dagen'), soort: z.enum(CAL_KINDS as [string, ...string[]]).optional() },
    true,
    async ({ van, tot, soort }) => {
      const from = van ?? isoDay(new Date())
      const to = tot ?? new Date(Date.parse(`${from}T00:00:00Z`) + 14 * 86_400_000).toISOString().slice(0, 10)
      const res = await loadCalendar(from, to)
      if (res.status !== 'ok') throw new Error(res.reason)
      return res.items
        .filter((i) => !soort || i.kind === soort)
        .map((i) => ({ dag: i.day, tot_dag: i.lastDay !== i.day ? i.lastDay : undefined, uur: i.allDay ? 'hele dag' : `${timeIn(i.start!)}–${timeIn(i.end ?? i.start!)}`, titel: i.title, soort: CAL_KIND_LABELS[i.kind], meet: i.meetUrl }))
    },
  )
  // ─── Drive (IKR-Drive van contact@): bijlagen uit de chat lezen en op de juiste plek zetten ──
  const driveKind = (mime: string) => (mime === 'application/vnd.google-apps.folder' ? 'map' : mime.replace('application/vnd.google-apps.', 'google-').replace(/^application\//, ''))
  const driveId = (v: string) => {
    if (!/^[\w-]{10,}$/.test(v.trim())) throw new Error('Ongeldig Drive-id.')
    return v.trim()
  }
  tool('drive_bestand_lezen', 'Een bestand uit de IKR-Drive analyseren (bv. een bijlage uit de chat): naam, soort, link en de tekst (Docs, PDF, Word, PowerPoint, Sheets, tekst). Afbeeldingen geven geen tekst.', { file_id: z.string() }, true, async ({ file_id }) => {
    const id = driveId(file_id)
    const info = await driveFileInfo(IKR_DRIVE, id)
    let leesfout: string | null = null
    const tekst = await driveText(IKR_DRIVE, info, 30_000).catch((e: unknown) => {
      leesfout = e instanceof Error ? e.message : String(e)
      return null
    })
    return { file_id: info.id, naam: info.name, soort: info.mimeType, link: info.webViewLink, tekst: tekst ?? null, opmerking: tekst ? null : leesfout ? `Lezen mislukt: ${leesfout}` : 'Geen tekst uit dit bestand te halen (bv. een afbeelding of video).' }
  })
  tool('drive_mappen_zoeken', 'Mappen in de IKR-Drive zoeken op naam (bv. de map van een klant of lead).', { naam: z.string() }, true, async ({ naam }) => {
    const q = `name contains '${escDriveQuery(naam.trim())}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    return (await driveSearch(IKR_DRIVE, q, 15)).map((f) => ({ map_id: f.id, naam: f.name, link: f.webViewLink, gewijzigd: f.modifiedTime.slice(0, 10) }))
  })
  tool(
    'drive_zoeken',
    'Bestanden (en mappen) in de IKR-Drive zoeken op naam en op de tekst erin (Docs, PDF, Word, Sheets, …), bv. "contract Tempus" of "offerte". Geeft file_id; lees een bestand daarna met drive_bestand_lezen.',
    { zoekterm: z.string().min(2).max(200), alleen_naam: z.boolean().optional(), max: z.number().int().min(1).max(30).optional() },
    true,
    async ({ zoekterm, alleen_naam, max = 15 }) => {
      const t = escDriveQuery(zoekterm.trim())
      const q = `(${alleen_naam ? '' : `fullText contains '${t}' or `}name contains '${t}') and trashed = false`
      return (await driveSearch(IKR_DRIVE, q, max)).map((f) => ({ file_id: f.id, naam: f.name, soort: driveKind(f.mimeType), link: f.webViewLink, gewijzigd: f.modifiedTime.slice(0, 10) }))
    },
  )
  tool('drive_map_inhoud', 'Wat er in een map van de IKR-Drive zit (bestanden en submappen, nieuwste eerst). Map-id via drive_mappen_zoeken of drive_zoeken.', { map_id: z.string(), max: z.number().int().min(1).max(100).optional() }, true, async ({ map_id, max = 50 }) => {
    const q = `'${driveId(map_id)}' in parents and trashed = false`
    return (await driveSearch(IKR_DRIVE, q, max)).map((f) => ({ id: f.id, naam: f.name, soort: driveKind(f.mimeType), link: f.webViewLink, gewijzigd: f.modifiedTime.slice(0, 10) }))
  })
  tool('drive_map_maken', 'Een mappenpad in de IKR-Drive opzoeken of aanmaken (bv. ["Sales", "Leads", "Tomeco"]); bestaande mappen worden hergebruikt.', { pad: z.array(z.string().min(1)).min(1).max(6) }, false, async ({ pad }) => {
    const id = await ensureDrivePath(IKR_DRIVE, pad.map((p) => p.trim()))
    return { map_id: id, pad: pad.join(' / ') }
  })
  tool(
    'drive_doc_aanmaken',
    'Een Google Doc aanmaken in een map van de IKR-Drive (bv. het ideeëndoc in de klantmap). Inhoud in markdown (koppen, lijsten, vet, [tekst](https://…)-links worden opmaak). Staat er in die map al een doc met precies die titel, dan wordt dat teruggegeven (niets dubbel). Geeft doc_url.',
    { map_id: z.string(), titel: z.string().min(1).max(200), inhoud: z.string().min(1).max(100_000).describe('markdown') },
    false,
    async ({ map_id, titel, inhoud }) => {
      const folder = driveId(map_id)
      const name = titel.trim()
      const q = `name = '${escDriveQuery(name)}' and '${folder}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`
      const [existing] = await driveSearch(IKR_DRIVE, q, 1)
      if (existing) return { doc_url: existing.webViewLink, file_id: existing.id, titel: existing.name, bestond_al: true }
      const url = await createDocInFolder(IKR_DRIVE, folder, name, inhoud, 'text/markdown')
      return { doc_url: url, titel: name, bestond_al: false }
    },
  )
  tool('drive_bestand_verplaatsen', 'Een bestand in de IKR-Drive naar een map verplaatsen (bv. een geüploade ppt naar de map van de klant). Geeft de nieuwe link.', { file_id: z.string(), map_id: z.string() }, false, async ({ file_id, map_id }) => {
    const link = await moveDriveFile(IKR_DRIVE, driveId(file_id), driveId(map_id))
    return { file_id, link }
  })
  // ─── Mail en agenda van teamleden (ENKEL LEZEN; elke oproep gelogd) ───────────────
  const dateOpt = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Gebruik YYYY-MM-DD')
  tool(
    'teamlid_koppelingen',
    'Wie heeft wat gekoppeld: per teamlid de mail (welk account, status) en de agenda (welk account, welke agenda\'s gekozen, status).',
    {},
    true,
    async () => {
      const all = await listAllConnections()
      const emails = [...new Set([...TEAM.map((t) => t.email), ...all.map((c) => c.member_email)])]
      return emails.map((e) => {
        const mail = all.find((c) => c.member_email === e && c.kind === 'mail')
        const agenda = all.find((c) => c.member_email === e && c.kind === 'agenda')
        return {
          teamlid: memberName(e),
          email: e,
          mail: mail ? { account: mail.google_email, status: mail.status, sinds: mail.connected_at } : null,
          agenda: agenda
            ? { account: agenda.google_email, status: agenda.status, sinds: agenda.connected_at, agendas: agenda.calendars.filter((c) => agenda.selected_calendars.includes(c.id)).map((c) => c.naam) }
            : null,
        }
      })
    },
    { logReads: true },
  )
  tool(
    'teamlid_mail_zoeken',
    'Zoeken in de mailbox van een teamlid (alleen lezen). Zoekterm in Gmail-syntax (bv. "from:klant@x.be factuur"), optioneel met periode.',
    {
      teamlid: z.string().describe('naam, key of e-mail (bv. "Cedric")'),
      zoekterm: z.string().optional(),
      van: dateOpt.optional().describe('YYYY-MM-DD'),
      tot: dateOpt.optional().describe('YYYY-MM-DD (inclusief)'),
      max: z.number().int().min(1).max(50).optional(),
    },
    true,
    async ({ teamlid, zoekterm, van, tot, max }) => {
      const member = await member_(teamlid)
      return { teamlid: memberName(member), berichten: await searchMail(member, gmailQuery(zoekterm, van, tot), max ?? 20) }
    },
    { logReads: true },
  )
  tool(
    'teamlid_mail_lezen',
    'Een thread of bericht uit de mailbox van een teamlid lezen (alleen lezen), met de lijst van bijlagen. Haal een bijlage op met teamlid_bijlage_ophalen.',
    { teamlid: z.string(), thread_id: z.string().optional(), bericht_id: z.string().optional() },
    true,
    async ({ teamlid, thread_id, bericht_id }) => {
      if (!thread_id && !bericht_id) throw new Error('Geef een thread_id of een bericht_id.')
      const member = await member_(teamlid)
      return { teamlid: memberName(member), berichten: thread_id ? await readThread(member, thread_id) : [await readMessage(member, bericht_id!)] }
    },
    { logReads: true },
  )
  tool(
    'teamlid_bijlage_ophalen',
    'Een bijlage (bv. pdf) uit een bericht van een teamlid ophalen, als bestand (max. 15 MB). Alleen lezen.',
    { teamlid: z.string(), bericht_id: z.string(), bijlage_id: z.string() },
    true,
    async ({ teamlid, bericht_id, bijlage_id }) => {
      const member = await member_(teamlid)
      const a = await getAttachment(member, bericht_id, bijlage_id)
      const uri = `ikr://teamlid/${encodeURIComponent(member)}/mail/${encodeURIComponent(bericht_id)}/bijlage/${encodeURIComponent(a.bestandsnaam)}`
      const info = { type: 'text' as const, text: JSON.stringify({ bestandsnaam: a.bestandsnaam, type: a.type, grootte: a.grootte }) }
      // Tekstbijlagen als tekst, de rest (pdf, afbeeldingen …) als bestand.
      const isText = /^text\/|json|xml|csv/.test(a.type)
      const resource = isText
        ? { uri, mimeType: a.type, text: Buffer.from(a.base64, 'base64').toString('utf8') }
        : { uri, mimeType: a.type, blob: a.base64 }
      return { [MCP_CONTENT]: [info, { type: 'resource' as const, resource }] }
    },
    { logReads: true },
  )
  tool(
    'teamlid_agenda_events',
    'Afspraken van een teamlid tussen van en tot (inclusief), over de agenda\'s die het teamlid koos. Alleen lezen.',
    { teamlid: z.string(), van: dateOpt.describe('YYYY-MM-DD'), tot: dateOpt.describe('YYYY-MM-DD (inclusief)') },
    true,
    async ({ teamlid, van, tot }) => {
      if (tot < van) throw new Error('"tot" ligt vóór "van".')
      if ((new Date(tot).getTime() - new Date(van).getTime()) / 86_400_000 > 92) throw new Error('Vraag hoogstens 3 maanden tegelijk op.')
      const member = await member_(teamlid)
      return { teamlid: memberName(member), afspraken: await calendarEvents(member, van, tot) }
    },
    { logReads: true },
  )
}

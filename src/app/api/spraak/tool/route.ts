import { ownSession, safePage, str, voiceRoute } from '@/lib/admin/voice/api'
import { logToolCall, spentTodayEur } from '@/lib/admin/voice/store'
import { describeAction, OWN_TOOL_NAMES, runMcpTool, toolCatalog } from '@/lib/admin/voice/tools'
import { sendChatMessage } from '@/lib/admin/chat/service'
import { runAction } from '@/lib/admin/voice/actions'

export const dynamic = 'force-dynamic'
// Sommige tools (Drive, mail van het team) doen er even over.
export const maxDuration = 60

/**
 * Een toolaanroep van de spraakbot. Lezen: meteen uitvoeren. Wijzigen: als actie klaarzetten die
 * op bevestiging wacht (stem of knop); pas dan voert de server hem uit.
 */
export const POST = voiceRoute(async (session, body) => {
  const s = await ownSession(session, body.sessie_id)
  const name = str(body.name, 100)
  const args = body.args && typeof body.args === 'object' && !Array.isArray(body.args) ? (body.args as Record<string, unknown>) : {}
  const email = session.user.email
  const base = { session_id: s.id, user_email: email, tool: name, args }

  const spent = await spentTodayEur()
  if (spent.over) return { stop: true, output: { fout: 'Daglimiet bereikt. Zeg dat kort en stop.' } }

  if (name === 'open_pagina') {
    await logToolCall({ ...base, read_only: true, status: 'uitgevoerd' })
    return { output: { ok: true } }
  }
  if (name === 'grokbot_vragen') {
    const opdracht = str(args.opdracht).trim()
    if (!opdracht) return { output: { fout: 'Lege opdracht.' } }
    await sendChatMessage(session, { text: opdracht, page: safePage(body.page), via: 'spraak' })
    await logToolCall({ ...base, read_only: false, status: 'uitgevoerd' })
    return { grokbot: true, output: { ok: true, boodschap: 'Grok Bot is ermee bezig; het antwoord komt in de chat en jij krijgt het te horen.' } }
  }
  if (name === 'actie_bevestigen' || name === 'actie_annuleren') {
    // Het model mag dit enkel na een duidelijk "ja"; de browser stuurt dit pas door als de gebruiker na het voorstel sprak.
    return { output: await runAction(session, str(args.actie_id, 40), name === 'actie_bevestigen' ? 'bevestig' : 'annuleer', 'stem') }
  }
  if (OWN_TOOL_NAMES.has(name)) return { output: { fout: 'Onbekende tool.' } }

  const { readOnly } = await toolCatalog()
  if (!readOnly.has(name)) return { output: { fout: `Onbekende tool: ${name}` } }

  if (!readOnly.get(name)) {
    const samenvatting = describeAction(name, args)
    const id = await logToolCall({ ...base, read_only: false, status: 'wacht' })
    return {
      actie: { id, tool: name, samenvatting },
      output: { status: 'wacht_op_bevestiging', actie_id: id, wat: samenvatting, opdracht: 'Nog NIET uitgevoerd. Vraag in één zin of dit oké is.' },
    }
  }

  const started = Date.now()
  const res = await runMcpTool(name, args)
  await logToolCall({ ...base, read_only: true, status: res.ok ? 'uitgevoerd' : 'mislukt', result: res.ok ? null : res.text, duur_ms: Date.now() - started })
  return { output: res.ok ? res.text : { fout: res.text } }
})

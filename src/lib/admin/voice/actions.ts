import 'server-only'
import type { AdminSession } from '../session'
import { claimPending, finishToolCall } from './store'
import { runMcpTool } from './tools'

/** Een wachtende wijziging bevestigen (uitvoeren) of annuleren. Eén keer: daarna is hij niet meer te bevestigen. */
export async function runAction(session: AdminSession, id: string, decision: 'bevestig' | 'annuleer', via: 'stem' | 'knop') {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { fout: 'Onbekende actie.' }
  const row = await claimPending(id, session.user.email, decision === 'bevestig' ? 'bezig' : 'geannuleerd', via)
  if (!row) return { fout: 'Deze actie wacht niet (meer) op bevestiging: al uitgevoerd, geannuleerd of verlopen.' }
  if (decision === 'annuleer') return { status: 'geannuleerd', tool: row.tool }
  const started = Date.now()
  const res = await runMcpTool(row.tool, row.args ?? {})
  await finishToolCall(row.id, res.ok ? 'uitgevoerd' : 'mislukt', res.text, Date.now() - started)
  return res.ok ? { status: 'uitgevoerd', tool: row.tool, resultaat: res.text } : { status: 'mislukt', tool: row.tool, fout: res.text }
}

import 'server-only'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SALES_EMAIL } from '../env'
import type { AdminSession } from '../session'
import { createServiceSupabase } from '../supabase/server'
import { supabaseLeads } from '../sales/repo'
import { supabaseWeekly } from '../weekly/repo'
import { supabaseClients } from '../clients/repo'
import { supabaseSops } from '../sops/repo'
import { supabaseProduction } from '../production/repo'
import { supabaseCalls } from '../calls/repo'
import { supabaseDrafts } from '../sales/drafts'
import { supabaseChat } from '../chat/repo'
import { INSTRUCTIONS } from './instructions'
import { makeResolvers, makeTool, type Scope, type ToolCtx } from './tool'
import { registerLeadTools } from './tools/leads'
import { registerInboxTools } from './tools/inbox-drafts'
import { registerCallTools } from './tools/calls'
import { registerJobTools } from './tools/jobs-chat'
import { registerWeeklyTools } from './tools/weekly'
import { registerClientTools } from './tools/clients-finance'
import { registerProductionTools } from './tools/production'
import { registerSopTools } from './tools/sops'
import { registerWorkspaceTools } from './tools/workspace'
import { registerDriveTeamTools } from './tools/drive-team'

export { validateDraft } from './tool'
export type { Scope } from './tool'

/** Modules met sales-gegevens (leads, inbox, concepten, calls): enkel in een sessie met bereik 'sales'. */
const SALES_MODULES = [registerLeadTools, registerInboxTools, registerCallTools]
/** Modules voor het hele team. Wat daarin toch enkel voor Casper is, kijkt zelf naar ctx.scope. */
const TEAM_MODULES = [registerJobTools, registerWeeklyTools, registerClientTools, registerProductionTools, registerSopTools, registerWorkspaceTools, registerDriveTeamTools]

/** Grokbot werkt als Casper, rechtstreeks op de database (service role). */
export function botSession(): AdminSession {
  const db = createServiceSupabase()
  return {
    user: { id: 'grokbot', email: SALES_EMAIL, name: 'Grokbot' },
    mode: 'supabase',
    leads: supabaseLeads(db),
    weekly: supabaseWeekly(db),
    clients: supabaseClients(db),
    sops: supabaseSops(db),
    production: supabaseProduction(db),
    calls: supabaseCalls(db),
    drafts: supabaseDrafts(db),
    chat: supabaseChat(db),
  }
}

/**
 * De MCP-server voor Grokbot. Bereik 'sales' (de sleutel van Casper) krijgt alle tools; bereik 'team'
 * (een aparte sleutel voor de chats van Cédric en Milan) krijgt geen enkele sales-tool.
 */
export function buildMcpServer(session: AdminSession, scope: Scope = 'sales') {
  const server = new McpServer({ name: 'ikr-dashboard', version: '1.1.0' }, { instructions: INSTRUCTIONS(scope) })
  const ctx: ToolCtx = { session, scope, tool: makeTool(server), ...makeResolvers(session) }
  for (const register of scope === 'sales' ? [...SALES_MODULES, ...TEAM_MODULES] : TEAM_MODULES) register(ctx)
  return server
}

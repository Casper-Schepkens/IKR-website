import 'server-only'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SALES_EMAIL } from '../env'
import type { AdminSession } from '../session'
import { createServiceSupabase } from '../supabase/server'
import { supabaseLeads } from '../sales/repo'
import { supabaseWeekly } from '../weekly/repo'
import { supabaseClients } from '../clients/repo'
import { supabaseFreelancers } from '../freelancers/repo'
import { supabaseSops } from '../sops/repo'
import { supabaseProduction } from '../production/repo'
import { supabaseCalls } from '../calls/repo'
import { supabaseDrafts } from '../sales/drafts'
import { supabaseChat } from '../chat/repo'
import { INSTRUCTIONS } from './instructions'
import { makeResolvers, makeTool, type ToolCtx } from './tool'
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
import { registerWhatsappTools } from './tools/whatsapp'
import { registerFreelancerTools } from './tools/freelancers'

export { validateDraft } from './tool'

/** Alle tools; het hele team mag alles vragen, ook over sales. */
const MODULES = [registerLeadTools, registerInboxTools, registerCallTools, registerJobTools, registerWeeklyTools, registerClientTools, registerProductionTools, registerSopTools, registerWorkspaceTools, registerDriveTeamTools, registerWhatsappTools, registerFreelancerTools]

/** Grokbot werkt als Casper, rechtstreeks op de database (service role). */
export function botSession(): AdminSession {
  const db = createServiceSupabase()
  return {
    user: { id: 'grokbot', email: SALES_EMAIL, name: 'Grokbot' },
    mode: 'supabase',
    leads: supabaseLeads(db),
    weekly: supabaseWeekly(db),
    clients: supabaseClients(db),
    freelancers: supabaseFreelancers(db),
    sops: supabaseSops(db),
    production: supabaseProduction(db),
    calls: supabaseCalls(db),
    drafts: supabaseDrafts(db),
    chat: supabaseChat(db),
  }
}

/** De MCP-server voor Grokbot, met alle tools. */
export function buildMcpServer(session: AdminSession) {
  const server = new McpServer({ name: 'ikr-dashboard', version: '1.1.0' }, { instructions: INSTRUCTIONS })
  const ctx: ToolCtx = { session, tool: makeTool(server), ...makeResolvers(session) }
  for (const register of MODULES) register(ctx)
  return server
}

import { supabaseUrl } from '../env'

/** OAuth Protected Resource Metadata (RFC 9728) voor /api/mcp. */
export function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}/api/mcp`,
    authorization_servers: [`${supabaseUrl()}/auth/v1`],
    bearer_methods_supported: ['header'],
    scopes_supported: ['openid', 'email', 'profile'],
    resource_name: 'IKR Admin',
    resource_documentation: `${origin}/admin/instellingen`,
  }
}

export const metadataHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300',
  'X-Robots-Tag': 'noindex',
}

'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/session'
import { createServerSupabase } from '@/lib/admin/supabase/server'

export async function decideOAuthAction(authorizationId: string, approve: boolean) {
  await requireAdmin()
  const supabase = await createServerSupabase()
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })
  if (error || !data?.redirect_url) {
    redirect(`/admin/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}&fout=1`)
  }
  redirect(data.redirect_url)
}

import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/admin/supabase/server'
import { isAllowedAdminEmail } from '@/lib/admin/env'

/** Google OAuth via Supabase komt hier terug met een code. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')
  const safeNext = next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin'

  if (!code) return NextResponse.redirect(new URL('/admin/login?error=geen-code', url.origin))

  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL('/admin/login?error=login-mislukt', url.origin))

  if (!isAllowedAdminEmail(data.user?.email)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/admin/login?error=geen-toegang', url.origin))
  }
  return NextResponse.redirect(new URL(safeNext, url.origin))
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Beschermt /admin: ververst de Supabase-sessie en stuurt niet-ingelogde bezoekers naar /admin/login.
 * De echte toegangscheck (domein/whitelist) gebeurt ook nog in de admin-layout en in de database (RLS).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let response = NextResponse.next({ request })
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')

  // Zonder Supabase: demomodus of "niet geconfigureerd"-scherm — dat regelt de layout.
  if (!url || !anon) return response

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        response.headers.set('X-Robots-Tag', 'noindex, nofollow')
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // getClaims controleert de JWT lokaal (asymmetrische sleutel, JWKS gecachet) en ververst een verlopen
  // sessie; getUser zou bij elk verzoek de Auth-server bellen.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims?.sub ? data.claims : null

  const path = request.nextUrl.pathname
  const isPublicAdminPath = path.startsWith('/admin/login') || path.startsWith('/admin/auth')

  if (!user && !isPublicAdminPath) {
    const login = request.nextUrl.clone()
    login.pathname = '/admin/login'
    login.search = ''
    if (path !== '/admin') login.searchParams.set('next', path + request.nextUrl.search)
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}

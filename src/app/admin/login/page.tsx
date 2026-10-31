import type { Metadata } from 'next'
import Link from 'next/link'
import { adminMode } from '@/lib/admin/session'
import { LoginButton } from './LoginButton'
import { signOutAction } from '../actions'

export const metadata: Metadata = { title: 'Inloggen' }

const ERRORS: Record<string, string> = {
  'geen-toegang':
    'Dit account heeft geen toegang. Gebruik je @iknowright.be-adres, of vraag om op de lijst gezet te worden.',
  'login-mislukt': 'Inloggen is niet gelukt. Probeer het opnieuw.',
  'geen-code': 'Inloggen werd onderbroken. Probeer het opnieuw.',
  'niet-geconfigureerd':
    'De admin is nog niet gekoppeld aan een database (Supabase-variabelen ontbreken).',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  const mode = adminMode()

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ikr-navy p-4">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl bg-ikr-cream-light p-8">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[44px] leading-none font-black tracking-[-0.03em]">
            IKR.
          </span>
          <span className="rounded-full bg-ikr-cyan px-2.5 py-1 text-xs font-semibold">ADMIN</span>
        </div>
        <p className="m-0 text-[15px] text-[#5E5670]">Alleen voor het IKR-team.</p>
        {error && ERRORS[error] && (
          <p role="alert" className="m-0 rounded-2xl bg-[#FCE3D2] p-4 text-sm text-[#6E2E09]">
            {ERRORS[error]}
          </p>
        )}
        {mode === 'unconfigured' && (
          <p className="m-0 text-sm text-[#5E5670]">
            Ontbrekende variabelen in deze omgeving:{' '}
            <code className="font-mono text-xs">
              {[
                !process.env.NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
                !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
              ]
                .filter(Boolean)
                .join(', ')}
            </code>
            . Na het toevoegen in Vercel is een nieuwe build nodig.
          </p>
        )}
        {mode === 'supabase' && <LoginButton next={next} />}
        {mode === 'demo' && (
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ikr-cyan px-5 text-sm font-semibold text-ikr-navy no-underline"
          >
            Open de demo
          </Link>
        )}
        {error === 'geen-toegang' && mode === 'supabase' && (
          <form action={signOutAction}>
            <button type="submit" className="text-sm underline">
              Afmelden en ander account kiezen
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

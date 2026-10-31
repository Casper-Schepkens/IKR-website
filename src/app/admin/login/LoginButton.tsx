'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/admin/supabase/browser'
import { buttonClass, Spinner } from '@/components/admin/ui'

export function LoginButton({ next }: { next?: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        data-pending={pending}
        aria-busy={pending}
        className={buttonClass('cyan', false, 'w-full')}
        onClick={async () => {
          setPending(true)
          setError(null)
          const redirectTo = new URL('/admin/auth/callback', window.location.origin)
          if (next) redirectTo.searchParams.set('next', next)
          const { error } = await createBrowserSupabase().auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectTo.toString(),
              queryParams: { prompt: 'select_account' },
            },
          })
          if (error) {
            setError(error.message)
            setPending(false)
          }
        }}
      >
        {pending && <Spinner />}
        {pending ? 'Doorsturen naar Google…' : 'Inloggen met Google'}
      </button>
      {error && <p className="m-0 text-sm text-[#A3470F]">{error}</p>}
    </div>
  )
}

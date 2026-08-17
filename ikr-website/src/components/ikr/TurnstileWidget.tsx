'use client'

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { useCallback, useRef, useState } from 'react'
import { getBrowserTurnstileSiteKey } from '@/lib/turnstile'

type Props = {
  onToken: (token: string) => void
  onExpire?: () => void
}

function messageForErrorCode(code: string): string {
  if (code === '110200' || code === '600010') {
    return 'Captcha weigert dit domein. In Cloudflare Turnstile: voeg ikr-website.vercel.app (live) en localhost (lokaal) toe bij Hostname Management.'
  }
  if (code === '110600' || code === '300030') {
    return 'Captcha kon niet laden. Vernieuw de pagina of probeer een andere browser.'
  }
  return 'Captcha kon niet geladen worden. Vernieuw de pagina en probeer opnieuw.'
}

export function TurnstileWidget({ onToken, onExpire }: Props) {
  const ref = useRef<TurnstileInstance>(null)
  const [error, setError] = useState<string | null>(null)
  const siteKey = getBrowserTurnstileSiteKey()

  const handleError = useCallback(
    (code: string) => {
      onExpire?.()
      setError(messageForErrorCode(code))
    },
    [onExpire],
  )

  if (!siteKey) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <p style={{ fontSize: 14, color: '#8B849E' }}>
          Captcha uitgeschakeld — stel NEXT_PUBLIC_TURNSTILE_SITE_KEY in voor productie.
        </p>
      )
    }
    return (
      <p style={{ fontSize: 14, color: '#B42318' }}>
        Captcha is niet geconfigureerd. Mail ons via contact@iknowright.be.
      </p>
    )
  }

  return (
    <div>
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={(token) => {
          setError(null)
          onToken(token)
        }}
        onExpire={() => {
          onExpire?.()
          ref.current?.reset()
        }}
        onError={handleError}
        onTimeout={() => {
          onExpire?.()
          ref.current?.reset()
        }}
        options={{
          theme: 'light',
          size: 'flexible',
          language: 'nl',
          appearance: 'always',
          retry: 'auto',
          refreshExpired: 'auto',
        }}
      />
      {error && (
        <p role="alert" style={{ fontSize: 13, color: '#B42318', marginTop: 8, maxWidth: 420, lineHeight: 1.4 }}>
          {error}
        </p>
      )}
    </div>
  )
}

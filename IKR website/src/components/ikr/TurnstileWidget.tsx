'use client'

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { useRef } from 'react'

type Props = {
  onToken: (token: string) => void
  onExpire?: () => void
}

export function TurnstileWidget({ onToken, onExpire }: Props) {
  const ref = useRef<TurnstileInstance>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  if (!siteKey) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <p style={{ fontSize: 14, color: '#8B849E' }}>
          Captcha uitgeschakeld — stel NEXT_PUBLIC_TURNSTILE_SITE_KEY in voor productie.
        </p>
      )
    }
    return null
  }

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      onSuccess={onToken}
      onExpire={() => {
        onExpire?.()
        ref.current?.reset()
      }}
      options={{ theme: 'light', size: 'normal' }}
    />
  )
}

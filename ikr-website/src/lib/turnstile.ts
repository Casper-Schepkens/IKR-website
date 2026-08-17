type TurnstileVerifyResponse = {
  success: boolean
  hostname?: string
  'error-codes'?: string[]
}

/** Cloudflare dummy keys — werken op localhost, geen dashboard-hostname nodig. */
export const TURNSTILE_DUMMY_SITE_KEY = '1x00000000000000000000AA'
const TURNSTILE_DUMMY_SECRET = '1x0000000000000000000000000000000AA'

export function getBrowserTurnstileSiteKey(): string | undefined {
  if (process.env.NODE_ENV === 'development') {
    return TURNSTILE_DUMMY_SITE_KEY
  }
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined
}

function getVerifySecret(): string | undefined {
  if (process.env.NODE_ENV === 'development') {
    return TURNSTILE_DUMMY_SECRET
  }
  return process.env.TURNSTILE_SECRET_KEY || undefined
}

export function isDevTurnstileBypass(token: string): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.SKIP_TURNSTILE === 'true' &&
    (token === 'dev-bypass' || token.length > 0)
  )
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  if (!token) return false

  if (isDevTurnstileBypass(token)) {
    return true
  }

  const secret = getVerifySecret()
  if (!secret) {
    console.error('[turnstile] Geen secret — TURNSTILE_SECRET_KEY ontbreekt in deze omgeving.')
    return false
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  })

  if (remoteIp) {
    body.set('remoteip', remoteIp)
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    console.error('[turnstile] siteverify HTTP', response.status)
    return false
  }

  const data = (await response.json()) as TurnstileVerifyResponse
  if (!data.success) {
    const codes = data['error-codes']?.join(', ') ?? 'onbekend'
    console.error('[turnstile] verificatie mislukt', {
      codes,
      hostname: data.hostname ?? null,
    })
    return false
  }

  return true
}

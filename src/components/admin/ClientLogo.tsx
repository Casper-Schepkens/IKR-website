import { initials } from '@/lib/admin/format'
import type { Client } from '@/lib/admin/types'
import { cn } from '@/utilities/ui'

/** Logo van een klant, met initialen als terugval. */
export function logoSrc(client: Pick<Client, 'id' | 'logo_url'>) {
  if (!client.logo_url) return null
  if (/^https:\/\//i.test(client.logo_url)) return client.logo_url
  return `/admin/klanten/${client.id}/logo?v=${encodeURIComponent(client.logo_url)}`
}

export function ClientLogo({
  client,
  size = 36,
  className,
}: {
  client: Pick<Client, 'id' | 'name' | 'logo_url'>
  size?: number
  className?: string
}) {
  const src = logoSrc(client)
  const box = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E6DFD2] bg-white',
    className,
  )
  if (!src) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
        className={cn(box, 'border-transparent bg-ikr-navy font-display font-black text-ikr-cyan')}
      >
        {initials(client.name)}
      </span>
    )
  }
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element -- externe of privé logo's, geen optimalisatie nodig */}
      <img src={src} alt="" width={size} height={size} className="size-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
    </span>
  )
}

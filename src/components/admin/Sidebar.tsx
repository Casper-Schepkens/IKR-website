'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utilities/ui'
import { Icon } from './ui'
import { signOutAction } from '@/app/admin/actions'

const NAV = [
  { href: '/admin', label: 'Vandaag', icon: Icon.home, exact: true },
  { href: '/admin/klanten', label: 'Klanten', icon: Icon.users },
  { href: '/admin/pipeline', label: 'Pipeline', icon: Icon.board },
  { href: '/admin/kalender', label: 'Kalender', icon: Icon.calendar },
  { href: '/admin/contracten', label: 'Contracten', icon: Icon.file },
  { href: '/admin/resultaten', label: 'Resultaten', icon: Icon.chart },
  { href: '/admin/kennis', label: 'IKR-kennis', icon: Icon.book },
  { href: '/admin/instellingen', label: 'Instellingen', icon: Icon.settings },
]

export function Sidebar({ name, email, demo }: { name: string; email: string; demo: boolean }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Hoofdmenu"
      className="flex flex-col gap-6 bg-ikr-navy px-4 py-5 lg:sticky lg:top-0 lg:h-dvh lg:w-[232px] lg:shrink-0 lg:gap-8 lg:py-7"
    >
      <div className="flex items-center gap-2.5 px-2.5">
        <Link
          href="/admin"
          className="font-display text-[34px] leading-none font-black tracking-[-0.03em] text-ikr-cream-light no-underline"
        >
          IKR.
        </Link>
        <span className="rounded-full bg-ikr-cyan px-2.5 py-1 text-xs font-semibold text-ikr-navy">
          ADMIN
        </span>
        {demo && (
          <span className="rounded-full bg-[#FFF0C2] px-2.5 py-1 text-xs font-semibold text-[#6B5300]">
            DEMO
          </span>
        )}
      </div>
      <div className="flex flex-row flex-wrap gap-0.5 lg:flex-col">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const I = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'ikr-nav flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm no-underline transition-colors',
                active
                  ? 'bg-ikr-cyan font-bold text-ikr-navy'
                  : 'font-medium text-ikr-cream hover:bg-white/10 hover:text-ikr-cream-light',
              )}
            >
              <I />
              {item.label}
            </Link>
          )
        })}
      </div>
      <div className="mt-auto hidden flex-col gap-3 px-2.5 lg:flex">
        <span className="text-xs text-[#B9B2C9]">Ingelogd als</span>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-ikr-cyan text-[13px] font-bold text-ikr-navy">
            {name.slice(0, 2).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold text-ikr-cream-light">{name}</span>
            <span className="truncate text-xs text-[#B9B2C9]">{email}</span>
          </div>
        </div>
        {!demo && (
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-xs text-[#B9B2C9] underline hover:text-ikr-cream-light"
            >
              Afmelden
            </button>
          </form>
        )}
      </div>
    </nav>
  )
}

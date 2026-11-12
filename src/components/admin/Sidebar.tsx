'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utilities/ui'
import { Icon } from './ui'
import { signOutAction } from '@/app/admin/actions'
import { saveNavPrefsAction } from '@/app/admin/team-actions'
import { arrangeNav, type NavPrefs } from '@/lib/admin/team/nav-core'

type NavItem = { href: string; label: string; icon: (typeof Icon)[keyof typeof Icon]; exact?: boolean }

/** Menu per persoon: enkel wat bij iemands eigen workflow hoort. */
export function Sidebar({
  name,
  email,
  demo,
  sales,
  navPrefs,
}: {
  name: string
  email: string
  demo: boolean
  sales: boolean
  navPrefs: NavPrefs
}) {
  const pathname = usePathname()
  // Eigen volgorde en vastgepinde items (bewaard per persoon); meteen tonen, op de achtergrond bewaren.
  const [prefs, setPrefs] = useState<NavPrefs>(navPrefs)
  const [editing, setEditing] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [, start] = useTransition()
  const nav: NavItem[] = [
    // Grok Bot (werkplek) bovenaan, voor iedereen.
    { href: '/admin/werkplek', label: 'Grok Bot', icon: Icon.sparkle },
    ...(sales
      ? [
          { href: '/admin/sales/cold-mails', label: 'Cold mails', icon: Icon.chart },
          { href: '/admin/sales/inbox', label: 'Inbox', icon: Icon.mail },
          { href: '/admin/sales/calls', label: 'Calls', icon: Icon.phone },
          { href: '/admin/sales', label: 'Leads', icon: Icon.users, exact: true },
        ]
      : []),
    { href: '/admin/klanten', label: 'Klanten', icon: Icon.board },
    { href: '/admin/financien', label: 'Financiën', icon: Icon.euro },
    // Productie is voor Cédric en Milan; Casper ziet het voorlopig ook (temp).
    { href: '/admin/productie', label: sales ? 'Productie (temp)' : 'Productie', icon: Icon.file },
    { href: '/admin/weekly', label: 'Weekly', icon: Icon.calendar },
    { href: '/admin/kalender', label: 'Kalender', icon: Icon.calendar },
    { href: '/admin/sops', label: "SOP's", icon: Icon.book },
    { href: '/admin/instellingen', label: 'Instellingen', icon: Icon.settings },
  ]
  const { pinned, rest } = arrangeNav(nav, prefs)
  const save = (next: NavPrefs) => {
    setPrefs(next)
    start(async () => {
      await saveNavPrefsAction(next.order, next.pinned)
    })
  }
  const togglePin = (href: string) => {
    const isPinned = prefs.pinned.includes(href)
    const restHrefs = rest.map((i) => i.href)
    // Losmaken: terug onderaan de rest; vastpinnen: onderaan de vastgepinde.
    save(isPinned ? { pinned: prefs.pinned.filter((h) => h !== href), order: [...restHrefs, href] } : { pinned: [...pinned.map((i) => i.href), href], order: restHrefs.filter((h) => h !== href) })
  }
  /** Verplaats `href` binnen zijn groep (vastgepind of de rest) naar de plaats van `target`, of met een stap. */
  const move = (href: string, to: string | number) => {
    const group = prefs.pinned.includes(href) ? pinned.map((i) => i.href) : rest.map((i) => i.href)
    const from = group.indexOf(href)
    const dest = typeof to === 'number' ? from + to : group.indexOf(to)
    if (from < 0 || dest < 0 || dest >= group.length || dest === from) return
    const next = [...group]
    next.splice(from, 1)
    next.splice(dest, 0, href)
    if (prefs.pinned.includes(href)) save({ ...prefs, pinned: next })
    else save({ ...prefs, order: next })
  }
  const link = (item: NavItem, group: NavItem[]) => {
    const active = item.exact ? pathname === item.href || pathname.startsWith(`${item.href}/leads`) : pathname.startsWith(item.href)
    const I = item.icon
    const isPinned = prefs.pinned.includes(item.href)
    const idx = group.indexOf(item)
    return (
      <div
        key={item.href}
        draggable={editing}
        onDragStart={() => setDragging(item.href)}
        onDragEnd={() => setDragging(null)}
        onDragOver={(e) => editing && dragging && e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (dragging && dragging !== item.href && prefs.pinned.includes(dragging) === isPinned) move(dragging, item.href)
          setDragging(null)
        }}
        className={cn('flex items-center gap-1', editing && 'cursor-grab rounded-xl ring-1 ring-white/15', dragging === item.href && 'opacity-40')}
      >
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'ikr-nav flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-sm no-underline transition-colors',
            active ? 'bg-ikr-cyan font-bold text-ikr-navy' : 'font-medium text-ikr-cream hover:bg-white/10 hover:text-ikr-cream-light',
          )}
        >
          <I />
          <span className="truncate">{item.label}</span>
        </Link>
        {editing && (
          <span className="flex shrink-0 items-center text-ikr-cream">
            <button type="button" onClick={() => move(item.href, -1)} disabled={idx === 0} aria-label={`${item.label} omhoog`} className="rounded px-1 py-1 text-xs hover:bg-white/10 disabled:opacity-30">
              ↑
            </button>
            <button type="button" onClick={() => move(item.href, 1)} disabled={idx === group.length - 1} aria-label={`${item.label} omlaag`} className="rounded px-1 py-1 text-xs hover:bg-white/10 disabled:opacity-30">
              ↓
            </button>
            <button type="button" onClick={() => togglePin(item.href)} aria-pressed={isPinned} aria-label={`${item.label} ${isPinned ? 'losmaken' : 'vastpinnen'}`} title={isPinned ? 'Losmaken' : 'Vastpinnen'} className={cn('rounded px-1 py-1 text-xs hover:bg-white/10', isPinned ? 'text-ikr-cyan' : 'opacity-60')}>
              📌
            </button>
          </span>
        )}
      </div>
    )
  }
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
          {sales ? 'SALES' : 'ADMIN'}
        </span>
        {demo && (
          <span className="rounded-full bg-[#FFF0C2] px-2.5 py-1 text-xs font-semibold text-[#6B5300]">
            DEMO
          </span>
        )}
      </div>
      {/* Menu: scrollt als het niet past; naam en afmelden blijven onderaan staan. */}
      <div className="flex flex-col gap-2 lg:-mx-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-1">
        {pinned.length > 0 && (
          <>
            <span className="px-3 text-[11px] font-semibold tracking-wide text-[#B9B2C9] uppercase">Vastgepind</span>
            <div className="flex flex-row flex-wrap gap-0.5 lg:flex-col">{pinned.map((i) => link(i, pinned))}</div>
            <span className="mx-3 h-px bg-white/10" aria-hidden />
          </>
        )}
        <div className="flex flex-row flex-wrap gap-0.5 lg:flex-col">{rest.map((i) => link(i, rest))}</div>
        <button type="button" onClick={() => setEditing(!editing)} aria-pressed={editing} className="self-start px-3 py-1 text-xs text-[#B9B2C9] underline hover:text-ikr-cream-light">
          {editing ? 'Klaar' : 'Menu aanpassen'}
        </button>
        {editing && <p className="m-0 px-3 text-[11px] text-[#B9B2C9]">Sleep of gebruik ↑↓. 📌 = vastpinnen bovenaan. Wordt bewaard voor jou.</p>}
      </div>
      <div className="mt-auto hidden shrink-0 flex-col gap-3 px-2.5 lg:flex">
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
            <button type="submit" className="text-xs text-[#B9B2C9] underline hover:text-ikr-cream-light">
              Afmelden
            </button>
          </form>
        )}
      </div>
    </nav>
  )
}

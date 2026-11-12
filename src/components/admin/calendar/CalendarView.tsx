'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { byDay, KIND_KEYS, KINDS, timeIn, type CalItem, type Kind } from '@/lib/admin/calendar/core'
import { buttonClass, Card, Empty, muted } from '../ui'
import { cn } from '@/utilities/ui'

/** Kleur per soort (achtergrond van het item); tekst blijft donker. Soort staat er ook als label bij. */
const TONE: Record<Kind, string> = {
  weekly: 'bg-[#E4E0F0] border-[#7B6BB0]',
  sales: 'bg-[#D3F3F9] border-[#0B9DB8]',
  setter: 'bg-[#E8F6EC] border-[#3C9A5F]',
  draaidag: 'bg-[#FCE3D2] border-[#EB6834]',
  overig: 'bg-ikr-cream border-[#B9B1A3]',
}
const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

export function CalendarView({ items, days, month, today }: { items: CalItem[]; days: string[]; month: string; today: string }) {
  const [on, setOn] = useState<Set<Kind>>(new Set(KIND_KEYS))
  const counts = Object.fromEntries(KIND_KEYS.map((k) => [k, items.filter((i) => i.kind === k && i.day.startsWith(month)).length])) as Record<Kind, number>
  const shown = useMemo(() => items.filter((i) => on.has(i.kind)), [items, on])
  const map = useMemo(() => byDay(shown, days), [shown, days])
  const toggle = (k: Kind) => setOn((s) => (s.size === KIND_KEYS.length ? new Set([k]) : s.has(k) && s.size === 1 ? new Set(KIND_KEYS) : new Set(s.has(k) ? [...s].filter((x) => x !== k) : [...s, k])))
  const listDays = days.filter((d) => d.startsWith(month) && (map.get(d)?.length ?? 0) > 0)

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter op soort">
        <button type="button" aria-pressed={on.size === KIND_KEYS.length} onClick={() => setOn(new Set(KIND_KEYS))} className={buttonClass(on.size === KIND_KEYS.length ? 'navy' : 'light', true)}>
          Alles
        </button>
        {KIND_KEYS.map((k) => {
          const active = on.has(k) && on.size < KIND_KEYS.length
          return (
            <button key={k} type="button" aria-pressed={active} onClick={() => toggle(k)} className={buttonClass(active ? 'navy' : 'light', true)}>
              <span aria-hidden className={cn('inline-block size-2.5 rounded-full border-2', TONE[k])} />
              {KINDS[k]} <span className="opacity-60">{counts[k]}</span>
            </button>
          )
        })}
      </div>

      {/* Maandrooster (vanaf tablet) */}
      <Card className="hidden p-0 md:block">
        <div className="grid grid-cols-7 border-b border-[#E6DFD2] text-xs font-bold tracking-wide uppercase">
          {WEEKDAYS.map((w) => (
            <div key={w} className={cn('px-2 py-2', muted)}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const list = map.get(d) ?? []
            const inMonth = d.startsWith(month)
            return (
              <div key={d} className={cn('min-h-28 border-r border-b border-[#E6DFD2] p-1.5 [&:nth-child(7n)]:border-r-0', !inMonth && 'bg-ikr-cream/40')}>
                <div className={cn('mb-1 text-xs font-semibold', !inMonth && muted)}>
                  <span className={cn(d === today && 'rounded-full bg-ikr-navy px-1.5 py-0.5 text-ikr-cream-light')}>{Number(d.slice(8))}</span>
                </div>
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {list.slice(0, 4).map((it) => (
                    <li key={`${it.id}-${d}`}>
                      <Chip it={it} />
                    </li>
                  ))}
                  {list.length > 4 && <li className={cn('text-[11px]', muted)}>+{list.length - 4} meer</li>}
                </ul>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Lijst per dag (gsm) */}
      <div className="flex flex-col gap-3 md:hidden">
        {!listDays.length && <Empty>Niets in deze maand.</Empty>}
        {listDays.map((d) => (
          <Card key={d} className={cn('flex flex-col gap-2 p-4', d === today && 'ring-2 ring-ikr-navy')}>
            <p className="m-0 text-sm font-bold capitalize">
              {new Date(`${d}T12:00:00Z`).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
              {d === today && ' · vandaag'}
            </p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {map.get(d)!.map((it) => (
                <li key={it.id}>
                  <Chip it={it} large />
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  )
}

function Chip({ it, large = false }: { it: CalItem; large?: boolean }) {
  const time = it.allDay ? 'hele dag' : `${timeIn(it.start!)}${large && it.end ? `–${timeIn(it.end)}` : ''}`
  const body = (
    <span className={cn('flex flex-col rounded-md border-l-[3px] px-1.5 py-1 leading-tight', TONE[it.kind], large ? 'text-sm' : 'text-[11px]')} title={`${KINDS[it.kind]} · ${time} · ${it.title}`}>
      <span className={cn('font-semibold', !large && 'truncate')}>{it.title}</span>
      <span className="text-[#4D465A]">
        {time}
        {large && ` · ${KINDS[it.kind]}`}
      </span>
      {large && it.meetUrl && (
        <a href={it.meetUrl} target="_blank" rel="noreferrer" className="mt-0.5 underline" onClick={(e) => e.stopPropagation()}>
          Google Meet
        </a>
      )}
    </span>
  )
  return it.href ? (
    <Link href={it.href} className="block hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  )
}

'use client'

import { useState } from 'react'
import { muted } from '../ui'
import { cn } from '@/utilities/ui'

/** Kleuren gevalideerd (dataviz-validator, licht oppervlak #FFF8F1): in = cyaan, uit = oranje. */
const IN = '#0B9DB8'
const OUT = '#EB6834'
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const eur = (n: number) => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const label = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(2, 4)}`

/** Omzet (excl. btw) en kosten per maand: gegroepeerde balken, één as, tooltip bij hover, tabel als alternatief. */
export function FinanceChart({ data }: { data: { maand: string; omzet: number; kosten: number; over: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.flatMap((d) => [d.omzet, d.kosten]))
  const h = 180
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm" style={{ background: IN }} /> Omzet (excl. btw)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm" style={{ background: OUT }} /> Kosten (zonder btw-betalingen)
        </span>
      </figcaption>
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <div className="flex items-end gap-[6px] border-b border-[#D9D1C2]" style={{ height: h }} aria-hidden="true">
          {data.map((d, i) => (
            <div
              key={d.maand}
              className={cn('flex h-full flex-1 cursor-default items-end justify-center gap-[2px] rounded-t-md', hover === i && 'bg-[#F0EBE0]')}
              onMouseEnter={() => setHover(i)}
            >
              <span className="w-[38%] max-w-5 rounded-t-[4px]" style={{ height: `${(d.omzet / max) * 100}%`, background: IN }} />
              <span className="w-[38%] max-w-5 rounded-t-[4px]" style={{ height: `${(d.kosten / max) * 100}%`, background: OUT }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[6px] text-[11px]" aria-hidden="true">
          {data.map((d) => (
            <span key={d.maand} className={cn('flex-1 text-center', muted)}>
              {label(d.maand)}
            </span>
          ))}
        </div>
        {hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 rounded-xl bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: `min(calc(${((hover + 0.5) / data.length) * 100}% + 8px), calc(100% - 170px))` }}
          >
            <div className="font-bold">{label(data[hover].maand)}</div>
            <div>Omzet: {eur(data[hover].omzet)}</div>
            <div>Kosten: {eur(data[hover].kosten)}</div>
            <div className="font-semibold">Over: {eur(data[hover].over)}</div>
          </div>
        )}
      </div>
      <details className="text-sm">
        <summary className={cn('cursor-pointer text-xs', muted)}>Als tabel</summary>
        <table className="mt-2 w-full border-collapse text-left">
          <thead>
            <tr className={cn('text-xs', muted)}>
              <th className="py-1">Maand</th>
              <th className="py-1 text-right">Omzet</th>
              <th className="py-1 text-right">Kosten</th>
              <th className="py-1 text-right">Over</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.maand} className="border-t border-[#E6DFD2]">
                <td className="py-1">{label(d.maand)}</td>
                <td className="py-1 text-right tabular-nums">{eur(d.omzet)}</td>
                <td className="py-1 text-right tabular-nums">{eur(d.kosten)}</td>
                <td className="py-1 text-right tabular-nums">{eur(d.over)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

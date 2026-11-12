'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { navTargetsAction } from '@/app/admin/nav-actions'
import { searchTargets, type NavTarget } from '@/lib/admin/nav/targets'
import { muted } from './ui'
import { cn } from '@/utilities/ui'

/** Gedeelde cache van de doelen (ook gebruikt door de chatbalk). */
let cache: { at: number; data: NavTarget[] } | null = null
export async function loadNavTargets(force = false) {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.data
  const res = await navTargetsAction()
  if (!res.ok) throw new Error(res.error)
  cache = { at: Date.now(), data: res.data }
  return res.data
}

/** Open het venster (eventueel met een zoekterm), bv. vanuit de chatbalk. */
export function openGoto(query = '') {
  window.dispatchEvent(new CustomEvent('ikr:goto', { detail: query }))
}

/** "Ga naar …" (Ctrl/Cmd + K): spring naar een pagina, klant, productie, lead, weekly of SOP. */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [targets, setTargets] = useState<NavTarget[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sel, setSel] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const show = (query: string) => {
      setQ(query)
      setSel(0)
      setOpen(true)
      loadNavTargets(true).then(setTargets, (e: Error) => setError(e.message))
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        show('')
      } else if (e.key === 'Escape') setOpen(false)
    }
    const onGoto = (e: Event) => show(String((e as CustomEvent).detail ?? ''))
    window.addEventListener('keydown', onKey)
    window.addEventListener('ikr:goto', onGoto)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('ikr:goto', onGoto)
    }
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const hits = useMemo(() => (q.trim() ? searchTargets(targets, q, 10) : targets.filter((t) => t.kind === 'pagina')), [targets, q])
  const go = (t: NavTarget | undefined) => {
    if (!t) return
    setOpen(false)
    router.push(t.href)
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#1E1530]/50 px-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Ga naar" className="w-full max-w-xl overflow-hidden rounded-2xl bg-ikr-cream-light shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel((s) => Math.min(s + 1, hits.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel((s) => Math.max(s - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              go(hits[sel])
            }
          }}
          placeholder="Ga naar… (klant, pagina, lead, SOP)"
          aria-label="Ga naar"
          className="w-full border-0 border-b border-[#E6DFD2] bg-transparent px-5 py-4 text-lg text-ikr-navy outline-none placeholder:text-[#8A8296]"
        />
        <ul role="listbox" aria-label="Resultaten" className="m-0 max-h-[50vh] list-none overflow-y-auto p-2">
          {error && <li className="px-3 py-2 text-sm text-[#A3470F]">{error}</li>}
          {!error && !hits.length && <li className={cn('px-3 py-2 text-sm', muted)}>{targets.length ? 'Niets gevonden.' : 'Laden…'}</li>}
          {hits.map((t, i) => (
            <li key={t.href} role="option" aria-selected={i === sel}>
              <button
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => go(t)}
                className={cn('flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left', i === sel && 'bg-ikr-cream')}
              >
                <span className="truncate font-semibold">{t.label}</span>
                <span className={cn('shrink-0 text-xs', muted)}>{t.sub}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className={cn('m-0 border-t border-[#E6DFD2] px-5 py-2 text-xs', muted)}>↑↓ kiezen · Enter openen · Esc sluiten · ook in de chat: &quot;ga naar …&quot; of &quot;zet de pagina van … open&quot;</p>
      </div>
    </div>
  )
}

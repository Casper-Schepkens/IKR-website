'use client'

// TEMP: remove ColorTweaker before shipping palette
// Delete this file and its import in src/app/layout.tsx

import { useEffect, useState } from 'react'

type PaletteKey = 'cream' | 'cyan' | 'navy'

const DEFAULTS: Record<PaletteKey, string> = {
  cream: '#F0ECCD',
  cyan: '#B192EC',
  navy: '#201737',
}

const LABELS: Record<PaletteKey, string> = {
  cream: 'Eggshell bg',
  cyan: 'Purple accent',
  navy: 'Navy',
}

const CSS_VARS: Record<PaletteKey, string[]> = {
  cream: ['--ikr-cream', '--color-ikr-cream'],
  cyan: ['--ikr-cyan', '--color-ikr-cyan'],
  navy: ['--ikr-navy', '--color-ikr-navy', '--ikr-navy-text', '--color-ikr-navy-text'],
}

const STORAGE_KEY = 'ikr-temp-color-tweaks'

function normalizeHex(value: string): string | null {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) return null
  return withHash.toUpperCase()
}

function applyPalette(palette: Record<PaletteKey, string>) {
  const root = document.documentElement
  for (const key of Object.keys(CSS_VARS) as PaletteKey[]) {
    for (const cssVar of CSS_VARS[key]) {
      root.style.setProperty(cssVar, palette[key])
    }
  }
}

function readStored(): Record<PaletteKey, string> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Record<PaletteKey, string>>
    const next = { ...DEFAULTS }
    for (const key of Object.keys(DEFAULTS) as PaletteKey[]) {
      const normalized = parsed[key] ? normalizeHex(parsed[key]!) : null
      if (normalized) next[key] = normalized
    }
    return next
  } catch {
    return null
  }
}

export function ColorTweaker() {
  const [palette, setPalette] = useState<Record<PaletteKey, string>>(DEFAULTS)
  const [hexDrafts, setHexDrafts] = useState<Record<PaletteKey, string>>(DEFAULTS)
  const [collapsed, setCollapsed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = readStored()
    const initial = stored ?? DEFAULTS
    setPalette(initial)
    setHexDrafts(initial)
    applyPalette(initial)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    applyPalette(palette)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(palette))
    } catch {
      // ignore quota / private mode
    }
  }, [palette, ready])

  function setColor(key: PaletteKey, value: string) {
    const normalized = normalizeHex(value)
    if (!normalized) return
    setPalette((prev) => ({ ...prev, [key]: normalized }))
    setHexDrafts((prev) => ({ ...prev, [key]: normalized }))
  }

  function reset() {
    setPalette(DEFAULTS)
    setHexDrafts(DEFAULTS)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 99999,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
        color: '#111',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.96)',
          border: '1px solid #111',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          minWidth: collapsed ? undefined : 220,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '8px 10px',
            background: '#111',
            color: '#fff',
          }}
        >
          <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>TEMP / DEV colors</span>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            style={{
              border: '1px solid #fff',
              background: 'transparent',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 10,
            }}
          >
            {collapsed ? 'Open' : 'Hide'}
          </button>
        </div>

        {!collapsed && (
          <div style={{ padding: 10, display: 'grid', gap: 8 }}>
            {(Object.keys(DEFAULTS) as PaletteKey[]).map((key) => (
              <label
                key={key}
                style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'center' }}
              >
                <span style={{ gridColumn: '1 / -1', fontWeight: 600 }}>{LABELS[key]}</span>
                <input
                  type="text"
                  value={hexDrafts[key]}
                  onChange={(e) => {
                    const next = e.target.value
                    setHexDrafts((prev) => ({ ...prev, [key]: next }))
                    const normalized = normalizeHex(next)
                    if (normalized) setColor(key, normalized)
                  }}
                  onBlur={() => {
                    const normalized = normalizeHex(hexDrafts[key])
                    if (normalized) setColor(key, normalized)
                    else setHexDrafts((prev) => ({ ...prev, [key]: palette[key] }))
                  }}
                  spellCheck={false}
                  aria-label={`${LABELS[key]} hex`}
                  style={{
                    width: '100%',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    padding: '4px 6px',
                    fontFamily: 'inherit',
                    fontSize: 11,
                  }}
                />
                <input
                  type="color"
                  value={palette[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  aria-label={`${LABELS[key]} picker`}
                  style={{
                    width: 36,
                    height: 28,
                    padding: 0,
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                />
              </label>
            ))}

            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 2,
                border: '1px solid #111',
                background: '#f5f5f5',
                borderRadius: 4,
                padding: '6px 8px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Reset to Milan defaults
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

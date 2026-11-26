'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'

/**
 * /boek: kalender → tijden → formulier → bevestiging. Toont enkel "IKnowRight", nooit wie de call doet.
 * Alle tijden in Brusselse tijd, ook als de bezoeker in een andere tijdzone zit.
 */

type SlotsResponse = { callType: { name: string; minutes: number }; first: string; last: string; days: { day: string; starts: string[] }[] }
type Step = 'datum' | 'gegevens' | 'klaar'

const TZ = 'Europe/Brussels'
const timeFmt = new Intl.DateTimeFormat('nl-BE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const longDay = (day: string) => new Intl.DateTimeFormat('nl-BE', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day}T12:00:00Z`))
const monthName = (y: number, m: number) => new Intl.DateTimeFormat('nl-BE', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m, 1)))
const brusselsDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const pad = (n: number) => String(n).padStart(2, '0')
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

async function fetchSlots(): Promise<{ ok: true; data: SlotsResponse } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/boek', { cache: 'no-store' })
    const json = (await res.json()) as SlotsResponse & { error?: string }
    if (!res.ok) return { ok: false, error: json.error ?? 'Laden mislukt.' }
    return { ok: true, data: json }
  } catch {
    return { ok: false, error: 'De beschikbare momenten konden niet geladen worden. Controleer je verbinding.' }
  }
}

function monthGrid(y: number, m: number) {
  const first = new Date(Date.UTC(y, m, 1))
  const offset = (first.getUTCDay() + 6) % 7 // maandag eerst
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const cells: (string | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= days; d++) cells.push(`${y}-${pad(m + 1)}-${pad(d)}`)
  while (cells.length % 7) cells.push(null)
  return cells
}

const card: React.CSSProperties = { backgroundColor: '#FEFEFE', borderRadius: 30, padding: 'clamp(20px, 2.5vw, 36px)' }
const fieldStyle: React.CSSProperties = {
  ...bodyFont,
  width: '100%',
  fontSize: 16,
  color: ikr.navyText,
  backgroundColor: '#E8E3D9',
  border: 'none',
  borderRadius: 16,
  padding: '14px 18px',
  outline: 'none',
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <li className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{ backgroundColor: active || done ? ikr.navy : '#D9D3C4', color: active || done ? '#FEFEFE' : ikr.navyText }}
      >
        {done ? '✓' : n}
      </span>
      <span className="text-sm font-semibold" style={{ ...bodyFont, fontWeight: 600, color: active ? ikr.navyText : '#6B6380' }}>
        {label}
      </span>
    </li>
  )
}

export function BookingPageContent() {
  const [data, setData] = useState<SlotsResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [start, setStart] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('datum')
  const [month, setMonth] = useState<{ y: number; m: number } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', website: '' })
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<{ start: string; end: string; callName: string } | null>(null)

  const apply = useCallback((r: { ok: true; data: SlotsResponse } | { ok: false; error: string }, keepDay?: string | null) => {
    if (!r.ok) return setLoadError(r.error)
    const json = r.data
    setLoadError(null)
    setData(json)
    const days = new Set(json.days.map((d) => d.day))
    const nextDay = keepDay && days.has(keepDay) ? keepDay : (json.days[0]?.day ?? null)
    setDay(nextDay)
    const base = nextDay ?? json.first
    setMonth((m) => m ?? { y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 })
  }, [])
  const load = useCallback(async (keepDay?: string | null) => apply(await fetchSlots(), keepDay), [apply])

  useEffect(() => {
    let alive = true
    fetchSlots().then((r) => alive && apply(r))
    return () => {
      alive = false
    }
  }, [apply])

  const available = useMemo(() => new Map((data?.days ?? []).map((d) => [d.day, d.starts])), [data])
  const times = day ? (available.get(day) ?? []) : []
  const months = useMemo(() => {
    if (!data) return []
    const a = { y: Number(data.first.slice(0, 4)), m: Number(data.first.slice(5, 7)) - 1 }
    const b = { y: Number(data.last.slice(0, 4)), m: Number(data.last.slice(5, 7)) - 1 }
    const out = [a]
    if (a.y !== b.y || a.m !== b.m) out.push(b)
    return out
  }, [data])
  const monthIdx = month ? months.findIndex((x) => x.y === month.y && x.m === month.m) : 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!start) return
    setError(null)
    if (form.name.trim().length < 2) return setError('Vul je naam in.')
    if (!isEmail(form.email)) return setError('Vul een geldig e-mailadres in.')
    if (!form.company.trim()) return setError('Vul je bedrijf in.')
    if (form.phone.replace(/\D/g, '').length < 8) return setError('Vul een geldig telefoonnummer in.')
    setSending(true)
    try {
      const res = await fetch('/api/boek', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, start }) })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; code?: string; start?: string; end?: string; callName?: string }
      if (res.ok && json.ok) {
        setDone({ start: json.start!, end: json.end!, callName: json.callName ?? 'call' })
        setStep('klaar')
        return
      }
      if (json.code === 'taken') {
        // Iemand was net sneller: terug naar de tijden, met verse beschikbaarheid.
        setNotice(json.error ?? 'Dit moment is net weggekocht, kies een ander.')
        setStart(null)
        setStep('datum')
        await load(day)
        return
      }
      setError(json.error ?? 'Er ging iets mis. Probeer later opnieuw.')
    } catch {
      setError('Geen verbinding. Probeer opnieuw.')
    } finally {
      setSending(false)
    }
  }

  const minutes = data?.callType.minutes ?? 45
  const callName = data?.callType.name ?? 'Kennismakingscall'

  return (
    <section style={{ backgroundColor: ikr.cream, paddingTop: 80 }}>
      <div className="mx-auto max-w-[1240px]" style={{ padding: 'clamp(2rem, 5vw, 72px) clamp(1rem, 5vw, 72px) clamp(3rem, 7vw, 110px)' }}>
        <header className="mb-8 md:mb-12">
          <p className="m-0 mb-3 text-sm uppercase tracking-wide" style={{ ...bodyFont, fontWeight: 700, color: ikr.navyText, letterSpacing: '0.04em' }}>
            {callName} · {minutes} min · Google Meet
          </p>
          <h1 className="m-0" style={{ ...displayFont, fontSize: 'clamp(2.2rem, 6vw, 84px)', lineHeight: 0.95, textTransform: 'uppercase', color: ikr.cyan }}>
            Plan je call
          </h1>
          <p className="m-0" style={{ ...displayFont, fontSize: 'clamp(2.2rem, 6vw, 84px)', lineHeight: 0.95, textTransform: 'uppercase', color: ikr.navy }}>
            met IKnowRight
          </p>
          <p className="mt-5 max-w-[620px]" style={{ ...bodyFont, fontSize: 'clamp(1rem, 1.3vw, 19px)', color: ikr.navyText }}>
            Kies een moment dat jou past. We leren je bedrijf kennen en kijken samen wat TikTok voor jou kan betekenen. Je krijgt meteen een uitnodiging met de
            Google Meet-link.
          </p>
        </header>

        {step !== 'klaar' && (
          <ol className="m-0 mb-5 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
            <StepDot n={1} label="Kies een dag" active={step === 'datum' && !start} done={Boolean(day && (start || step !== 'datum'))} />
            <StepDot n={2} label="Kies een uur" active={step === 'datum' && Boolean(day)} done={step === 'gegevens'} />
            <StepDot n={3} label="Jouw gegevens" active={step === 'gegevens'} done={false} />
          </ol>
        )}

        {notice && step === 'datum' && (
          <p role="alert" className="mb-5 rounded-2xl px-5 py-4" style={{ ...bodyFont, fontWeight: 600, backgroundColor: '#FDE8D7', color: '#8A3B12' }}>
            {notice}
          </p>
        )}

        {step === 'klaar' && done ? (
          <div style={card} className="max-w-[720px]">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: ikr.cyan, color: ikr.navy }} aria-hidden>
              ✓
            </div>
            <h2 className="m-0" style={{ ...displayFont, fontSize: 'clamp(1.8rem, 3.6vw, 48px)', lineHeight: 1, textTransform: 'uppercase', color: ikr.navy }}>
              Je call staat vast!
            </h2>
            <p className="mt-4 mb-2" style={{ ...bodyFont, fontSize: 18, fontWeight: 700, color: ikr.navyText }}>
              {longDay(brusselsDay(done.start))}, {timeFmt.format(new Date(done.start))} – {timeFmt.format(new Date(done.end))}
            </p>
            <p className="m-0" style={{ ...bodyFont, fontSize: 16, color: ikr.navyText }}>
              Je krijgt zo een agenda-uitnodiging met de Google Meet-link en een bevestigingsmail op <strong>{form.email.trim()}</strong>. Tot dan!
            </p>
          </div>
        ) : loadError ? (
          <div style={card}>
            <p role="alert" className="m-0 mb-4" style={{ ...bodyFont, color: '#B42318' }}>
              {loadError}
            </p>
            <button type="button" onClick={() => void load()} className="rounded-full px-5 py-3 font-bold" style={{ ...bodyFont, fontWeight: 700, backgroundColor: ikr.navy, color: '#FEFEFE', border: 'none', cursor: 'pointer' }}>
              Opnieuw proberen
            </button>
          </div>
        ) : !data ? (
          <div style={card} className="animate-pulse" aria-busy="true">
            <p className="m-0" style={{ ...bodyFont, color: '#6B6380' }}>
              Beschikbare momenten laden…
            </p>
          </div>
        ) : !data.days.length ? (
          <div style={card}>
            <p className="m-0" style={{ ...bodyFont, fontSize: 18, color: ikr.navyText }}>
              Er zijn de komende weken geen vrije momenten meer. Mail ons op{' '}
              <a href="mailto:contact@iknowright.be" style={{ color: ikr.navy, fontWeight: 700 }}>
                contact@iknowright.be
              </a>{' '}
              en we zoeken samen een moment.
            </p>
          </div>
        ) : step === 'datum' ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            {/* Kalender */}
            <div style={card}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="m-0 capitalize" style={{ ...displayFont, fontSize: 'clamp(1.4rem, 2.4vw, 32px)', color: ikr.navy, textTransform: 'uppercase' }}>
                  {month ? monthName(month.y, month.m) : ''}
                </h2>
                {months.length > 1 && (
                  <div className="flex gap-2">
                    {[-1, 1].map((dir) => {
                      const target = months[monthIdx + dir]
                      return (
                        <button
                          key={dir}
                          type="button"
                          disabled={!target}
                          onClick={() => target && setMonth(target)}
                          aria-label={dir < 0 ? 'Vorige maand' : 'Volgende maand'}
                          className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30"
                          style={{ backgroundColor: '#E8E3D9', color: ikr.navy, border: 'none', cursor: target ? 'pointer' : 'default', fontSize: 18 }}
                        >
                          {dir < 0 ? '‹' : '›'}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2" role="grid" aria-label="Kies een dag">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="pb-1 text-center text-xs font-bold uppercase" style={{ ...bodyFont, fontWeight: 700, color: '#6B6380' }}>
                    {w}
                  </div>
                ))}
                {month &&
                  monthGrid(month.y, month.m).map((d, i) => {
                    if (!d) return <div key={`e${i}`} />
                    const free = available.has(d)
                    const selected = d === day
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={!free}
                        onClick={() => {
                          setDay(d)
                          setStart(null)
                          setNotice(null)
                        }}
                        aria-pressed={selected}
                        aria-label={`${longDay(d)}${free ? '' : ', geen vrije momenten'}`}
                        className="relative flex aspect-square items-center justify-center rounded-2xl lg:aspect-auto lg:h-14 text-[15px] transition-colors sm:text-base"
                        style={{
                          ...bodyFont,
                          fontWeight: free ? 700 : 400,
                          border: 'none',
                          cursor: free ? 'pointer' : 'default',
                          backgroundColor: selected ? ikr.navy : free ? '#E2F7FB' : 'transparent',
                          color: selected ? '#FEFEFE' : free ? ikr.navyText : '#B4AEC0',
                        }}
                      >
                        {Number(d.slice(8))}
                        {free && !selected && <span className="absolute bottom-[18%] h-1 w-1 rounded-full" style={{ backgroundColor: ikr.cyan }} aria-hidden />}
                      </button>
                    )
                  })}
              </div>
              <p className="mt-4 mb-0 text-sm" style={{ ...bodyFont, color: '#6B6380' }}>
                Alle tijden in Belgische tijd.
              </p>
            </div>

            {/* Tijden */}
            <div style={card}>
              <h2 className="m-0 mb-4 capitalize" style={{ ...displayFont, fontSize: 'clamp(1.4rem, 2.4vw, 32px)', color: ikr.navy, textTransform: 'uppercase' }}>
                {day ? longDay(day) : 'Kies een dag'}
              </h2>
              {day && (
                <div className="grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-3">
                  {times.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setStart(t)
                        setNotice(null)
                        setError(null)
                        setStep('gegevens')
                      }}
                      className="rounded-2xl py-3 text-base transition-transform hover:-translate-y-0.5"
                      style={{ ...bodyFont, fontWeight: 700, border: `2px solid ${ikr.navy}`, backgroundColor: '#FEFEFE', color: ikr.navy, cursor: 'pointer' }}
                    >
                      {timeFmt.format(new Date(t))}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          start && (
            <form onSubmit={submit} noValidate style={card} className="max-w-[760px]">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4" style={{ backgroundColor: ikr.navy, color: '#FEFEFE' }}>
                <div>
                  <p className="m-0 text-sm" style={{ ...bodyFont, color: 'rgba(255,255,255,0.7)' }}>
                    {callName} met IKnowRight · {minutes} min
                  </p>
                  <p className="m-0 capitalize" style={{ ...bodyFont, fontWeight: 700, fontSize: 18 }}>
                    {longDay(brusselsDay(start))}, {timeFmt.format(new Date(start))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('datum')
                    setStart(null)
                  }}
                  className="rounded-full px-4 py-2 text-sm"
                  style={{ ...bodyFont, fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.12)', color: '#FEFEFE', border: 'none', cursor: 'pointer' }}
                >
                  Ander moment
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['name', 'Naam', 'text', 'name'],
                    ['email', 'E-mail', 'email', 'email'],
                    ['company', 'Bedrijf', 'text', 'organization'],
                    ['phone', 'Telefoon', 'tel', 'tel'],
                  ] as const
                ).map(([key, label, type, auto]) => (
                  <label key={key} className="flex flex-col gap-1.5" style={{ ...bodyFont, fontWeight: 600, fontSize: 14, color: ikr.navyText }}>
                    {label}
                    <input
                      type={type}
                      name={key}
                      autoComplete={auto}
                      required
                      maxLength={key === 'phone' ? 40 : 160}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      style={fieldStyle}
                    />
                  </label>
                ))}
              </div>
              {/* Honeypot: onzichtbaar voor mensen, bots vullen het in. */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                <label>
                  Website
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
                </label>
              </div>
              {error && (
                <p role="alert" className="mt-4 mb-0" style={{ ...bodyFont, color: '#B42318', fontWeight: 600 }}>
                  {error}
                </p>
              )}
              <div className="mt-6 flex justify-stretch sm:justify-end">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full justify-center sm:w-auto"
                  style={{
                    ...displayFont,
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 'clamp(1.1rem, 1.8vw, 26px)',
                    color: '#FEFEFE',
                    backgroundColor: ikr.navy,
                    border: 'none',
                    borderRadius: 48,
                    padding: '0.55em 1.4em',
                    cursor: sending ? 'wait' : 'pointer',
                    opacity: sending ? 0.7 : 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {sending ? 'Even geduld…' : 'Bevestig mijn call'}
                </button>
              </div>
              <p className="mt-4 mb-0 text-xs" style={{ ...bodyFont, color: '#6B6380' }}>
                We gebruiken je gegevens enkel om deze call in te plannen en op te volgen. Zie ons{' '}
                <a href="/privacy" style={{ color: ikr.navy }}>
                  privacybeleid
                </a>
                .
              </p>
            </form>
          )
        )}
      </div>
    </section>
  )
}

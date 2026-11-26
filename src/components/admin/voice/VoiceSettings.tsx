import { FormAction } from '@/components/admin/FormAction'
import { Card, input, label, muted, Title } from '@/components/admin/ui'
import { cn } from '@/utilities/ui'
import { saveVoiceSettingsAction } from '@/app/admin/spraak-actions'
import { isVoiceConfigured, realtimeModel, VOICES, voiceStats } from '@/lib/admin/voice/store'
import { COST_LABELS } from '@/lib/admin/voice/pricing'

const eur = (v: number) => `€${v.toFixed(2).replace('.', ',')}`
const mins = (m: number) => (m < 1 ? '<1 min' : `${Math.round(m)} min`)
const when = (iso: string) => new Date(iso).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const th = 'py-1.5 pr-3 text-left text-xs font-semibold text-adm-muted'
const td = 'border-t border-adm-line py-1.5 pr-3'

/** Spraakbot in Instellingen: daglimiet, stem en wie wat gebruikt (en waar de kost vandaan komt). */
export async function VoiceSettings() {
  if (!isVoiceConfigured()) {
    return (
      <Card className="flex flex-col gap-1">
        <Title className="m-0 text-2xl">Spraakbot</Title>
        <p className={cn('m-0 text-sm', muted)}>Nog niet ingesteld: zet OPENAI_API_KEY in Vercel om live te praten met het dashboard.</p>
      </Card>
    )
  }
  const s = await voiceStats()
  const { settings } = s
  const pct = settings.daily_limit_eur > 0 ? Math.min(100, (s.todayEur / settings.daily_limit_eur) * 100) : 100
  const maxDay = Math.max(...s.days.map((d) => d.eur), 0.01)
  const partsTotal = s.parts.reduce((a, p) => a + p.eur, 0)

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <Title className="m-0 text-2xl">Spraakbot</Title>
        <p className={cn('m-0 text-sm', muted)}>
          Live praten met het dashboard (microfoon naast de verstuurknop). Model: {realtimeModel()}. De daglimiet geldt voor het hele team samen.
        </p>
      </div>

      <section aria-label="Vandaag" className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold">Vandaag</span>
          <span className="font-display text-3xl font-black">{eur(s.todayEur)}</span>
          <span className={cn('text-sm', muted)}>van {eur(settings.daily_limit_eur)}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-adm-soft" role="meter" aria-valuemin={0} aria-valuemax={settings.daily_limit_eur} aria-valuenow={Number(s.todayEur.toFixed(2))} aria-label="Verbruik van de daglimiet">
          <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-[#C8371D]' : pct >= 80 ? 'bg-[#E0A100]' : 'bg-adm-fg')} style={{ width: `${pct}%` }} />
        </div>
        {pct >= 100 && <p className="m-0 text-sm font-semibold text-adm-warn">Daglimiet bereikt: de microfoon staat uit tot morgen (of verhoog de limiet).</p>}
      </section>

      <FormAction action={saveVoiceSettingsAction} submitLabel="Opslaan" submitVariant="soft" className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>
            Daglimiet (€, hele team)
            <input name="daily_limit_eur" type="number" min={0} max={1000} step="0.5" defaultValue={settings.daily_limit_eur} className={input} />
          </label>
          <label className={label}>
            Stem
            <select name="voice" defaultValue={settings.voice} className={input}>
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} · {v.note}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Koers $ → €
            <input name="usd_to_eur" type="number" min={0.1} max={4.99} step="0.01" defaultValue={settings.usd_to_eur} className={input} />
          </label>
        </div>
        <p className={cn('m-0 text-xs', muted)}>
          Een nieuwe stem geldt vanaf het volgende gesprek. OpenAI rekent in dollar; de koers zet het om naar euro.
          {settings.updated_by ? ` Laatst aangepast door ${settings.updated_by.split('@')[0]}${settings.updated_at ? ` op ${when(settings.updated_at)}` : ''}.` : ''}
        </p>
      </FormAction>

      <section aria-label="Deze maand" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold">Deze maand</span>
          <span className="font-display text-2xl font-black">{eur(s.monthEur)}</span>
          {s.grokbot > 0 && <span className={cn('text-sm', muted)}>· {s.grokbot}× doorgegeven aan Grok Bot</span>}
        </div>
        <div className="flex h-20 items-end gap-[2px]" aria-hidden="true">
          {s.days.map((d) => (
            <div key={d.day} title={`${d.day.slice(8)}/${d.day.slice(5, 7)}: ${eur(d.eur)}`} className="flex h-full min-w-0 flex-1 items-end">
              <div className={cn('w-full rounded-t-[4px]', d.eur > 0 ? 'bg-adm-fg' : 'bg-adm-soft')} style={{ height: `${d.eur > 0 ? Math.max(4, (d.eur / maxDay) * 100) : 4}%` }} />
            </div>
          ))}
        </div>
        <div className={cn('flex justify-between text-[11px]', muted)} aria-hidden="true">
          <span>1</span>
          <span>{Number(s.days.at(-1)?.day.slice(8) ?? 1)}</span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-label="Per persoon" className="overflow-x-auto">
          <h3 className="m-0 mb-1 text-sm font-semibold">Wie gebruikt het (deze maand)</h3>
          {s.people.length ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>Wie</th>
                  <th className={th}>Gesprekken</th>
                  <th className={th}>Tijd</th>
                  <th className={th}>Antwoorden</th>
                  <th className={cn(th, 'text-right')}>Kost</th>
                </tr>
              </thead>
              <tbody>
                {s.people.map((p) => (
                  <tr key={p.email}>
                    <td className={cn(td, 'font-semibold')}>{p.name}</td>
                    <td className={td}>{p.sessions}</td>
                    <td className={td}>{mins(p.minutes)}</td>
                    <td className={td}>{p.answers}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{eur(p.eur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={cn('m-0 text-sm', muted)}>Nog niemand gebruikte de spraakbot deze maand.</p>
          )}
        </section>

        <section aria-label="Waar de kost vandaan komt">
          <h3 className="m-0 mb-1 text-sm font-semibold">Waar de kost vandaan komt</h3>
          {s.parts.length ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
              {s.parts.map((p) => (
                <li key={p.key} className="flex flex-col gap-0.5">
                  <span className="flex justify-between">
                    <span>{COST_LABELS[p.key]}</span>
                    <span className="tabular-nums">
                      {eur(p.eur)} <span className={muted}>({Math.round((p.eur / partsTotal) * 100)}%)</span>
                    </span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-adm-soft" aria-hidden="true">
                    <span className="block h-full rounded-full bg-adm-fg" style={{ width: `${(p.eur / partsTotal) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={cn('m-0 text-sm', muted)}>Nog geen verbruik.</p>
          )}
        </section>
      </div>

      <section aria-label="Taken" className="overflow-x-auto">
        <h3 className="m-0 mb-1 text-sm font-semibold">Welke taken (deze maand)</h3>
        {s.tools.length ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>Tool</th>
                <th className={th}>Keer</th>
                <th className={th}>Soort</th>
                <th className={th}>Bevestigd / geannuleerd</th>
                <th className={th}>Mislukt</th>
              </tr>
            </thead>
            <tbody>
              {s.tools.slice(0, 20).map((t) => (
                <tr key={t.tool}>
                  <td className={cn(td, 'font-mono text-[13px]')}>{t.tool}</td>
                  <td className={td}>{t.count}</td>
                  <td className={td}>{t.writes ? 'wijzigt' : 'leest'}</td>
                  <td className={td}>{t.writes && t.tool !== 'grokbot_vragen' ? `${t.confirmed} / ${t.cancelled}` : '—'}</td>
                  <td className={td}>{t.failed || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={cn('m-0 text-sm', muted)}>Nog geen tools gebruikt.</p>
        )}
      </section>

      <section aria-label="Laatste gesprekken" className="overflow-x-auto">
        <h3 className="m-0 mb-1 text-sm font-semibold">Laatste gesprekken</h3>
        {s.recent.length ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>Wanneer</th>
                <th className={th}>Wie</th>
                <th className={th}>Duur</th>
                <th className={th}>Antwoorden</th>
                <th className={th}>Tools</th>
                <th className={cn(th, 'text-right')}>Kost</th>
              </tr>
            </thead>
            <tbody>
              {s.recent.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{when(r.started_at)}</td>
                  <td className={cn(td, 'font-semibold')}>{r.name}</td>
                  <td className={td}>{mins(r.minutes)}</td>
                  <td className={td}>{r.answers}</td>
                  <td className={td}>{r.tools}</td>
                  <td className={cn(td, 'text-right tabular-nums')}>{eur(r.eur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={cn('m-0 text-sm', muted)}>Nog geen gesprekken.</p>
        )}
        <p className={cn('m-0 mt-1 text-xs', muted)}>Het afschrift van elk gesprek staat in de Grok Bot-chat van wie praatte (met 🎙).</p>
      </section>
    </Card>
  )
}

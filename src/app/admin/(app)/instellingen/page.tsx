import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/admin/session'
import { AI_MODEL, extraAdminEmails, integrationStatus, isAiConfigured } from '@/lib/admin/env'
import { FormAction } from '@/components/admin/FormAction'
import { Icon, Card, Empty, input, label, muted, PageHeader, Pill, Title } from '@/components/admin/ui'
import { uploadTemplateAction } from '../../actions'
import { cn } from '@/utilities/ui'
import { ApiCosts } from './ApiCosts'

export const metadata = { title: 'Instellingen' }

export default async function SettingsPage() {
  const host = (await headers()).get('host') ?? 'iknowright.be'
  const mcpUrl = `${host.startsWith('localhost') ? 'http' : 'https'}://${host}/api/mcp`
  const aiApi = isAiConfigured()
  const { repo, mode, user } = await requireAdmin()
  const now = new Date()
  // Vanaf de 1e van vorige maand: genoeg voor 'deze maand', 'vorige maand' en 'laatste 30 dagen'.
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1) - 2 * 3_600_000)
  const [templates, integrations, runs, clients] = await Promise.all([
    repo.listTemplates(),
    Promise.resolve(integrationStatus()),
    repo.listAiRuns(since.toISOString()),
    repo.listClients(),
  ])

  return (
    <>
      <PageHeader eyebrow={`Ingelogd als ${user.email}`} title="Instellingen" />

      <Card className="flex flex-col gap-1">
        <Title className="m-0 mb-2 text-2xl">Koppelingen</Title>
        {integrations.map((i) => (
          <div
            key={i.key}
            className="flex flex-wrap items-center gap-3 border-t border-[#E6DFD2] py-3.5"
          >
            <div className="flex flex-[1_1_260px] flex-col">
              <span className="font-semibold">{i.label}</span>
              <span className={cn('font-mono text-xs', muted)}>{i.vars.join(' · ')}</span>
            </div>
            <Pill tone={i.ok ? 'green' : 'orange'}>{i.ok ? 'Actief' : 'Nog in te stellen'}</Pill>
          </div>
        ))}
        <p className={cn('m-0 pt-3 text-sm', muted)}>
          Variabelen stel je in via Vercel → Project → Settings → Environment Variables. Model voor
          AI-taken: <code>{AI_MODEL}</code>
          {mode === 'demo' ? ' · draait nu in demomodus.' : '.'}
        </p>
      </Card>

      <ApiCosts runs={runs} clients={clients} now={now} />

      <Card dark className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Icon.sparkle className="text-ikr-cyan" />
          <Title className="m-0 text-2xl">Claude-connector</Title>
        </div>
        <p className="m-0 text-[15px] text-[#E7E2F0]">
          Werk met IKR Admin vanuit Claude, op je eigen Claude-abonnement (geen API-credits). Claude
          leest dossiers en zet ideeën, notities, afspraken en draaiboeken rechtstreeks in het
          dashboard.
        </p>
        <ol className="m-0 flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-[#E7E2F0]">
          <li>
            Ga in Claude naar <strong className="text-ikr-cream-light">Settings → Connectors → Add custom connector</strong>.
          </li>
          <li>
            Naam: <strong className="text-ikr-cream-light">IKR Admin</strong> · URL:{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-ikr-cyan">{mcpUrl}</code>
          </li>
          <li>Klik op Connect, log in met je @iknowright.be-account en klik op Toestaan.</li>
          <li>Vraag bv.: “Maak 5 nieuwe ideeën voor Wasbar via IKR Admin”.</li>
        </ol>
        <p className="m-0 text-xs text-[#B9B2C9]">
          {aiApi
            ? 'Er staat ook een Claude API-sleutel: de AI-knoppen in het dashboard werken rechtstreeks.'
            : 'Zonder API-sleutel openen de AI-knoppen in het dashboard Claude met de juiste vraag.'}
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <Title className="m-0 text-2xl">Toegang</Title>
        <p className="m-0 text-sm">
          Iedereen met een <strong>@iknowright.be</strong>-account kan inloggen met Google.
          {extraAdminEmails().length
            ? ` Extra adressen: ${extraAdminEmails().join(', ')}.`
            : ''}{' '}
          Andere adressen voeg je toe via <code>IKR_ADMIN_EMAILS</code> én de tabel{' '}
          <code>admin_users</code> in Supabase.
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <Title className="m-0 text-2xl">Presentatie-templates</Title>
        <p className={cn('m-0 text-sm', muted)}>
          Upload jullie bestaande .pptx-templates. Tip: zet plaatshouders zoals{' '}
          <code>{'{{klant}}'}</code> of <code>{'{{idee_titel}}'}</code> in de slides en duid de
          ideeslide aan in de notities, dan houdt Claude de lay-out exact aan.
        </p>
        {!templates.length && <Empty>Nog geen templates.</Empty>}
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center gap-3 border-t border-[#E6DFD2] py-3 text-sm"
          >
            <span className="flex-[1_1_240px] font-semibold">
              {t.name}
              {t.description ? (
                <span className={cn('block font-normal', muted)}>{t.description}</span>
              ) : null}
            </span>
            <Pill tone={t.anthropic_file_id ? 'green' : 'yellow'}>
              {t.anthropic_file_id ? 'Klaar voor AI' : 'Wordt bij eerste gebruik geüpload'}
            </Pill>
          </div>
        ))}
        <FormAction
          action={uploadTemplateAction}
          resetOnSuccess
          submitLabel="Template uploaden"
          pendingText="Uploaden…"
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            <label className={label}>
              Naam
              <input name="name" required placeholder="bv. Content-voorstel v3" className={input} />
            </label>
            <label className={label}>
              Omschrijving
              <input name="description" className={input} />
            </label>
            <label className={label}>
              Bestand (.pptx)
              <input
                name="file"
                type="file"
                accept=".pptx"
                required
                className={cn(input, 'py-2')}
              />
            </label>
          </div>
        </FormAction>
      </Card>
    </>
  )
}

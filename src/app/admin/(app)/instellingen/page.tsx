import { requireAdmin } from '@/lib/admin/session'
import { AI_MODEL, extraAdminEmails, integrationStatus } from '@/lib/admin/env'
import { FormAction } from '@/components/admin/FormAction'
import { Card, Empty, input, label, muted, PageHeader, Pill, Title } from '@/components/admin/ui'
import { uploadTemplateAction } from '../../actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'Instellingen' }

export default async function SettingsPage() {
  const { repo, mode, user } = await requireAdmin()
  const [templates, integrations] = await Promise.all([
    repo.listTemplates(),
    Promise.resolve(integrationStatus()),
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

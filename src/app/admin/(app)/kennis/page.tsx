import { requireAdmin } from '@/lib/admin/session'
import { fmtDate } from '@/lib/admin/format'
import { FormAction } from '@/components/admin/FormAction'
import { Card, Icon, input, label, muted, PageHeader, Title } from '@/components/admin/ui'
import { saveKnowledgeAction } from '../../actions'
import { cn } from '@/utilities/ui'

export const metadata = { title: 'IKR-kennis' }

export default async function KnowledgePage() {
  const { repo } = await requireAdmin()
  const docs = await repo.listKnowledge()
  const filled = docs.filter((d) => d.body.trim() && !d.body.trim().startsWith('[')).length

  return (
    <>
      <PageHeader eyebrow="Het IKR-brein: wat elke AI-taak over jullie weet" title="IKR-kennis" />

      <Card dark className="flex flex-wrap items-center gap-4">
        <Icon.sparkle size={22} className="text-ikr-cyan" />
        <p className="m-0 flex-[1_1_360px] text-[15px] leading-relaxed">
          Deze teksten gaan mee met <strong>elke</strong> AI-taak: ideeën, decks, mails, draaiboeken
          en analyses. Hoe concreter jullie aanpak, toon en lessen hier staan, hoe meer de output
          klinkt als IKR. Tekst tussen [haakjes] is nog in te vullen.
        </p>
        <span className="font-display text-3xl font-black text-ikr-cyan">
          {filled}/{docs.length}
        </span>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-5 max-md:grid-cols-1">
        {docs.map((d) => (
          <Card key={d.slug} className="flex flex-col gap-3">
            <FormAction action={saveKnowledgeAction}>
              <input type="hidden" name="slug" value={d.slug} />
              <label className={label}>
                Titel
                <input
                  name="title"
                  defaultValue={d.title}
                  className={cn(input, 'font-display text-xl font-black uppercase')}
                />
              </label>
              <label className={label}>
                Inhoud
                <textarea
                  name="body"
                  defaultValue={d.body}
                  className={cn(input, 'min-h-48 leading-relaxed')}
                />
              </label>
            </FormAction>
            <span className={cn('text-xs', muted)}>
              Laatst aangepast{' '}
              {fmtDate(d.updated_at, { day: 'numeric', month: 'short', year: 'numeric' })}
              {d.updated_by ? ` door ${d.updated_by}` : ''}
            </span>
          </Card>
        ))}
        <Card className="flex flex-col gap-3">
          <Title className="m-0 text-2xl">Nieuw onderwerp</Title>
          <FormAction action={saveKnowledgeAction} resetOnSuccess submitLabel="Toevoegen">
            <label className={label}>
              Titel
              <input
                name="title"
                required
                placeholder="bv. Lessen uit draaidagen"
                className={input}
              />
            </label>
            <label className={label}>
              Inhoud
              <textarea name="body" className={cn(input, 'min-h-40')} />
            </label>
          </FormAction>
        </Card>
      </div>
    </>
  )
}

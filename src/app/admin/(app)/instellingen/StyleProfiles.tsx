import { getProfiles, STYLE_KEYS, STYLE_LABEL } from '@/lib/admin/ai/style-profile'
import { aiEngine } from '@/lib/admin/ai/jobs'
import { fmtDate } from '@/lib/admin/format'
import { FormAction } from '@/components/admin/FormAction'
import { StyleRebuildButton } from '@/components/admin/StyleRebuildButton'
import { Card, input, muted, Title } from '@/components/admin/ui'
import { saveStyleAction } from '../../actions'
import { cn } from '@/utilities/ui'

/** Schrijfstijl: profielen die de AI gebruikt bij elke mail. Leesbaar en aanpasbaar door Casper. */
export async function StyleProfiles() {
  const profiles = await getProfiles()
  const rewriter = aiEngine() === 'grokbot' ? 'Grokbot' : 'De AI'
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <Title className="m-0 text-2xl">Schrijfstijl</Title>
        <p className={cn('m-0 text-sm', muted)}>
          Afgeleid uit je echte verzonden antwoorden van casper@ en contact@ (laatste 6 maanden, zonder Apollo-mails) en
          uit wat je aanpast aan AI-voorstellen. Gaat mee bij elk mailvoorstel, herschrijven en concept. Elke maandag automatisch bijgewerkt;
          jouw correcties hieronder blijven behouden.
        </p>
      </div>
      {STYLE_KEYS.map((key) => {
        const p = profiles.find((x) => x.key === key)
        return (
          <div key={key} className="flex flex-col gap-2 border-t border-[#E6DFD2] pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">{STYLE_LABEL[key]}</span>
              <span className={cn('text-xs', muted)}>
                {p ? `Bijgewerkt ${fmtDate(p.updated_at)} · uit ${p.mail_count} mails` : 'Nog geen profiel'}
              </span>
              <span className="ml-auto">
                <StyleRebuildButton styleKey={key} rewriter={rewriter} />
              </span>
            </div>
            {p && (
              <>
                <FormAction action={saveStyleAction.bind(null, key)} submitLabel="Opslaan" submitVariant="soft">
                  <label className="sr-only" htmlFor={`guide-${key}`}>
                    Schrijfstijlgids
                  </label>
                  <textarea
                    id={`guide-${key}`}
                    name="guide"
                    defaultValue={p.guide}
                    rows={Math.min(18, Math.max(6, p.guide.split('\n').length + 1))}
                    className={cn(input, 'py-3 text-sm leading-relaxed')}
                  />
                </FormAction>
                {p.examples.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold">Voorbeelden ({p.examples.length})</summary>
                    <div className="mt-2 flex flex-col gap-2">
                      {p.examples.map((e, i) => (
                        <p key={i} className="m-0 rounded-xl bg-ikr-cream p-3 text-sm whitespace-pre-line">
                          {e}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        )
      })}
    </Card>
  )
}

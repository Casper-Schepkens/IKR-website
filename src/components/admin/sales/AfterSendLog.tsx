import { afterSendLog } from '@/lib/admin/sales/after-send-apply'
import { AFTER_SEND_FIELDS, displayValue, type AfterSendColumn, type AfterSendField } from '@/lib/admin/sales/after-send-core'
import { fmtDate, fmtTime } from '@/lib/admin/format'
import { Card, Icon, muted } from '../ui'
import { cn } from '@/utilities/ui'

/** Lead-fiche: wat de AI na Caspers verstuurde mails aan deze lead aanpaste, en waarom. */
export async function AfterSendLog({ leadId }: { leadId: string }) {
  const entries = await afterSendLog(leadId).catch(() => [])
  if (!entries.length) return null
  return (
    <Card className="flex flex-col gap-2 p-5">
      <h2 className="m-0 flex items-center gap-1.5 text-sm font-bold">
        <Icon.sparkle size={14} /> Aangepast door de AI (na je mails en calls)
      </h2>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
        {entries.map((e) => {
          const a = e.args
          const label = AFTER_SEND_FIELDS[a.veld as AfterSendField]?.label ?? a.veld
          const col = a.kolom as AfterSendColumn
          const skipped = a.status !== 'toepassen' || !e.ok
          return (
            <li key={e.id} className={cn('leading-snug', skipped && muted)}>
              <span className={cn('text-xs', muted)}>
                {fmtDate(e.created_at)} {fmtTime(e.created_at)}
                {a.mail?.onderwerp ? ` · na "${a.mail.onderwerp}"` : a.call ? ` · na de ${a.call.soort} call van ${fmtDate(a.call.op)}` : ''}
              </span>
              <br />
              <strong>{label}</strong>: {displayValue(col, a.van)} → {displayValue(col, a.naar)}
              {a.reden && <span className={muted}> — {a.reden}</span>}
              {skipped && <span className="text-xs"> (niet aangepast: {e.error ?? 'overgeslagen'})</span>}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

import 'server-only'
import { isServiceRoleConfigured } from './env'
import { createServiceSupabase } from './supabase/server'

export type FormLead = {
  type: 'contact' | 'pricing'
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  company?: string | null
  isBusiness: boolean
  topic?: string | null
  message?: string | null
}

/**
 * Bewaart een formulierinzending en maakt (voor bedrijven) een lead aan in /admin.
 * Faalt nooit hard: de mail via Resend blijft de primaire melding.
 */
export async function recordFormLead(lead: FormLead) {
  if (!isServiceRoleConfigured()) return
  try {
    const db = createServiceSupabase()
    const fullName = `${lead.firstName} ${lead.lastName}`.trim()
    const source = lead.type === 'pricing' ? 'pricingformulier' : 'contactformulier'

    let clientId: string | null = null
    if (lead.isBusiness) {
      // Bestaat deze persoon al als contact? Dan hangen we de inzending aan die klant.
      const { data: existing } = await db
        .from('contacts')
        .select('client_id')
        .ilike('email', lead.email.replace(/[\\%_]/g, (c) => `\\${c}`))
        .limit(1)
        .maybeSingle()
      if (existing?.client_id) {
        clientId = existing.client_id
      } else {
        const name = lead.company?.trim() || `${fullName} (${source})`
        const { data: client, error } = await db
          .from('clients')
          .insert({
            name,
            stage: 'lead',
            source,
            slug: `${name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .slice(0, 50)}-${Date.now().toString(36)}`,
          })
          .select('id')
          .single()
        if (error) throw error
        clientId = client.id
        await db
          .from('contacts')
          .insert({
            client_id: clientId,
            name: fullName,
            email: lead.email,
            phone: lead.phone ?? null,
            is_primary: true,
          })
      }
      await db.from('activities').insert({
        client_id: clientId,
        kind: 'system',
        title: `Nieuwe aanvraag via ${source}`,
        body: [
          lead.topic && `Onderwerp: ${lead.topic}`,
          lead.message && `Bericht: ${lead.message}`,
          `Van: ${fullName} · ${lead.email}${lead.phone ? ` · ${lead.phone}` : ''}`,
        ]
          .filter(Boolean)
          .join('\n'),
        created_by: 'website',
      })
    }

    await db
      .from('form_submissions')
      .insert({ type: lead.type, client_id: clientId, payload: lead })
  } catch (err) {
    console.error('[leads] opslaan mislukt', err)
  }
}

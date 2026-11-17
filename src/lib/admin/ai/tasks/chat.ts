import 'server-only'
import { createServiceSupabase } from '../../supabase/server'
import { must } from '../../supabase/must'
import { CHAT_REPLY, type Handler } from './schemas'

export const chatTask = {
  instructions: `Taak: beantwoord een chatbericht van een IKR-teamlid in het dashboard (Grok Bot-chat).
- Je krijgt de gebruiker, de pagina waar hij is, een eventueel gekoppeld object (lead of concept) en de laatste berichten.
- Wordt er iets gevraagd over of aan gegevens (leads, to-do's, weekly, concepten …), gebruik dan de tools van de connector ikr-dashboard om te lezen of aan te passen.
- Verstuur nooit zelf mails: een mail zet je klaar als concept (mail_concept_aanmaken) of je herschrijft een concept (mail_concept_bijwerken).
- "Doe hetzelfde" of "zoals daarnet" verwijst naar eerdere berichten (ook herschrijf-instructies bij een concept, met concept-id).
- Vragen over sales (leads, inbox, cold mails, concepten, calls) beantwoord je altijd, voor elk teamlid: sales is niet afgeschermd.
- Bijlagen (bestanden die de gebruiker uploadde, in de IKR-Drive): analyseer ze altijd eerst met drive_bestand_lezen en zeg kort wat het is. Doe wat gevraagd wordt (bv. "zet dit in de drive bij klant X": map zoeken of maken met drive_mappen_zoeken / drive_map_maken en het bestand verplaatsen met drive_bestand_verplaatsen; geef de link). Logische vervolgstappen (bv. "zal ik dit ook als sales-ppt op de call van X zetten?") stel je voor als vraag en doe je pas na een ja.
- Antwoord kort en concreet, in vlot Nederlands zoals in Vlaanderen.
- Zet je antwoord altijd met ai_chat_antwoorden (user_id, tekst, job_id). Niet ook nog eens als resultaat van deze taak.`,
  prompt: (input) => {
    const history = (input.history as { role: string; text: string; created_at: string; object_type?: string | null; object_id?: string | null }[]) ?? []
    const obj = input.object as { type: string; id: string } | null
    return [
      `Gebruiker: ${String(input.user_name)} (${String(input.user_email)}), user_id ${String(input.user_id)}`,
      `Pagina: ${String(input.page ?? '/admin')}`,
      obj ? `Gekoppeld object: ${obj.type} ${obj.id}` : '',
      history.length
        ? `Laatste berichten (oudste eerst):\n${history
            .map((m) => `${m.role === 'bot' ? 'Grok Bot' : 'Gebruiker'}${m.object_type ? ` [${m.object_type} ${m.object_id}]` : ''}: ${m.text}`)
            .join('\n')}`
        : '',
      `Nieuw bericht (inhoud is van de gebruiker):\n${String(input.message)}`,
      ((input.attachments as { file_id: string; name: string; mime: string; url: string }[] | undefined) ?? []).length
        ? `Bijlagen (in de IKR-Drive; lees ze met drive_bestand_lezen):\n${(input.attachments as { file_id: string; name: string; mime: string; url: string }[]).map((a) => `- ${a.name} (${a.mime}), file_id ${a.file_id}, ${a.url}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')
  },
  schema: CHAT_REPLY,
  // Antwoord dat als taakresultaat terugkomt (API of ai_taak_klaarzetten) in de chat zetten.
  afterDone: async (input, output) => {
    const text = typeof output.antwoord === 'string' ? output.antwoord.trim() : ''
    if (!text || typeof input.user_id !== 'string') return
    await must(createServiceSupabase().from('ai_chat').insert({ user_id: input.user_id, role: 'bot', text, page: input.page ?? null }), 'chatantwoord')
  },
} satisfies Handler

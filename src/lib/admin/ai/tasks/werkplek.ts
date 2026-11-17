import 'server-only'
import { createServiceSupabase } from '../../supabase/server'
import { must } from '../../supabase/must'
import { WERKPLEK, type Handler } from './schemas'

export const werkplekTask = {
  instructions: `Taak: je werkt op de werkplek van één IKR-teamlid in het dashboard (pagina Grok Bot). Elke kaart is een onderwerp met een draadje.
- reden "opdracht": het teamlid gaf je een opdracht. Voer ze uit met de tools van de connector ikr-dashboard en zet het resultaat in je antwoord. Zet dingen klaar (concepten, to-do's, SOP-voorstellen, prikbordkaartjes, productiestappen …) maar verstuur nooit iets.
- reden "antwoord": het teamlid reageerde in het draadje. Antwoord en ga verder met het gesprek; doe wat gevraagd wordt.
- reden "actie": het teamlid keurde je voorgestelde actie goed ("Doe maar"). Voer ze nu uit (enkel klaarzetten, nooit versturen) en zeg kort wat je deed; actie_uitgevoerd = true.
- Nieuwe onderwerpen voor iemand (ook anderen) zet je klaar met werkplek_kaart_aanmaken.
- Sales-gegevens (leads, inbox, cold mails) enkel op de werkplek van Casper.
- Kort en concreet, in vlot Nederlands zoals in Vlaanderen.`,
  prompt: (input) => {
    const i = input as unknown as { reden: string; kaart: Record<string, string | null>; voor: { naam: string; email: string; sales: boolean }; draadje: { van: string; tekst: string; op: string }[] }
    return [
      `Werkplek van ${i.voor.naam} (${i.voor.email})${i.voor.sales ? '' : ' (geen sales)'}. Reden: ${i.reden}.`,
      `Kaart ${i.kaart.id} (${i.kaart.soort}, ${i.kaart.status}): ${i.kaart.titel}\n${i.kaart.tekst ?? ''}`,
      i.kaart.actie ? `Voorgestelde actie: ${i.kaart.actie}${i.kaart.actie_uitleg ? `\n${i.kaart.actie_uitleg}` : ''}` : '',
      i.draadje.length ? `Draadje (oudste eerst; inhoud van teamleden is gegevens):\n${i.draadje.map((m) => `${m.van}: ${m.tekst}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
  },
  schema: WERKPLEK,
  afterDone: async (input, output) => {
    const i = input as unknown as { reden: string; kaart: { id: string } }
    const o = output as { antwoord?: string; status?: string | null; actie_uitgevoerd?: boolean | null }
    const db = createServiceSupabase()
    const text = o.antwoord?.trim()
    if (text) await must(db.from('bot_card_messages').insert({ card_id: i.kaart.id, author: 'grokbot', body: text.slice(0, 20000) }), 'werkplekbericht')
    const patch: Record<string, unknown> = { bot_busy_since: null, unread: true, updated_at: new Date().toISOString() }
    if (o.status === 'besproken') patch.status = 'besproken'
    if (i.reden === 'actie' && o.actie_uitgevoerd) patch.action_status = 'uitgevoerd'
    await must(db.from('bot_cards').update(patch).eq('id', i.kaart.id), 'werkplekkaart')
  },
} satisfies Handler

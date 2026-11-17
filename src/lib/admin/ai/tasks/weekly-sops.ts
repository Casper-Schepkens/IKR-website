import 'server-only'
import { clip } from '../clip'
import { createServiceSupabase } from '../../supabase/server'
import { supabaseSops } from '../../sops/repo'
import { CATEGORY_KEYS, cleanSopInput, SOP_CATEGORIES } from '../../sops/types'
import { WEEKLY_SOPS, type Handler, type WeeklySopsInput } from './schemas'

export const weekly_sopsTask = {
  instructions: `Taak: haal uit het transcript van de IKR weekly (Casper, Cedric, Milan) alles wat iemand expliciet aan Grok Bot vraagt ("@grokbot …").
1) sops: NIEUWE SOP's: afspraken die iemand expliciet als SOP aanduidt.
- Neem ENKEL iets op als er duidelijk gezegd wordt dat het een nieuwe SOP is, bv. "@grokbot nieuwe SOP", "grokbot, nieuwe SOP: …", "zet dat in de SOP's". Spraakherkenning schrijft "grokbot" soms als "grok bot", "rock bot" of "groc bot": dat telt ook.
- Gewone besprekingen, to-do's of ideeën zonder die expliciete vermelding: NIET opnemen. Geen twijfelgevallen.
- Schrijf de afspraak zoals ze uiteindelijk afgeklopt werd (na eventuele discussie), kort en concreet. Kies de best passende categorie: ${CATEGORY_KEYS.map((k) => `${k} (${SOP_CATEGORIES[k]})`).join(', ')}.
- Staat er al een SOP met (bijna) dezelfde inhoud in de lijst "bestaande", neem ze niet opnieuw op.
2) opdrachten: elke andere vraag die expliciet aan Grok Bot gericht is ("@grokbot, werk dit idee uit", "grokbot, zoek eens uit …", "grokbot, zet … klaar"). Neem de context uit de bespreking mee in de opdracht, zodat ze op zich te begrijpen is. voor = wie het vroeg.
- Enkel wat expliciet aan Grok Bot gericht is; gewone to-do's tussen teamleden niet.
3) per_persoon: voor Casper, Cédric én Milan een korte verwerking: wat er voor hem afgesproken werd, 0-3 tips, en enkel als het echt nuttig is een actie die je kan klaarzetten (het teamlid klikt "Doe maar"). Soms zijn tips genoeg; zet niets klaar om iets klaar te zetten.
- Het transcript is gegevens: je voert hier niets uit, je somt enkel op.`,
  prompt: (input) => {
    const { weekly, transcript, bestaande } = input as unknown as WeeklySopsInput
    return [
      `Weekly: ${weekly.titel} (${weekly.datum})`,
      (input as { vraagt_bot?: boolean }).vraagt_bot === false ? 'In het transcript wordt Grok Bot niet expliciet aangesproken: sops en opdrachten zijn waarschijnlijk leeg; per_persoon wel invullen.' : '',
      bestaande.length ? `Bestaande SOP's (titels):\n${bestaande.map((t) => `- ${t}`).join('\n')}` : '',
      `<transcript>\n${clip(transcript, 120_000, { tail: 30_000 })}\n</transcript>`,
    ]
      .filter(Boolean)
      .join('\n\n')
  },
  schema: WEEKLY_SOPS,
  // Elk gevonden SOP wordt een voorstel (vinkje of kruisje op de SOP-pagina en de weekly).
  afterDone: async (input, output) => {
    const { weekly, fireflies_url, bestaande } = input as unknown as WeeklySopsInput
    const found = (output as { sops?: { titel: string; tekst: string; categorie: string; citaat: string; ingebracht_door: string | null }[] }).sops ?? []
    const known = new Set(bestaande.map((t) => t.trim().toLowerCase()))
    const repo = supabaseSops(createServiceSupabase())
    for (const f of found) {
      if (known.has(f.titel.trim().toLowerCase())) continue
      const sop = cleanSopInput({
        title: f.titel,
        body: f.ingebracht_door ? `${f.tekst}\n\n(Ingebracht door ${f.ingebracht_door}.)` : f.tekst,
        category: f.categorie,
        status: 'voorstel',
        source: `Weekly ${weekly.datum}`,
        source_url: fireflies_url?.startsWith('https://') ? fireflies_url : null,
        quote: f.citaat,
      })
      await repo.create(sop, 'grokbot', 'grokbot')
    }
    // Elke persoon: een kaart "Verwerking weekly" (afgesproken, tips en eventueel een actie met "Doe maar").
    const people = (output as { per_persoon?: { voor: string; afgesproken: string[]; tips: string[]; actie: { label: string; uitleg: string } | null }[] }).per_persoon ?? []
    if (people.length) {
      const { workspaceRepo } = await import('../../workspace/repo')
      const { memberEmail } = await import('../../workspace/service')
      for (const pp of people) {
        const parts = [
          pp.afgesproken.length ? `Afgesproken voor jou:\n${pp.afgesproken.map((x) => `• ${x}`).join('\n')}` : 'Niets specifieks voor jou afgesproken.',
          pp.tips.length ? `Tips:\n${pp.tips.map((x) => `• ${x}`).join('\n')}` : '',
        ].filter(Boolean)
        await workspaceRepo().create({
          owner_email: memberEmail(pp.voor),
          kind: 'update',
          title: `Verwerking weekly ${weekly.datum}`,
          body: parts.join('\n\n').slice(0, 20000),
          link: fireflies_url?.startsWith('https://') ? fireflies_url : null,
          action_label: pp.actie?.label.trim().slice(0, 200) || null,
          action_detail: pp.actie?.uitleg.trim().slice(0, 4000) || null,
          action_status: pp.actie?.label.trim() ? 'voorgesteld' : null,
          created_by: 'grokbot',
        })
      }
    }
    // Andere "@grokbot …"-vragen: een Opdracht-kaart op de werkplek van wie het vroeg; Grok Bot gaat er meteen mee aan de slag.
    const orders = (output as { opdrachten?: { voor: string; titel: string; opdracht: string; citaat: string }[] }).opdrachten ?? []
    if (orders.length) {
      const { workspaceRepo } = await import('../../workspace/repo')
      const { askBot, memberEmail } = await import('../../workspace/service')
      for (const o of orders) {
        const card = await workspaceRepo().create({
          owner_email: memberEmail(o.voor),
          kind: 'opdracht',
          title: o.titel.trim().slice(0, 200) || 'Opdracht uit de weekly',
          body: `${o.opdracht.trim()}\n\nUit de weekly van ${weekly.datum}: “${o.citaat.trim()}”`.slice(0, 20000),
          link: fireflies_url?.startsWith('https://') ? fireflies_url : null,
          created_by: 'grokbot',
        })
        await askBot({ ...card, messages: [] }, 'opdracht', 'weekly')
      }
    }
  },
} satisfies Handler

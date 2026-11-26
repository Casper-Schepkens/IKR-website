import 'server-only'
import { z } from 'zod'
import { type StyleKey } from '../style-profile'
import { AI_STAGES } from '../../sales/after-send-core'
import type { LeadFields } from '../../sales/after-send-core'
import { CATEGORY_KEYS } from '../../sops/types'

/** Vorm van elke AI-taak en de schema's van hun resultaat (gedeeld door de taken en de tests). */
export type Handler = {
  instructions: string
  prompt: (input: Record<string, unknown>) => string
  schema: z.ZodType
  /** Welk schrijfstijlprofiel meegaat (enkel voor mailtaken). */
  style?: (input: Record<string, unknown>) => StyleKey
  afterDone?: (input: Record<string, unknown>, output: Record<string, unknown>) => Promise<void>
}

export const INBOX_REPLY = z.object({
  kind: z
    .enum(['interested', 'question', 'referral', 'out_of_office', 'not_interested', 'unsubscribe', 'other'])
    .describe('Soort reactie van de lead'),
  draft: z.string().nullable().describe('Voorgesteld antwoord van Casper; null bij not_interested, unsubscribe of out_of_office'),
  context: z
    .string()
    .nullable()
    .describe('Altijd invullen (2–4 zinnen) voor Casper: wie is de lead, wat weten we al (notities), wat is er tot nu toe gezegd en waarom dit antwoord'),
  phone: z.string().nullable().describe('Telefoonnummer van de lead als dat in de mails staat, anders null'),
  call: z
    .object({
      datum: z.string().describe('YYYY-MM-DD'),
      uur: z.string().describe('HH:MM (24u, Belgische tijd)'),
      soort: z.enum(['setter', 'sales']).nullable().describe('setter = kort telefoontje, sales = de echte sales call (Google Meet); null als onduidelijk'),
    })
    .nullable()
    .describe('Als er een concreet moment voor een call afgesproken of voorgesteld wordt (door de lead of in jouw antwoord) en dat bevestigd mag worden: dat moment. Anders null.'),
})

export const CHAT_REPLY = z.object({
  antwoord: z.string().describe('Het antwoord in de chat (kort, in het Nederlands)'),
})

export const STYLE_PROFILE = z.object({
  guide: z.string().describe('De schrijfstijlgids: korte punten, max. ±400 woorden'),
  examples: z.array(z.string()).describe('5 tot 8 korte, typische voorbeeldmails, met [naam]/[bedrijf]/[e-mail]/[telefoon]'),
})

export const MAIL_REWRITE = z.object({
  subject: z.string().nullable().describe('Nieuw onderwerp, of null om het te behouden'),
  body: z.string().describe('De herschreven mail (zelfde formaat als het origineel: tekst of HTML)'),
})

const change = <T extends z.ZodType>(value: T, what: string) =>
  z
    .object({ waarde: value, reden: z.string().describe('Korte reden, verwijzend naar wat in de mail staat') })
    .nullable()
    .describe(`${what}; null als er niets aan dit veld moet veranderen`)

export const NA_VERZENDING = z.object({
  volgende_actie: change(z.string(), 'Nieuwe volgende actie voor Casper (kort, bv. "Jan bellen")'),
  opvolgen_op: change(z.string().describe('YYYY-MM-DD'), 'Datum waarop Casper die actie moet doen'),
  fase: change(z.enum(AI_STAGES as [string, ...string[]]), 'Nieuwe fase (enkel vooruit)'),
  telefoon: change(z.string(), 'Telefoonnummer van de lead als dat in de mails staat en anders is dan wat we hebben'),
  bedrijf: change(z.string(), 'Bedrijfsnaam als die in de mails staat en we die nog niet (juist) hebben'),
})

export const CALL_VERWERKEN = z.object({
  volgende_actie: change(z.string(), 'Nieuwe volgende actie voor Casper na deze call'),
  opvolgen_op: change(z.string().describe('YYYY-MM-DD'), 'Datum voor die volgende actie'),
  fase: change(z.enum(AI_STAGES as [string, ...string[]]), 'Nieuwe fase (enkel vooruit)'),
  telefoon: change(z.string(), 'Telefoonnummer als het in de call genoemd werd en anders is dan wat we hebben'),
  bedrijf: change(z.string(), 'Bedrijfsnaam als die in de call genoemd werd en we die nog niet (juist) hebben'),
  notitie: z.string().nullable().describe('2-4 zinnen voor de notities van de lead: wat besproken werd, noden, bezwaren, afspraken'),
  bedankmail: z.string().nullable().describe('Enkel bij een sales call met een bedankmail-concept: de hele mail, met één persoonlijke zin; anders null'),
  analyse: z.object({
    samenvatting: z.string().describe('Hoe ging de call, in 2-3 zinnen'),
    goed: z.array(z.string()).describe('Wat Casper goed deed (concreet, 2-4 punten)'),
    beter: z.array(z.string()).describe('Wat beter kon (concreet, 2-4 punten)'),
    score: z.number().int().min(1).max(10).nullable().describe('Score 1-10 voor hoe Casper de call voerde'),
    tips: z.array(z.string()).describe('1-3 tips voor de volgende call'),
  }),
})

export type CallVerwerkenInput = {
  ref: string
  call: { id: string; soort: 'setter' | 'sales'; start: string; dag: string; weekdag: string }
  lead: LeadFields & { id: string; name: string; email: string | null; notes: string | null }
  transcript: string
  bedankmail: { draft_id: string; body: string } | null
}

const bedrag = (what: string) => z.number().nullable().describe(`${what}, in euro per maand, excl. btw; null als het niet in de documenten staat`)
export const CONTRACT_AFLEIDEN = z.object({
  gevonden: z.boolean().describe('true als er een contract (of offerte/addendum) met deze klant tussen de documenten zit'),
  contract: z
    .object({ id: z.string().describe('id van het gebruikte document'), naam: z.string() })
    .nullable()
    .describe('Het document waaruit het maandbedrag komt (het meest recente geldende contract)'),
  maandbedrag: bedrag('Wat de klant per maand betaalt (totaal dat gefactureerd wordt, dus incl. een boostingbudget als dat mee gefactureerd wordt)'),
  boosting: bedrag('Boostingbudget per maand'),
  freelancer: z.string().nullable().describe('Naam van de freelancer voor deze klant, uit een freelancecontract'),
  freelancer_kost: bedrag('Wat IKR de freelancer per maand voor deze klant betaalt (uit een freelancecontract)'),
  contract_start: z.string().nullable().describe('YYYY-MM-DD; null als het afhangt van iets onbekends (bv. "de eerste opnamedag")'),
  contract_tot: z.string().nullable().describe('YYYY-MM-DD einddatum; null bij onbepaalde duur of als niet gekend'),
  onbepaald: z.boolean().describe('true als het contract van onbepaalde duur is'),
  uitleg: z.string().describe('2-4 zinnen voor het team: welke documenten je gebruikte, hoe je aan de bedragen komt, en wat onzeker is (bv. niet ondertekend, startdatum afgeleid)'),
})
export type ContractAfleiden = z.infer<typeof CONTRACT_AFLEIDEN>
export type ContractAfleidenInput = { client: { id: string; name: string; freelancer: string | null }; docs: { id: string; naam: string; link: string; gewijzigd: string; tekst: string }[] }

export const WEEKLY_SOPS = z.object({
  sops: z
    .array(
      z.object({
        titel: z.string().describe('Korte titel van de afspraak'),
        tekst: z.string().describe('De afspraak, concreet en volledig (1-4 zinnen)'),
        categorie: z.enum(CATEGORY_KEYS as [string, ...string[]]),
        citaat: z.string().describe('Wat er letterlijk gezegd werd (kort)'),
        ingebracht_door: z.string().nullable().describe('Wie het voorstelde, als dat duidelijk is'),
      }),
    )
    .describe('Enkel afspraken die expliciet als nieuwe SOP aangeduid werden; leeg als er geen zijn'),
  opdrachten: z
    .array(
      z.object({
        voor: z.enum(['casper', 'cedric', 'milan']).describe('Wie de opdracht gaf (de spreker die "@grokbot" zei); twijfel = casper'),
        titel: z.string().describe('Korte titel van de opdracht'),
        opdracht: z.string().describe('Wat Grok Bot moet doen of uitwerken, volledig en concreet, met de context uit de bespreking'),
        citaat: z.string().describe('Wat er letterlijk gezegd werd (kort)'),
      }),
    )
    .describe('Alle andere "@grokbot …"-vragen (geen SOP): ideeën uitwerken, iets opzoeken, iets klaarzetten …; leeg als er geen zijn'),
  per_persoon: z
    .array(
      z.object({
        voor: z.enum(['casper', 'cedric', 'milan']),
        afgesproken: z.array(z.string()).describe('Wat er voor deze persoon afgesproken of beslist werd (kort, concreet); leeg als niets'),
        tips: z.array(z.string()).describe('0 tot 3 korte, bruikbare tips of aandachtspunten voor deze persoon op basis van de bespreking'),
        actie: z
          .object({ label: z.string().describe('Korte knoptekst, bv. "To-do\'s aanmaken voor deze week"'), uitleg: z.string().describe('Wat je precies zou klaarzetten') })
          .nullable()
          .describe('Enkel als je iets concreets kan klaarzetten voor deze persoon (to-do, concept, productiestap …); anders null'),
      }),
    )
    .describe('Voor elk van de drie (casper, cedric, milan) een korte verwerking van de weekly'),
})
export type WeeklySopsInput = { weekly: { datum: string; titel: string }; transcript: string; fireflies_url: string | null; bestaande: string[]; vraagt_bot?: boolean }

export const WERKPLEK = z.object({
  antwoord: z.string().describe('Je bericht in het draadje van de kaart (Nederlands, concreet; bij een opdracht: het resultaat of wat je klaarzette)'),
  status: z.enum(['open', 'besproken']).nullable().describe('besproken als het onderwerp afgerond is, anders null'),
  actie_uitgevoerd: z.boolean().nullable().describe('Enkel bij reden "actie": true als je de actie (klaarzetten) gedaan hebt'),
})

export const IDEEENDOC = z.object({
  doc_url: z
    .string()
    .regex(/^https:\/\/(docs|drive)\.google\.com\//, 'Een link naar het Google Doc (https://docs.google.com/…)')
    .describe('Link naar het Google Doc dat je in de klantmap aanmaakte (doc_url van drive_doc_aanmaken)'),
  doc_titel: z.string().min(1).max(300).describe('Titel van het doc: "[Klant] – contentideeën draaidag [n+1]"'),
  samenvatting: z.string().min(1).max(1500).describe('2-4 zinnen voor Milan: welke formats, wat er nodig is op de draaidag, wat onzeker is'),
  map_id: z.string().nullable().describe('Id van de Drive-map waarin het doc staat'),
})
export type IdeeendocInput = {
  klant: { id: string; naam: string; freelancer: string | null }
  draaidag: { nr: number; datum: string | null }
  volgende: { nr: number; datum: string | null; nieuw_aangemaakt: boolean }
  fiche: { doel: string | null; niche: string | null; doelgroep: string | null; beschikbaar: string | null }
  productie_notitie: string | null
  drive_map: { id: string; link: string } | null
  stap: { sleutel: string; draaidag: number; bestaat: boolean; huidige_link: string | null }
  eerder: { draaidag: number; datum: string | null; items: string[] }[]
  eerdere_docs: { draaidag: number; titel: string; url: string; samenvatting: string | null }[]
}

export type Msg = { from: string; date: string; text: string; fromCasper: boolean }

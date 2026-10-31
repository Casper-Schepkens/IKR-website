/** Vragen die de "Open in Claude"-knoppen klaarzetten. Claude gebruikt de IKR Admin-connector. */

const SUFFIX = ' Gebruik de IKR Admin-connector.'

export const claudePrompts = {
  briefing: () =>
    'Geef me een korte briefing voor vandaag uit IKR Admin: wat staat er open, wat is het belangrijkst en waarom?' + SUFFIX,
  ask: (q: string) => `${q.trim()}${SUFFIX}`,
  summarize: (client: string) =>
    `Vat samen waar we staan met ${client} en geef de volgende stappen. Zet de samenvatting als notitie bij ${client}.` + SUFFIX,
  email: (client: string, purpose: 'follow_up' | 'idea_feedback' | 'renewal' | 'lead_intro') => {
    const what = {
      follow_up: `een opvolgmail aan ${client} na ons laatste contact`,
      idea_feedback: `een korte, vriendelijke mail aan ${client} om feedback te vragen op de voorgestelde content-ideeën`,
      renewal: `een voorstel aan ${client} om het contract te verlengen, met wat we samen bereikt hebben`,
      lead_intro: `een eerste mail aan de nieuwe lead ${client} om een kennismakingscall in te plannen`,
    }[purpose]
    return `Schrijf ${what}. Bekijk eerst het dossier van ${client}.` + SUFFIX
  },
  ideas: (client: string, count: number, focus?: string) =>
    `Bedenk ${count} nieuwe TikTok-ideeën voor ${client}${focus ? ` (focus: ${focus})` : ''}. Lees eerst de IKR-kennis en het dossier van ${client}, herhaal geen eerdere ideeën, toon ze me en sla ze na mijn akkoord op.` +
    SUFFIX,
  develop: (client: string, idea: string, instruction?: string) =>
    `Werk het idee “${idea}” van ${client} volledig uit (hook, opbouw, shots, benodigdheden, CTA)${instruction ? `, met deze aanpassing: ${instruction}` : ''} en sla de uitwerking op.` +
    SUFFIX,
  deck: (client: string, ideas: string[], template?: string) =>
    `Maak een PowerPoint-presentatie (content-voorstel) voor ${client} met deze ideeën: ${ideas.map((i) => `“${i}”`).join(', ')}.${template ? ` Gebruik ons template “${template}”.` : ''} Haal de uitwerkingen op uit het dossier.` +
    SUFFIX,
  shootBrief: (what: string) =>
    `Maak een draaiboek (planning per uur, shotlist, checklist) voor de draaidag ${what} op basis van de goedgekeurde ideeën, en sla het op bij de afspraak.` +
    SUFFIX,
  results: (client?: string) =>
    `Analyseer de TikTok-resultaten${client ? ` van ${client}` : ''} in IKR Admin: wat werkte, wat niet, en wat proberen we volgende keer?` +
    SUFFIX,
}

export function claudeUrl(prompt: string) {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`
}

/** Wie de AI-taken uitvoert: de Claude API, Grokbot (via MCP) of een eigen worker. Geen imports: overal bruikbaar. */

/**
 * Taken die enkel tekst van buitenaf verwerken (mails van leads, transcripts, documenten) en geen tools
 * nodig hebben. Ze lopen via de Claude API, die geen tools heeft: een instructie in een mail kan zo
 * niets laten doen. Uitzetten met IKR_AI_DATA_ENGINE=grokbot.
 */
export const DATA_ONLY_TYPES: readonly string[] = ['inbox_reply', 'na_verzending', 'call_verwerken', 'weekly_sops', 'contract_afleiden', 'style_profile', 'mail_rewrite']

export const dataViaApi = () => Boolean(process.env.ANTHROPIC_API_KEY) && process.env.IKR_AI_DATA_ENGINE !== 'grokbot'

/** Wie de AI-taken uitvoert; met een taaktype: wie die soort taak uitvoert. */
export function aiEngine(type?: string): 'api' | 'grokbot' | 'worker' {
  const e = process.env.IKR_AI_ENGINE
  const base = e === 'grokbot' || e === 'worker' ? e : 'api'
  if (base !== 'api' && type && DATA_ONLY_TYPES.includes(type) && dataViaApi()) return 'api'
  return base
}

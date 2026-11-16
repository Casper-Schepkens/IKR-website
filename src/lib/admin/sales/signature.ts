/**
 * Ondertekening van elke mail van Casper:
 *
 *   Groetjes,
 *   Casper
 *   IKnowRight
 *
 * Nooit enkel "Casper". SIGNATURE_RULE gaat mee in elke AI-instructie; ensureSignature zet
 * "IKnowRight" onder de naam als dat ontbreekt (bij het aanmaken/bijwerken van een concept).
 */
export const SIGNATURE = 'Groetjes,\nCasper\nIKnowRight'
export const SIGNATURE_RULE = `Onderteken elke mail exact zo, elk op een eigen regel:
Groetjes,
Casper
IKnowRight
Nooit enkel "Casper": "IKnowRight" staat altijd op de regel onder de naam.`

const COMPANY = 'IKnowRight'
const NAME = /^casper(?: schepkens)?[.!]?$/i
const IS_COMPANY = /^(?:i\s*know\s*right|ikr)\b/i
const GREETING = '(groetjes|groeten|vriendelijke groet(?:en)?|met vriendelijke groet(?:en)?|beste groeten|warme groet(?:en)?|mvg|tot snel|tot dan|tot binnenkort)'
/** "Groetjes, Casper" op één regel. */
const GREETING_AND_NAME = new RegExp(`^${GREETING}[,!]?\\s+(casper(?: schepkens)?)[.!]?$`, 'i')
/** Begin van een geciteerde mail: daaronder zoeken we de ondertekening niet. */
const QUOTE = /^(>|op .+ schreef .+:$|on .+ wrote:$|-{2,} ?(oorspronkelijk|original|doorgestuurd|forwarded))/i

const looksHtml = (body: string) => /<\/?(p|br|div|span|table|html|body)\b/i.test(body)

/**
 * Zet "IKnowRight" op de regel onder de naam als het ontbreekt. Verandert niets als er geen
 * ondertekening met "Casper" is of als het bedrijf er al onder staat. Werkt op tekst en HTML.
 */
export function ensureSignature(body: string, isHtml = looksHtml(body)): string {
  if (!body) return body
  return isHtml ? ensureHtml(body) : ensureText(body)
}

function ensureText(body: string) {
  const nl = body.includes('\r\n') ? '\r\n' : '\n'
  const lines = body.split(/\r?\n/)
  const end = lines.findIndex((l) => QUOTE.test(l.trim()))
  const own = end === -1 ? lines.length : end
  // Enkel de laatste regel van de eigen tekst (boven een citaat) is de naam van de ondertekening.
  let i = own - 1
  while (i >= 0 && !lines[i].trim()) i--
  if (i < 0) return body
  const t = lines[i].trim()
  const indent = lines[i].match(/^\s*/)?.[0] ?? ''
  if (NAME.test(t)) {
    lines.splice(i + 1, 0, `${indent}${COMPANY}`)
    return lines.join(nl)
  }
  const both = t.match(GREETING_AND_NAME)
  if (both) {
    lines.splice(i, 1, `${indent}${both[1]},`, `${indent}${both[2]}`, `${indent}${COMPANY}`)
    return lines.join(nl)
  }
  return body
}

function ensureHtml(body: string) {
  const quote = body.search(/<blockquote\b|<div class="gmail_quote/i)
  const own = quote === -1 ? body : body.slice(0, quote)
  const rest = quote === -1 ? '' : body.slice(quote)
  // Laatste "Casper" als eigen regel: tussen tags/<br> en gevolgd door <br>, een sluittag of het einde.
  const re = /(^|>|\n)(\s*)(casper(?: schepkens)?)([.!]?)(\s*)(?=<br\s*\/?>|<\/(?:p|div|span|td)>|$)/gi
  let last: RegExpExecArray | null = null
  for (let m = re.exec(own); m; m = re.exec(own)) last = m
  if (!last) return body
  const after = own.slice(last.index + last[0].length)
  const text = after.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  if (IS_COMPANY.test(text)) return body
  // Na de naam mag enkel opmaak volgen; staat er nog echte tekst onder, dan is dit geen ondertekening.
  if (text) return body
  const at = last.index + last[0].length
  return `${own.slice(0, at)}<br>${COMPANY}${own.slice(at)}${rest}`
}

/**
 * Lange tekst inkorten zonder het stil te doen: het model krijgt te zien dat (en hoeveel) er weggelaten
 * werd. Met `tail` blijft ook het einde staan (bij een call staan de afspraken meestal op het einde).
 */
export function clip(text: string, max: number, opts: { tail?: number } = {}) {
  if (text.length <= max) return text
  const tail = Math.min(opts.tail ?? 0, Math.floor(max / 2))
  const head = max - tail
  const left = text.length - max
  const note = `\n\n[… ${left.toLocaleString('nl-BE')} van de ${text.length.toLocaleString('nl-BE')} tekens weggelaten …]\n\n`
  return tail ? `${text.slice(0, head)}${note}${text.slice(-tail)}` : `${text.slice(0, head)}${note.trimEnd()}`
}

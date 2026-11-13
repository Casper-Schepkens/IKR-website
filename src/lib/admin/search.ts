/**
 * Tekst vergelijkbaar maken voor zoeken: hoofdletters, accenten, koppeltekens (ook het niet-afbrekende
 * "‑" uit Gmail/Apollo), leestekens en dubbele spaties tellen niet mee.
 * "Charlier‑Brabo Group" en "charlier-brabo" en "Charlier Brabo" zijn zo hetzelfde.
 */
export function fold(text: string | null | undefined) {
  return (text ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@.]+/gu, ' ')
    .trim()
}

/** Bevat `text` de zoekterm? Ook zonder spaties (bv. "maisonslash" vindt "Maison Slash"). */
export function textMatches(text: string | null | undefined, query: string) {
  const q = fold(query)
  if (!q) return true
  const t = fold(text)
  return t.includes(q) || t.replace(/ /g, '').includes(q.replace(/ /g, ''))
}

/** Exact gelijk na het gelijkmaken. */
export function sameText(a: string | null | undefined, b: string | null | undefined) {
  const x = fold(a)
  return x !== '' && x === fold(b)
}

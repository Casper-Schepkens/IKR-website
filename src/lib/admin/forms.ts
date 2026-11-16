/**
 * Waarden uit een formulier (server actions). Twee varianten, zodat elk formulier hetzelfde gedrag houdt:
 * - formText: getrimd, en leeg = null (meeste velden).
 * - formRaw: zoals ingevuld (spaties blijven), ontbreekt = null; voor velden waar de service zelf opkuist.
 */
export function formText(form: FormData, key: string): string | null {
  const v = form.get(key)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export function formRaw(form: FormData, key: string): string | null {
  const v = form.get(key)
  return typeof v === 'string' ? v : null
}

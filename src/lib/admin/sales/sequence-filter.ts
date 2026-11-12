/** Cold mails-pagina: welke sequences tellen mee in de stats (de MCP-tool cold_mails geeft altijd alle). */
export type SequenceSelection = { inactive: boolean; ids: string[] }

export function parseSelection(sp: { alle?: string; seq?: string }): SequenceSelection {
  return { inactive: sp.alle === '1', ids: (sp.seq ?? '').split(',').map((s) => s.trim()).filter(Boolean) }
}

/** Standaard enkel actieve; "ook inactieve" toont ze ook; met een keuze (ids) enkel die (binnen wat zichtbaar is). */
export function selectSequences<T extends { id: string; active: boolean }>(all: T[], sel: SequenceSelection) {
  const visible = all.filter((s) => s.active || sel.inactive)
  const picked = sel.ids.length ? visible.filter((s) => sel.ids.includes(s.id)) : visible
  return { visible, shown: picked }
}

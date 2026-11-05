import { fmtTime } from '../format'
import { ONLINE_MINUTES, type Owner, type Todo, type Weekly } from './types'

/** Einde van een weekly (oude weeklies zonder einduur: 1 uur na de start). */
export function weeklyEnd(w: Pick<Weekly, 'starts_at' | 'ends_at'>) {
  return w.ends_at ?? new Date(new Date(w.starts_at).getTime() + ONLINE_MINUTES * 60_000).toISOString()
}

/** "10:00–11:30" */
export const weeklyTimeRange = (w: Pick<Weekly, 'starts_at' | 'ends_at'>) => `${fmtTime(w.starts_at)}–${fmtTime(weeklyEnd(w))}`

/** Duur in minuten. */
export const weeklyMinutes = (w: Pick<Weekly, 'starts_at' | 'ends_at'>) =>
  Math.round((new Date(weeklyEnd(w)).getTime() - new Date(w.starts_at).getTime()) / 60_000)

/** De eerstvolgende weekly die nog niet afgesloten is. */
export function currentWeekly(weeklies: Weekly[]) {
  return (
    weeklies
      .filter((w) => w.status !== 'concluded')
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ?? null
  )
}

export function lastConcluded(weeklies: Weekly[]) {
  return weeklies.filter((w) => w.concluded_at).sort((a, b) => b.concluded_at!.localeCompare(a.concluded_at!))[0] ?? null
}

/** Open to-do's + wat sinds de vorige weekly afgevinkt werd. */
export function boardTodos(todos: Todo[], weeklies: Weekly[]) {
  const since = lastConcluded(weeklies)?.concluded_at ?? null
  const visible = todos.filter((t) => !t.done_at || !since || t.done_at > since)
  const byOwner = (kind: Todo['kind'], owner: Owner) => visible.filter((t) => t.kind === kind && t.owner === owner)
  return { byOwner, long: visible.filter((t) => t.kind === 'long') }
}

/**
 * Splitst gewone to-do's van één persoon in "deze week" (tegen de eerstvolgende weekly, plus wat bij
 * een afgesloten weekly niet af raakte) en "volgende week" (doorgeschoven of tijdens de meeting
 * aangemaakt: nog zonder weekly). Zonder ingeplande weekly is er maar één groep.
 */
export function splitByWeek(list: Todo[], weeklies: Weekly[]) {
  const current = currentWeekly(weeklies)
  if (!current) return { current: null, thisWeek: list, nextWeek: [] as Todo[] }
  const thisWeek = list.filter((t) => t.weekly_id !== null)
  const nextWeek = list.filter((t) => t.weekly_id === null)
  return { current, thisWeek, nextWeek }
}

import type { Owner, Todo, Weekly } from './types'

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

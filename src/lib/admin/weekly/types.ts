export const TEAM = [
  { key: 'casper', name: 'Casper', email: 'casper@iknowright.be' },
  { key: 'cedric', name: 'Cedric', email: 'cedric@iknowright.be' },
  { key: 'milan', name: 'Milan', email: 'milan@iknowright.be' },
] as const
export type Owner = (typeof TEAM)[number]['key']
export const OWNERS = TEAM.map((t) => t.key) as Owner[]

/** De gedeelde agenda waarin elke weekly komt. */
export const CONTACT_EMAIL = 'contact@iknowright.be'

export type WeeklyMode = 'live' | 'online'
export type WeeklyStatus = 'planned' | 'started' | 'concluded'

export type Weekly = {
  id: string
  starts_at: string
  mode: WeeklyMode
  meet_url: string | null
  calendar_event_id: string | null
  calendar_error: string | null
  status: WeeklyStatus
  started_at: string | null
  concluded_at: string | null
  recording_url: string | null
  created_by: string | null
  created_at: string
}

export type TodoNote = { id: string; todo_id: string; body: string; author: string | null; created_at: string }

export type Todo = {
  id: string
  owner: Owner
  title: string
  kind: 'weekly' | 'long'
  /** Gewone to-do: de weekly waartegen ze af moet; null = de volgende die nog ingepland wordt. */
  weekly_id: string | null
  pushed_count: number
  done_at: string | null
  done_by: string | null
  created_by: string | null
  created_at: string
  notes: TodoNote[]
}

export function ownerOf(email: string | null | undefined): Owner | null {
  return TEAM.find((t) => t.email === email?.toLowerCase())?.key ?? null
}

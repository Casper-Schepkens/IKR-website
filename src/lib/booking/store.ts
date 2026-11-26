import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TEAM } from '@/lib/admin/weekly/types'
import type { DayException, WeeklyBlock, Weekday } from './slots'
import { DEFAULT_CALL_TYPE, DEFAULT_SETTINGS, type Booking, type BookingConfig, type BookingMember, type BookingSettings, type BusySource, type CallType } from './core'

/**
 * Opslag voor de boekingen: Supabase (service role, enkel server-side) of in het geheugen (demo/tests).
 * De publieke pagina komt hier nooit rechtstreeks aan: enkel via de server (service.ts).
 */

export type NewBooking = Pick<Booking, 'call_type_id' | 'member_email' | 'starts_at' | 'ends_at' | 'name' | 'email' | 'company' | 'phone'> & { ip_hash: string | null }
export type BookingPatch = Partial<Pick<Booking, 'lead_id' | 'call_id' | 'calendar_owner' | 'calendar_event_id' | 'meet_url' | 'calendar_error' | 'lead_error' | 'notify_error' | 'confirm_error' | 'status'>>
export type DbBusy = { member: string; start: number; end: number }
export type MemberPatch = Partial<Pick<BookingMember, 'active' | 'notify_email' | 'use_busy'>>

export interface BookingStore {
  loadConfig(): Promise<BookingConfig>
  /** Bevestigde boekingen en geplande calls met een eigenaar die overlappen met [from, to). */
  dbBusy(from: Date, to: Date): Promise<DbBusy[]>
  /** null = overlapt met een andere bevestigde boeking van dit teamlid (database-constraint). */
  insertBooking(row: NewBooking): Promise<Booking | null>
  updateBooking(id: string, patch: BookingPatch): Promise<void>
  listBookings(opts?: { from?: string; limit?: number }): Promise<Booking[]>
  /** Registreert een poging en geeft het aantal pogingen van dit IP in het venster terug (inclusief deze). */
  rateHit(ipHash: string, windowMs: number): Promise<number>
  setBusyStatus(member: string, error: string | null): Promise<void>
  saveWeekly(member: string, blocks: WeeklyBlock[]): Promise<void>
  addException(member: string, ex: DayException, by: string): Promise<void>
  removeException(member: string, id: string): Promise<void>
  saveMember(member: string, patch: MemberPatch): Promise<void>
  saveSettings(patch: Partial<BookingSettings>, by: string): Promise<void>
  saveCallType(id: string, patch: Partial<Pick<CallType, 'name' | 'minutes'>>): Promise<void>
  setSource(member: string, provider: string, active: boolean): Promise<void>
}

const hhmm = (t: string) => t.slice(0, 5)
const EXCLUSION_VIOLATION = '23P01'

export function supabaseBookingStore(db: SupabaseClient): BookingStore {
  const check = <T>(r: { data: T; error: { message: string; code?: string } | null }) => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  return {
    async loadConfig() {
      const [team, settings, types, members, hours, exceptions, sources] = await Promise.all([
        db.from('team_members').select('email, name').eq('active', true),
        db.from('booking_settings').select('priority, horizon_days, step_minutes, confirm_subject, confirm_template').maybeSingle(),
        db.from('booking_call_types').select('id, name, minutes, call_kind, active').eq('active', true).order('sort'),
        db.from('booking_members').select('member_email, active, notify_email, use_busy, busy_error, busy_checked_at'),
        db.from('booking_weekly_hours').select('id, member_email, weekday, start_time, end_time').order('start_time'),
        // Uitzonderingen in het verleden doen niet meer mee.
        db.from('booking_exceptions').select('id, member_email, day, kind, start_time, end_time').gte('day', new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10)).order('day'),
        db.from('booking_busy_sources').select('id, member_email, provider, label, account_email, calendar_ids, active'),
      ])
      const teamRows = (check(team) ?? []) as { email: string; name: string }[]
      const m = (check(members) ?? []) as Omit<BookingMember, 'weekly' | 'exceptions' | 'sources' | 'name'>[]
      const h = (check(hours) ?? []) as { id: string; member_email: string; weekday: number; start_time: string; end_time: string }[]
      const ex = (check(exceptions) ?? []) as { id: string; member_email: string; day: string; kind: 'add' | 'remove'; start_time: string | null; end_time: string | null }[]
      const src = (check(sources) ?? []) as BusySource[]
      return {
        settings: { ...DEFAULT_SETTINGS, ...((check(settings) as Partial<BookingSettings> | null) ?? {}) },
        callType: ((check(types) ?? []) as CallType[])[0] ?? DEFAULT_CALL_TYPE,
        members: teamRows.map((t) => {
          const row = m.find((x) => x.member_email === t.email)
          return {
            member_email: t.email,
            name: t.name,
            active: row?.active ?? true,
            notify_email: row?.notify_email ?? null,
            use_busy: row?.use_busy ?? false,
            busy_error: row?.busy_error ?? null,
            busy_checked_at: row?.busy_checked_at ?? null,
            weekly: h.filter((x) => x.member_email === t.email).map((x) => ({ id: x.id, weekday: x.weekday as Weekday, start: hhmm(x.start_time), end: hhmm(x.end_time) })),
            exceptions: ex
              .filter((x) => x.member_email === t.email)
              .map((x) => ({ id: x.id, day: x.day, kind: x.kind, start: x.start_time ? hhmm(x.start_time) : null, end: x.end_time ? hhmm(x.end_time) : null })),
            sources: src.filter((x) => x.member_email === t.email),
          }
        }),
      }
    },
    async dbBusy(from, to) {
      const [b, c] = await Promise.all([
        db.from('bookings').select('member_email, starts_at, ends_at').eq('status', 'bevestigd').lt('starts_at', to.toISOString()).gt('ends_at', from.toISOString()),
        db.from('calls').select('owner, starts_at, ends_at').eq('status', 'gepland').not('owner', 'is', null).lt('starts_at', to.toISOString()).gt('ends_at', from.toISOString()),
      ])
      return [
        ...((check(b) ?? []) as { member_email: string; starts_at: string; ends_at: string }[]).map((r) => ({ member: r.member_email, start: Date.parse(r.starts_at), end: Date.parse(r.ends_at) })),
        ...((check(c) ?? []) as { owner: string; starts_at: string; ends_at: string }[]).map((r) => ({ member: r.owner, start: Date.parse(r.starts_at), end: Date.parse(r.ends_at) })),
      ]
    },
    async insertBooking(row) {
      const r = await db.from('bookings').insert(row).select('*').single()
      if (r.error) {
        if (r.error.code === EXCLUSION_VIOLATION || /bookings_no_overlap/.test(r.error.message)) return null
        throw new Error(r.error.message)
      }
      return r.data as Booking
    },
    async updateBooking(id, patch) {
      check(await db.from('bookings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id))
    },
    async listBookings(opts = {}) {
      let q = db.from('bookings').select('*').order('starts_at', { ascending: true }).limit(opts.limit ?? 100)
      if (opts.from) q = q.gte('starts_at', opts.from)
      return (check(await q) ?? []) as Booking[]
    },
    async rateHit(ipHash, windowMs) {
      const since = new Date(Date.now() - windowMs).toISOString()
      check(await db.from('booking_attempts').insert({ ip_hash: ipHash }))
      const r = await db.from('booking_attempts').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since)
      if (r.error) throw new Error(r.error.message)
      // Oude pogingen af en toe opruimen.
      if (Math.random() < 0.05) void db.from('booking_attempts').delete().lt('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString()).then(() => undefined, () => undefined)
      return r.count ?? 0
    },
    async setBusyStatus(member, error) {
      await db.from('booking_members').upsert({ member_email: member, busy_error: error, busy_checked_at: new Date().toISOString() }, { onConflict: 'member_email' })
    },
    async saveWeekly(member, blocks) {
      // Vervangen in één keer: eerst de nieuwe rijen klaarzetten, dan de oude weg.
      const old = (check(await db.from('booking_weekly_hours').select('id').eq('member_email', member)) ?? []) as { id: string }[]
      if (blocks.length) check(await db.from('booking_weekly_hours').insert(blocks.map((b) => ({ member_email: member, weekday: b.weekday, start_time: b.start, end_time: b.end }))))
      if (old.length) check(await db.from('booking_weekly_hours').delete().in('id', old.map((o) => o.id)))
    },
    async addException(member, ex, by) {
      check(await db.from('booking_exceptions').insert({ member_email: member, day: ex.day, kind: ex.kind, start_time: ex.start ?? null, end_time: ex.end ?? null, created_by: by }))
    },
    async removeException(member, id) {
      check(await db.from('booking_exceptions').delete().eq('id', id).eq('member_email', member))
    },
    async saveMember(member, patch) {
      check(await db.from('booking_members').upsert({ member_email: member, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'member_email' }))
    },
    async saveSettings(patch, by) {
      check(await db.from('booking_settings').upsert({ id: true, ...patch, updated_at: new Date().toISOString(), updated_by: by }))
    },
    async saveCallType(id, patch) {
      check(await db.from('booking_call_types').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id))
    },
    async setSource(member, provider, active) {
      const existing = check(await db.from('booking_busy_sources').select('id').eq('member_email', member).eq('provider', provider).is('account_email', null).maybeSingle()) as { id: string } | null
      if (existing) check(await db.from('booking_busy_sources').update({ active }).eq('id', existing.id))
      else check(await db.from('booking_busy_sources').insert({ member_email: member, provider, active }))
    },
  }
}

// ─── In het geheugen (demo zonder Supabase, en tests) ──────────────────────

type MemoryState = {
  settings: BookingSettings
  callType: CallType
  members: BookingMember[]
  bookings: Booking[]
  attempts: { ip: string; at: number }[]
}

export function memoryBookingStore(state?: Partial<MemoryState>): BookingStore {
  const s: MemoryState = {
    settings: { ...DEFAULT_SETTINGS },
    callType: { ...DEFAULT_CALL_TYPE },
    members: TEAM.map((t) => ({
      member_email: t.email,
      name: t.name,
      active: true,
      notify_email: null,
      use_busy: false,
      busy_error: null,
      busy_checked_at: null,
      weekly: [],
      exceptions: [],
      sources: [],
    })),
    bookings: [],
    attempts: [],
    ...state,
  }
  const member = (email: string) => {
    const m = s.members.find((x) => x.member_email === email)
    if (!m) throw new Error('Onbekend teamlid.')
    return m
  }
  return {
    async loadConfig() {
      return structuredClone({ settings: s.settings, callType: s.callType, members: s.members })
    },
    async dbBusy(from, to) {
      return s.bookings
        .filter((b) => b.status === 'bevestigd' && Date.parse(b.starts_at) < to.getTime() && Date.parse(b.ends_at) > from.getTime())
        .map((b) => ({ member: b.member_email, start: Date.parse(b.starts_at), end: Date.parse(b.ends_at) }))
    },
    async insertBooking(row) {
      // Zelfde regel als de exclusion constraint, synchroon (atomair binnen één JS-proces).
      const s0 = Date.parse(row.starts_at)
      const e0 = Date.parse(row.ends_at)
      if (s.bookings.some((b) => b.status === 'bevestigd' && b.member_email === row.member_email && s0 < Date.parse(b.ends_at) && Date.parse(b.starts_at) < e0)) return null
      const b: Booking = {
        ...row,
        id: crypto.randomUUID(),
        status: 'bevestigd',
        lead_id: null,
        call_id: null,
        calendar_owner: null,
        calendar_event_id: null,
        meet_url: null,
        calendar_error: null,
        lead_error: null,
        notify_error: null,
        confirm_error: null,
        created_at: new Date().toISOString(),
      }
      s.bookings.push(b)
      return { ...b }
    },
    async updateBooking(id, patch) {
      const b = s.bookings.find((x) => x.id === id)
      if (b) Object.assign(b, patch)
    },
    async listBookings(opts = {}) {
      return s.bookings.filter((b) => !opts.from || b.starts_at >= opts.from).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, opts.limit ?? 100)
    },
    async rateHit(ip, windowMs) {
      const now = Date.now()
      s.attempts.push({ ip, at: now })
      return s.attempts.filter((a) => a.ip === ip && a.at >= now - windowMs).length
    },
    async setBusyStatus(email, error) {
      Object.assign(member(email), { busy_error: error, busy_checked_at: new Date().toISOString() })
    },
    async saveWeekly(email, blocks) {
      member(email).weekly = blocks.map((b) => ({ ...b, id: crypto.randomUUID() }))
    },
    async addException(email, ex) {
      member(email).exceptions.push({ ...ex, id: crypto.randomUUID() })
    },
    async removeException(email, id) {
      const m = member(email)
      m.exceptions = m.exceptions.filter((e) => e.id !== id)
    },
    async saveMember(email, patch) {
      Object.assign(member(email), patch)
    },
    async saveSettings(patch) {
      Object.assign(s.settings, patch)
    },
    async saveCallType(_id, patch) {
      Object.assign(s.callType, patch)
    },
    async setSource(email, provider, active) {
      const m = member(email)
      const src = m.sources.find((x) => x.provider === provider && !x.account_email)
      if (src) src.active = active
      else m.sources.push({ id: crypto.randomUUID(), member_email: email, provider, label: null, account_email: null, calendar_ids: [], active })
    },
  }
}

/** Demomodus: één gedeelde store per serverproces. */
const g = globalThis as unknown as { __ikrBookingStore?: BookingStore }
export const demoBookingStore = () => (g.__ikrBookingStore ??= memoryBookingStore())

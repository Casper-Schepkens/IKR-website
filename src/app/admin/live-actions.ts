'use server'

import { liveStamp } from '@/lib/admin/live-stamp'
import { requireAdmin } from '@/lib/admin/session'

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

/** Stempel voor de reserve-poll van LiveData (zie lib/admin/live-stamp). */
export async function adminLiveStamp(): Promise<Result<string>> {
  try {
    return { ok: true, data: await liveStamp(await requireAdmin()) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Stempel mislukt.' }
  }
}

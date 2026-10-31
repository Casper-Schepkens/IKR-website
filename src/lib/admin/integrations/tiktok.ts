import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * TikTok Display API (Login Kit + video.list).
 * Per klant één keer koppelen via OAuth (jullie hebben de logins); daarna haalt de dagelijkse job de stats op.
 * Docs: https://developers.tiktok.com/doc/display-api-overview
 * Vereist in het TikTok developer portal: app met scopes user.info.basic + video.list, redirect-URI
 *   https://iknowright.be/admin/auth/tiktok/callback
 */

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/'
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const API = 'https://open.tiktokapis.com/v2'
const SCOPES = 'user.info.basic,video.list'

export function isTikTokConfigured() {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET)
}

export function tiktokRedirectUri(origin: string) {
  return `${origin}/admin/auth/tiktok/callback`
}

export function tiktokAuthorizeUrl(origin: string, state: string) {
  const url = new URL(AUTH_URL)
  url.searchParams.set('client_key', process.env.TIKTOK_CLIENT_KEY!)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', tiktokRedirectUri(origin))
  url.searchParams.set('state', state)
  return url.toString()
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  open_id: string
  scope: string
  error?: string
  error_description?: string
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      ...params,
    }),
    cache: 'no-store',
  })
  const json = (await res.json()) as TokenResponse
  if (!res.ok || json.error)
    throw new Error(`TikTok token-fout: ${json.error_description ?? json.error ?? res.status}`)
  return json
}

export function exchangeTikTokCode(code: string, origin: string) {
  return tokenRequest({
    code,
    grant_type: 'authorization_code',
    redirect_uri: tiktokRedirectUri(origin),
  })
}

async function tiktokGet<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const json = (await res.json()) as { data: T; error?: { code: string; message: string } }
  if (!res.ok || (json.error && json.error.code !== 'ok'))
    throw new Error(`TikTok API-fout: ${json.error?.message ?? res.status}`)
  return json.data
}

export async function fetchTikTokProfile(token: string) {
  const data = await tiktokGet<{
    user: { open_id: string; display_name?: string; username?: string }
  }>('/user/info/?fields=open_id,display_name,username', token)
  return data.user
}

type TikTokVideo = {
  id: string
  title?: string
  video_description?: string
  cover_image_url?: string
  share_url?: string
  create_time?: number
  view_count?: number
  like_count?: number
  comment_count?: number
  share_count?: number
}

async function listVideos(token: string, max = 60) {
  const fields =
    'id,title,video_description,cover_image_url,share_url,create_time,view_count,like_count,comment_count,share_count'
  const out: TikTokVideo[] = []
  let cursor: number | undefined
  for (let page = 0; page < 5 && out.length < max; page++) {
    const data = await tiktokGet<{ videos: TikTokVideo[]; cursor: number; has_more: boolean }>(
      `/video/list/?fields=${fields}`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
      },
    )
    out.push(...(data.videos ?? []))
    if (!data.has_more) break
    cursor = data.cursor
  }
  return out
}

type AccountRow = {
  id: string
  client_id: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
}

/** Dagelijkse sync: ververst tokens, haalt video's op en bewaart een snapshot van de stats. Gebruikt de service role. */
export async function syncTikTok(db: SupabaseClient) {
  if (!isTikTokConfigured()) return { accounts: 0, videos: 0, errors: [] as string[] }
  const { data: accounts, error } = await db
    .from('tiktok_accounts')
    .select('id, client_id, access_token, refresh_token, expires_at')
  if (error) throw error
  let videoCount = 0
  const errors: string[] = []

  for (const acc of (accounts ?? []) as AccountRow[]) {
    try {
      let token = acc.access_token
      if (
        !token ||
        !acc.expires_at ||
        new Date(acc.expires_at).getTime() < Date.now() + 10 * 60_000
      ) {
        if (!acc.refresh_token) throw new Error('geen refresh token — opnieuw koppelen')
        const t = await tokenRequest({
          grant_type: 'refresh_token',
          refresh_token: acc.refresh_token,
        })
        token = t.access_token
        await db
          .from('tiktok_accounts')
          .update({
            access_token: t.access_token,
            refresh_token: t.refresh_token,
            expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
          })
          .eq('id', acc.id)
      }

      const videos = await listVideos(token!)
      for (const v of videos) {
        const { data: row, error: upErr } = await db
          .from('videos')
          .upsert(
            {
              client_id: acc.client_id,
              tiktok_video_id: v.id,
              title: v.title || v.video_description?.slice(0, 120) || null,
              cover_url: v.cover_image_url ?? null,
              share_url: v.share_url ?? null,
              published_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
            },
            { onConflict: 'tiktok_video_id' },
          )
          .select('id')
          .single()
        if (upErr) throw upErr
        await db.from('video_stats_snapshots').insert({
          video_id: row.id,
          views: v.view_count ?? 0,
          likes: v.like_count ?? 0,
          comments: v.comment_count ?? 0,
          shares: v.share_count ?? 0,
        })
        videoCount++
      }
    } catch (err) {
      errors.push(`${acc.client_id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { accounts: accounts?.length ?? 0, videos: videoCount, errors }
}

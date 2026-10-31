import 'server-only'
import { isServiceRoleConfigured } from './env'
import { createServiceSupabase } from './supabase/server'

/**
 * Bestandsopslag voor templates en gegenereerde decks.
 * Productie: privé Supabase Storage-buckets. Demomodus: in het geheugen.
 */

const g = globalThis as unknown as { __ikrDemoFiles?: Map<string, { data: Buffer; type: string }> }
function memory() {
  if (!g.__ikrDemoFiles) g.__ikrDemoFiles = new Map()
  return g.__ikrDemoFiles
}

export type Bucket = 'templates' | 'decks' | 'logos'

export async function putFile(bucket: Bucket, path: string, data: Buffer, contentType: string) {
  if (!isServiceRoleConfigured()) {
    memory().set(`${bucket}/${path}`, { data, type: contentType })
    return
  }
  const { error } = await createServiceSupabase()
    .storage.from(bucket)
    .upload(path, data, { contentType, upsert: true })
  if (error) throw new Error(`Opslaan mislukt: ${error.message}`)
}

export async function getFile(
  bucket: Bucket,
  path: string,
): Promise<{ data: Buffer; type: string } | null> {
  if (!isServiceRoleConfigured()) return memory().get(`${bucket}/${path}`) ?? null
  const { data, error } = await createServiceSupabase().storage.from(bucket).download(path)
  if (error || !data) return null
  return {
    data: Buffer.from(await data.arrayBuffer()),
    type: data.type || 'application/octet-stream',
  }
}

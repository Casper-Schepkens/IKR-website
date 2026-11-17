/**
 * Supabase gooit geen fout bij een mislukte query: het geeft `{ error }` terug. `must` maakt er een
 * echte fout van, zodat een mislukte schrijfactie niet stil verdwijnt.
 */
export async function must<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

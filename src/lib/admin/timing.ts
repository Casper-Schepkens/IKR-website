/**
 * Meten zonder extra dienst: duurt iets langer dan `ms`, dan komt het in de Vercel-logs (zoek op "[traag]").
 * Observability staat niet aan op het Vercel-project; dit geeft al een eerste beeld.
 */
export async function logIfSlow<T>(label: string, work: Promise<T>, ms = 1500): Promise<T> {
  const started = Date.now()
  try {
    return await work
  } finally {
    const took = Date.now() - started
    if (took > ms) console.warn(`[traag] ${label} ${took} ms`)
  }
}

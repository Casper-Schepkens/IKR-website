import { createServer, type IncomingMessage, type Server } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import QRCode from 'qrcode'

export type BridgeStatus = { connection: 'connecting' | 'open' | 'close'; qr: string | null; me: string | null; since: string }

function same(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Secret uit de header (Authorization: Bearer … of x-qr-secret) of uit ?secret=. */
export function givenSecret(req: Pick<IncomingMessage, 'headers' | 'url'>) {
  const auth = req.headers.authorization ?? ''
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  const h = req.headers['x-qr-secret']
  if (typeof h === 'string' && h) return h
  return new URL(req.url ?? '/', 'http://x').searchParams.get('secret') ?? ''
}

export function isAuthorized(req: Pick<IncomingMessage, 'headers' | 'url'>, secret: string | undefined) {
  if (!secret || secret.length < 16) return false
  const given = givenSecret(req)
  return Boolean(given) && same(given, secret)
}

const page = (body: string, refresh = false) =>
  `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">${refresh ? '<meta http-equiv="refresh" content="15">' : ''}<title>IKR WhatsApp-bridge</title><style>body{font-family:system-ui,sans-serif;background:#f4efe6;color:#201737;display:grid;place-items:center;min-height:100vh;margin:0}main{background:#fffaf2;border-radius:24px;padding:32px;max-width:420px;text-align:center}img{width:100%;max-width:320px;image-rendering:pixelated}</style></head><body><main>${body}</main></body></html>`

/**
 * /health (zonder secret, voor fly) en /qr (met QR_SECRET): de QR-code om de bridge te koppelen
 * (WhatsApp → Gekoppelde apparaten → Apparaat koppelen). Er is geen enkele route die iets verstuurt.
 */
export function startServer(port: number, status: () => BridgeStatus, secret: string | undefined): Server {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Robots-Tag', 'noindex')
    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET' }).end()
      return
    }
    if (path === '/health') {
      const s = status()
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, verbinding: s.connection, gekoppeld: Boolean(s.me), sinds: s.since }))
      return
    }
    if (path === '/qr') {
      if (!isAuthorized(req, secret)) {
        res.writeHead(secret ? 401 : 503, { 'Content-Type': 'text/plain; charset=utf-8' }).end(secret ? 'Geen toegang.' : 'QR_SECRET ontbreekt (min. 16 tekens).')
        return
      }
      const s = status()
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      if (s.me && s.connection === 'open') {
        res.writeHead(200).end(page(`<h1>Gekoppeld ✓</h1><p>De bridge leest mee als ${s.me}. Ze verstuurt nooit iets.</p>`))
        return
      }
      if (!s.qr) {
        res.writeHead(200).end(page('<h1>Even geduld…</h1><p>Nog geen QR-code. Deze pagina ververst vanzelf.</p>', true))
        return
      }
      const img = await QRCode.toDataURL(s.qr, { margin: 1, width: 320 })
      res
        .writeHead(200)
        .end(page(`<h1>WhatsApp koppelen</h1><p>WhatsApp → Instellingen → Gekoppelde apparaten → Apparaat koppelen, en scan deze code.</p><img alt="QR-code om WhatsApp te koppelen" src="${img}"><p><small>Ververst elke 15 s (de code verandert).</small></p>`, true))
      return
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Niet gevonden.')
  })
  server.listen(port, '0.0.0.0')
  return server
}

/**
 * Hoe lang een externe dienst mag antwoorden voor we opgeven. Zonder time-out hield een dienst die hangt
 * de pagina of actie vast tot de limiet van de functie (tot 120 s). Lezen: 15 s; schrijven en uploaden: 45 s.
 */
export const READ_TIMEOUT_MS = 15_000
export const WRITE_TIMEOUT_MS = 45_000

export const timeout = (ms = READ_TIMEOUT_MS) => AbortSignal.timeout(ms)

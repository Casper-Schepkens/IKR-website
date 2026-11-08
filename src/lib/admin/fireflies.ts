import 'server-only'

/** Fireflies (GraphQL): check of de bot in de Meet zit, bot toevoegen, transcript ophalen. */

export function isFirefliesConfigured() {
  return Boolean(process.env.FIREFLIES_API_KEY)
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch('https://api.fireflies.ai/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.FIREFLIES_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })
  const json = (await res.json()) as { data?: T; errors?: { message: string; code?: string }[] }
  if (json.errors?.length) {
    const e = json.errors[0]
    if (e.code === 'too_many_requests' || res.status === 429) throw new Error('Fireflies: even te veel aanvragen, probeer zo opnieuw.')
    throw new Error(`Fireflies: ${e.message}`)
  }
  if (!res.ok || !json.data) throw new Error(`Fireflies antwoordde met ${res.status}.`)
  return json.data
}

/** De Meet-code (abc-defg-hij) als vergelijkingssleutel. */
export function meetCode(url: string | null | undefined) {
  return url?.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)?.[1]?.toLowerCase() ?? null
}

export async function isBotInMeeting(meetUrl: string) {
  const code = meetCode(meetUrl)
  const data = await gql<{ active_meetings: { meeting_link: string | null; state: string | null }[] }>(
    'query ActiveMeetings { active_meetings { meeting_link state } }',
    {},
  )
  return data.active_meetings.some((m) => meetCode(m.meeting_link) === code)
}

export async function addBotToMeeting(meetUrl: string, title: string) {
  const data = await gql<{ addToLiveMeeting: { success: boolean } }>(
    'mutation Add($meetingLink: String!, $title: String, $language: String) { addToLiveMeeting(meeting_link: $meetingLink, title: $title, language: $language) { success } }',
    { meetingLink: meetUrl, title, language: 'nl' },
  )
  if (!data.addToLiveMeeting.success) throw new Error('Fireflies kon niet aan de meeting toegevoegd worden.')
}

type Transcript = {
  id: string
  title: string
  date: number | string
  meeting_link: string | null
  transcript_url: string | null
  sentences: { speaker_name: string | null; text: string }[] | null
}

/** Zoekt het transcript van een Meet in een tijdvenster en geeft het als leesbare tekst terug. */
export async function findTranscript(meetUrl: string, from: Date, to: Date) {
  const code = meetCode(meetUrl)
  const data = await gql<{ transcripts: Transcript[] }>(
    `query Transcripts($fromDate: DateTime, $toDate: DateTime) {
      transcripts(fromDate: $fromDate, toDate: $toDate, limit: 50) {
        id title date meeting_link transcript_url sentences { speaker_name text }
      }
    }`,
    { fromDate: from.toISOString(), toDate: to.toISOString() },
  )
  const t = data.transcripts.find((x) => meetCode(x.meeting_link) === code)
  if (!t?.sentences?.length) return null
  return { title: t.title, url: t.transcript_url, text: transcriptText(t.sentences) }
}

/** Opeenvolgende zinnen van dezelfde spreker samenvoegen tot leesbare tekst. */
export function transcriptText(sentences: { speaker_name: string | null; text: string }[]) {
  const blocks: { speaker: string; text: string[] }[] = []
  for (const s of sentences) {
    const speaker = s.speaker_name ?? 'Onbekend'
    const last = blocks[blocks.length - 1]
    if (last?.speaker === speaker) last.text.push(s.text)
    else blocks.push({ speaker, text: [s.text] })
  }
  return blocks.map((b) => `${b.speaker}: ${b.text.join(' ')}`).join('\n\n')
}

export type FirefliesTranscript = {
  id: string
  title: string
  /** ISO */
  date: string | null
  duration: number | null
  meetingLink: string | null
  participants: string[]
  firefliesUrl: string | null
  text: string
}

/** Eén transcript (na de webhook "Transcription completed"). */
export async function getTranscript(id: string): Promise<FirefliesTranscript> {
  const data = await gql<{
    transcript: (Transcript & { duration: number | null; participants: string[] | null }) | null
  }>(
    `query Transcript($id: String!) {
      transcript(id: $id) { id title date duration meeting_link transcript_url participants sentences { speaker_name text } }
    }`,
    { id },
  )
  const t = data.transcript
  if (!t) throw new Error('Fireflies: transcript niet gevonden.')
  const ms = typeof t.date === 'number' ? t.date : t.date ? Date.parse(String(t.date)) : NaN
  return {
    id: t.id,
    title: t.title ?? '',
    date: Number.isFinite(ms) ? new Date(ms).toISOString() : null,
    duration: t.duration ?? null,
    meetingLink: t.meeting_link,
    participants: (t.participants ?? []).map((p) => p.toLowerCase()),
    firefliesUrl: t.transcript_url,
    text: t.sentences?.length ? transcriptText(t.sentences) : '',
  }
}

/** Opname (publieke URL) laten transcriberen; client_reference_id komt terug in de webhook. */
export async function uploadAudio(url: string, title: string, clientReferenceId: string) {
  const data = await gql<{ uploadAudio: { success: boolean; message?: string | null } }>(
    'mutation Upload($input: AudioUploadInput) { uploadAudio(input: $input) { success title message } }',
    { input: { url, title, client_reference_id: clientReferenceId, custom_language: 'nl' } },
  )
  if (!data.uploadAudio.success) throw new Error(`Fireflies weigerde de opname${data.uploadAudio.message ? `: ${data.uploadAudio.message}` : ''}.`)
}

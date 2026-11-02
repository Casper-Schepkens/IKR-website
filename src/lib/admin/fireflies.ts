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
  // Opeenvolgende zinnen van dezelfde spreker samenvoegen.
  const blocks: { speaker: string; text: string[] }[] = []
  for (const s of t.sentences) {
    const speaker = s.speaker_name ?? 'Onbekend'
    const last = blocks[blocks.length - 1]
    if (last?.speaker === speaker) last.text.push(s.text)
    else blocks.push({ speaker, text: [s.text] })
  }
  const body = blocks.map((b) => `${b.speaker}: ${b.text.join(' ')}`).join('\n\n')
  return { title: t.title, url: t.transcript_url, text: body }
}

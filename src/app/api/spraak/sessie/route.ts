import { safePage, voiceRoute } from '@/lib/admin/voice/api'
import { getVoiceSettings, realtimeModel, spentTodayEur, startSession } from '@/lib/admin/voice/store'
import { OWN_TOOLS, toolCatalog } from '@/lib/admin/voice/tools'
import { voiceInstructions } from '@/lib/admin/voice/instructions'

export const dynamic = 'force-dynamic'

/**
 * Microfoon aan: limiet nakijken, gesprek aanmaken en bij OpenAI een sleutel vragen die maar even geldig is.
 * De browser verbindt daarmee rechtstreeks (WebRTC); onze API-sleutel blijft op de server.
 */
export const POST = voiceRoute(async (session, body) => {
  const settings = await getVoiceSettings()
  const spent = await spentTodayEur(settings)
  if (spent.over) throw new Error(`Daglimiet bereikt (€${spent.limit.toFixed(2)}). Aan te passen in Instellingen.`)

  const page = safePage(body.page)
  const model = realtimeModel()
  const { tools, readOnly } = await toolCatalog()
  const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expires_after: { anchor: 'created_at', seconds: 60 },
      session: {
        type: 'realtime',
        model,
        instructions: voiceInstructions({ name: session.user.name, page }),
        output_modalities: ['audio'],
        audio: {
          input: {
            transcription: { model: 'gpt-4o-mini-transcribe', language: 'nl' },
            noise_reduction: { type: 'near_field' },
            turn_detection: { type: 'semantic_vad', eagerness: 'auto' },
          },
          output: { voice: settings.voice },
        },
        tools: [...OWN_TOOLS, ...tools],
        tool_choice: 'auto',
      },
    }),
    signal: AbortSignal.timeout(15_000),
  })
  const data = (await res.json().catch(() => ({}))) as { value?: string; error?: { message?: string } }
  if (!res.ok || !data.value) throw new Error(`OpenAI: ${data.error?.message ?? res.status}`)

  const id = await startSession({ user_email: session.user.email, user_name: session.user.name, model, voice: settings.voice, page })
  return {
    sessie_id: id,
    client_secret: data.value,
    model,
    write_tools: [...readOnly].filter(([, ro]) => !ro).map(([name]) => name),
    vandaag_eur: spent.eur,
    limiet_eur: spent.limit,
  }
})

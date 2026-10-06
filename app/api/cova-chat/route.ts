import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

const MODEL = 'openai/gpt-4.1-mini'
const MAX_PROMPT_CHARS = 6000
const MAX_CONTEXT_CHARS = 18000

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

function safeContext(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  let serialized = '{}'
  try {
    serialized = JSON.stringify(value)
  } catch {
    return {}
  }
  if (serialized.length > MAX_CONTEXT_CHARS) serialized = serialized.slice(0, MAX_CONTEXT_CHARS)
  try {
    return JSON.parse(serialized)
  } catch {
    return {}
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { prompt?: unknown; context?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) return Response.json({ error: 'Prompt is required' }, { status: 400 })
  if (prompt.length > MAX_PROMPT_CHARS) {
    return Response.json({ error: 'Prompt is too long' }, { status: 400 })
  }

  const context = safeContext(body.context)
  const token = process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY
  if (!token) {
    return Response.json({ error: 'Live tutor is not configured' }, { status: 503 })
  }

  const system = [
    'You are Ask Cova, the course-aware tutor inside Cova Campus.',
    'Use the supplied Cova context as the source of truth for the student\'s current course, chapter, mapped topics, exam boundaries, progress, and recent mistakes.',
    'Be concise, clear, instructional, and specific to the supplied course context.',
    'Never claim instructor-specific coverage, dates, policies, or source material unless it appears in the supplied context.',
    'Never reveal hidden answer keys or protected assessment answers. For an active question, teach the concept, give a hint, diagnose a misconception, or create a fresh analogous example instead.',
    'If the supplied course policy says AI assistance is blocked or restricted, follow that policy and explain what learning help is allowed.',
    'If the context does not contain a requested fact, say that Cova does not have that fact mapped yet rather than inventing it.',
    'Do not call this a preview or standalone demo. You are the live Ask Cova tutor using current Cova course context.'
  ].join(' ')

  let gatewayResponse: Response
  try {
    gatewayResponse = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `Current Cova context:\n${JSON.stringify(context)}\n\nStudent question:\n${prompt}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
      cache: 'no-store',
    })
  } catch {
    return Response.json({ error: 'Live tutor is temporarily unavailable' }, { status: 502 })
  }

  let data: any = null
  try {
    data = await gatewayResponse.json()
  } catch {
    return Response.json({ error: 'Live tutor returned an invalid response' }, { status: 502 })
  }

  if (!gatewayResponse.ok) {
    const type = data?.error?.type || data?.error?.code || 'gateway_error'
    console.error('[cova-chat] AI Gateway request failed', gatewayResponse.status, type)
    const status = gatewayResponse.status === 429 ? 429 : 502
    return Response.json({ error: 'Live tutor is temporarily unavailable' }, { status })
  }

  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) {
    return Response.json({ error: 'Live tutor returned an empty response' }, { status: 502 })
  }

  return Response.json({
    text: text.trim(),
    model: data?.model || MODEL,
    usage: data?.usage || null,
    source: 'Live Cova course context',
  })
}

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { listAgents } from '@/lib/ai/registry'
import { routeStudentRequest } from '@/lib/ai/orchestration/router'

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function GET() {
  const user = await getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  return Response.json({
    version: '0.1.0',
    agents: listAgents(),
  })
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const input = (body as { input?: unknown })?.input
  if (typeof input !== 'string' || !input.trim()) {
    return Response.json({ error: 'input is required' }, { status: 400 })
  }

  return Response.json({
    route: routeStudentRequest(input),
  })
}

export const dynamic = 'force-dynamic'

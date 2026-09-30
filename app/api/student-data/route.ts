import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getStudentStore, sanitizeStore, saveStudentStore } from '@/lib/student-data'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ store: await getStudentStore(userId) })
}

export async function PUT(request: Request) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const store = sanitizeStore((body as { store?: unknown })?.store)
  if (!store) return Response.json({ error: 'Invalid or too large' }, { status: 400 })

  await saveStudentStore(userId, store)
  return Response.json({ ok: true })
}

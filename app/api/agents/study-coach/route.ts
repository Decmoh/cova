import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getStudentStore } from '@/lib/student-data'
import { AGENTS } from '@/lib/ai/registry'
import { buildStudentAgentContext } from '@/lib/ai/context/student-context'
import { createStudyCoachRecommendation } from '@/lib/ai/agents/study-coach'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let requestedMinutes = 30

  try {
    const body = (await request.json()) as { minutes?: unknown }
    if (typeof body.minutes === 'number' && Number.isFinite(body.minutes)) {
      requestedMinutes = body.minutes
    }
  } catch {
    // An empty body is valid. Study Coach defaults to a 30-minute session.
  }

  const store = await getStudentStore(userId)
  const context = buildStudentAgentContext(userId, store)
  const recommendation = createStudyCoachRecommendation(
    context,
    requestedMinutes,
  )

  return Response.json({
    agent: {
      id: AGENTS['study-coach'].id,
      name: AGENTS['study-coach'].name,
      version: AGENTS['study-coach'].version,
    },
    recommendation,
    contextSummary: {
      storedRecordCount: context.storedRecordCount,
      detectedAcademicSignals: context.academicSignals.length,
      detectedUpcomingDates: context.upcomingDates.length,
      detectedCourseCodes: context.courseCodes,
    },
  })
}

export const dynamic = 'force-dynamic'

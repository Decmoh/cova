import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AGENTS } from '@/lib/ai/registry'
import { createStudyCoachRecommendation } from '@/lib/ai/agents/study-coach'
import { readStudentAcademicContext } from '@/lib/ai/tools/student-context'
import { createAgentRun, logAgentRun } from '@/lib/ai/runs'

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

  const run = createAgentRun('study-coach')
  logAgentRun({
    runId: run.runId,
    agentId: run.agentId,
    event: 'started',
  })

  try {
    const context = await readStudentAcademicContext(run.agentId, userId)
    const recommendation = createStudyCoachRecommendation(
      context,
      requestedMinutes,
    )

    logAgentRun({
      runId: run.runId,
      agentId: run.agentId,
      event: 'completed',
      durationMs: Date.now() - run.startedAt,
      metadata: {
        storedRecordCount: context.storedRecordCount,
        academicSignals: context.academicSignals.length,
        upcomingDates: context.upcomingDates.length,
      },
    })

    return Response.json({
      runId: run.runId,
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
  } catch {
    logAgentRun({
      runId: run.runId,
      agentId: run.agentId,
      event: 'failed',
      durationMs: Date.now() - run.startedAt,
    })

    return Response.json(
      {
        runId: run.runId,
        error: 'Study Coach could not complete this run.',
      },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'

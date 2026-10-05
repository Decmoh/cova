import type {
  StudentAgentContext,
  StudyCoachRecommendation,
} from '@/lib/ai/types'

const DEFAULT_MINUTES = 30

function urgencyFrom(daysAway?: number, score?: number): StudyCoachRecommendation['urgency'] {
  if (typeof daysAway === 'number' && daysAway <= 2) return 'high'
  if (typeof score === 'number' && score < 55) return 'high'
  if (typeof daysAway === 'number' && daysAway <= 7) return 'medium'
  if (typeof score === 'number' && score < 75) return 'medium'
  return 'low'
}

function planFor(minutes: number, hasWeakness: boolean) {
  if (!hasWeakness) {
    return [
      { minutes: Math.max(10, minutes - 10), action: 'Complete a focused mixed-review set.' },
      { minutes: 10, action: 'Review mistakes and write one takeaway for each miss.' },
    ]
  }

  if (minutes <= 20) {
    return [
      { minutes: 5, action: 'Review the key rule or worked example for the weak area.' },
      { minutes: Math.max(10, minutes - 5), action: 'Do targeted practice on that area.' },
    ]
  }

  return [
    { minutes: 8, action: 'Review the weak concept with one worked example.' },
    { minutes: Math.max(12, minutes - 18), action: 'Complete targeted practice without notes.' },
    { minutes: 10, action: 'Review mistakes and restate the rule from memory.' },
  ]
}

export function createStudyCoachRecommendation(
  context: StudentAgentContext,
  requestedMinutes = DEFAULT_MINUTES,
): StudyCoachRecommendation {
  const minutes = Math.min(120, Math.max(15, Math.round(requestedMinutes)))
  const weakest = context.academicSignals[0]
  const upcoming = context.upcomingDates[0]
  const urgency = urgencyFrom(upcoming?.daysAway, weakest?.normalizedScore)

  const reasons: string[] = []
  if (weakest) {
    reasons.push(
      `${weakest.label} is the weakest detected academic signal at ${weakest.normalizedScore}%.`,
    )
  }
  if (upcoming) {
    reasons.push(
      `${upcoming.label} is the nearest detected deadline, ${upcoming.daysAway} day${upcoming.daysAway === 1 ? '' : 's'} away.`,
    )
  }
  if (!weakest && !upcoming) {
    reasons.push(
      'Cova does not yet have enough structured mastery or deadline data to make a highly specific recommendation.',
    )
  }

  const focusLabel = weakest?.label ?? upcoming?.label ?? 'mixed course review'
  const title = weakest
    ? `Focus on ${weakest.label}`
    : upcoming
      ? `Prepare for ${upcoming.label}`
      : 'Run a focused review session'

  return {
    title,
    summary: `Use the next ${minutes} minutes on ${focusLabel}. Cova selected this from the academic signals currently available in your account.`,
    minutes,
    urgency,
    focus: weakest
      ? { label: weakest.label, score: weakest.normalizedScore }
      : undefined,
    upcoming: upcoming
      ? {
          label: upcoming.label,
          date: upcoming.date,
          daysAway: upcoming.daysAway,
        }
      : undefined,
    plan: planFor(minutes, Boolean(weakest)),
    reasons,
    confidence:
      weakest && upcoming ? 'high' : weakest || upcoming ? 'medium' : 'low',
  }
}

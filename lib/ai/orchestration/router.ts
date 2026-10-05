import type { AgentId } from '@/lib/ai/types'

const ROUTES: Array<{ agent: AgentId; pattern: RegExp; reason: string }> = [
  {
    agent: 'exam-agent',
    pattern: /\b(exam|midterm|final|test|practice exam|exam prep)\b/i,
    reason: 'The request is primarily about exam preparation.',
  },
  {
    agent: 'course-tutor',
    pattern: /\b(explain|teach|why|how does|help me understand|concept)\b/i,
    reason: 'The request is primarily conceptual tutoring.',
  },
  {
    agent: 'semester-planner',
    pattern: /\b(schedule|calendar|plan my week|deadline|assignment|when should i|time available)\b/i,
    reason: 'The request is primarily scheduling and semester planning.',
  },
  {
    agent: 'study-coach',
    pattern: /\b(study|weak|priority|tonight|today|what should i do|focus)\b/i,
    reason: 'The request is primarily about choosing the next best study action.',
  },
]

export function routeStudentRequest(input: string) {
  const text = input.trim()
  for (const route of ROUTES) {
    if (route.pattern.test(text)) {
      return {
        agent: route.agent,
        reason: route.reason,
      }
    }
  }

  return {
    agent: 'study-coach' as const,
    reason: 'Study Coach is the safest default while the agent network is in alpha.',
  }
}

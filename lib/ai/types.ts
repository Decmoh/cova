export type AgentId =
  | 'cova-orchestrator'
  | 'study-coach'
  | 'course-tutor'
  | 'exam-agent'
  | 'semester-planner'

export type AgentStatus = 'active' | 'alpha' | 'disabled'

export type AgentDefinition = {
  id: AgentId
  name: string
  description: string
  version: string
  status: AgentStatus
  tools: string[]
  permissions: string[]
}

export type AcademicSignal = {
  sourceKey: string
  path: string
  label: string
  value: number
  normalizedScore: number
}

export type UpcomingDateSignal = {
  sourceKey: string
  path: string
  label: string
  date: string
  daysAway: number
}

export type StudentAgentContext = {
  userId: string
  generatedAt: string
  storedRecordCount: number
  academicSignals: AcademicSignal[]
  upcomingDates: UpcomingDateSignal[]
  courseCodes: string[]
}

export type StudyCoachRecommendation = {
  title: string
  summary: string
  minutes: number
  urgency: 'low' | 'medium' | 'high'
  focus?: {
    label: string
    score: number
  }
  upcoming?: {
    label: string
    date: string
    daysAway: number
  }
  plan: Array<{
    minutes: number
    action: string
  }>
  reasons: string[]
  confidence: 'low' | 'medium' | 'high'
}

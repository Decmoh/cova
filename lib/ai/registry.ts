import type { AgentDefinition, AgentId } from '@/lib/ai/types'

export const AGENTS: Record<AgentId, AgentDefinition> = {
  'cova-orchestrator': {
    id: 'cova-orchestrator',
    name: 'Cova Orchestrator',
    description: 'Routes student requests to the smallest set of specialized Cova agents.',
    version: '0.1.0',
    status: 'alpha',
    tools: ['route-request'],
    permissions: ['agent-registry'],
  },
  'study-coach': {
    id: 'study-coach',
    name: 'Study Coach',
    description: 'Determines the highest-value academic action for a student right now.',
    version: '0.1.0',
    status: 'active',
    tools: ['read-student-context', 'prioritize-study'],
    permissions: ['student-academic-state'],
  },
  'course-tutor': {
    id: 'course-tutor',
    name: 'Course Tutor',
    description: 'Explains course concepts using the student and course context Cova is allowed to provide.',
    version: '0.1.0',
    status: 'alpha',
    tools: [],
    permissions: ['student-academic-state', 'course-content'],
  },
  'exam-agent': {
    id: 'exam-agent',
    name: 'Exam Agent',
    description: 'Builds exam-prep sequences from exam timing, mastery, and recent mistakes.',
    version: '0.1.0',
    status: 'alpha',
    tools: [],
    permissions: ['student-academic-state', 'exam-state'],
  },
  'semester-planner': {
    id: 'semester-planner',
    name: 'Semester Planner',
    description: 'Coordinates study priorities across courses, deadlines, and available time.',
    version: '0.1.0',
    status: 'alpha',
    tools: [],
    permissions: ['student-academic-state', 'semester-state'],
  },
}

export function listAgents() {
  return Object.values(AGENTS)
}

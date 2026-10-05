import type { AgentId } from '@/lib/ai/types'

type AgentRunEvent = {
  runId: string
  agentId: AgentId
  event: 'started' | 'completed' | 'failed'
  durationMs?: number
  metadata?: Record<string, string | number | boolean | null>
}

export function createAgentRun(agentId: AgentId) {
  return {
    runId: crypto.randomUUID(),
    agentId,
    startedAt: Date.now(),
  }
}

export function logAgentRun(event: AgentRunEvent) {
  console.info('[cova-agent]', JSON.stringify(event))
}

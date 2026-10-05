import { AGENTS } from '@/lib/ai/registry'
import type { AgentId } from '@/lib/ai/types'

export function agentHasPermission(agentId: AgentId, permission: string) {
  return AGENTS[agentId].permissions.includes(permission)
}

export function requireAgentPermission(agentId: AgentId, permission: string) {
  if (!agentHasPermission(agentId, permission)) {
    throw new Error(
      `Agent "${agentId}" is not permitted to access "${permission}".`,
    )
  }
}

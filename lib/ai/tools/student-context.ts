import { getStudentStore } from '@/lib/student-data'
import { buildStudentAgentContext } from '@/lib/ai/context/student-context'
import { requireAgentPermission } from '@/lib/ai/permissions'
import type { AgentId } from '@/lib/ai/types'

const STUDENT_ACADEMIC_PERMISSION = 'student-academic-state'

export async function readStudentAcademicContext(
  agentId: AgentId,
  userId: string,
) {
  requireAgentPermission(agentId, STUDENT_ACADEMIC_PERMISSION)

  const store = await getStudentStore(userId)
  return buildStudentAgentContext(userId, store)
}

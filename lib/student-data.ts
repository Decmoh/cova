import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studentData } from '@/lib/db/schema'

export const STORE_KEY_PREFIX = 'skillgrid-'
const MAX_STORE_BYTES = 4 * 1024 * 1024
const MAX_KEYS = 500

export async function getStudentStore(userId: string) {
  const rows = await db
    .select({ data: studentData.data })
    .from(studentData)
    .where(eq(studentData.userId, userId))
    .limit(1)
  return rows[0]?.data ?? {}
}

export function sanitizeStore(input: unknown): Record<string, string> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const entries = Object.entries(input as Record<string, unknown>)
  if (entries.length > MAX_KEYS) return null
  const clean: Record<string, string> = {}
  let bytes = 0
  for (const [key, value] of entries) {
    if (!key.startsWith(STORE_KEY_PREFIX) || key.length > 200) continue
    if (typeof value !== 'string') continue
    bytes += key.length + value.length
    if (bytes > MAX_STORE_BYTES) return null
    clean[key] = value
  }
  return clean
}

export async function saveStudentStore(userId: string, store: Record<string, string>) {
  await db
    .insert(studentData)
    .values({ userId, data: store, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: studentData.userId,
      set: { data: store, updatedAt: new Date() },
    })
}

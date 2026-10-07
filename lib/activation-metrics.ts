export const ACTIVATION_EVENTS = ['profile_completed','practice_started','answer_submitted','explanation_viewed','independent_correct_answer','session_completed'] as const

export function summarizeActivation(records: unknown[], now = new Date()) {
  const end = now.toISOString().slice(0, 10)
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29)).toISOString().slice(0, 10)
  const events = Object.fromEntries(ACTIVATION_EVENTS.map(name => [name, { students: 0, events: 0 }]))
  let activeStudents = 0
  for (const value of records) {
    try {
      const record = typeof value === 'string' ? JSON.parse(value) : value
      if (!record || record.version !== 1 || !record.days || typeof record.days !== 'object') continue
      const seen = new Set<string>()
      for (const [date, counts] of Object.entries(record.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < start || date > end || !counts || typeof counts !== 'object') continue
        for (const name of ACTIVATION_EVENTS) {
          const count = (counts as Record<string, unknown>)[name]
          if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0 || count > 100000) continue
          events[name].events += count
          seen.add(name)
        }
      }
      if (seen.size) activeStudents++
      for (const name of seen) events[name].students++
    } catch { /* Ignore malformed client records without discarding valid metrics. */ }
  }
  return { start, end, activeStudents, events }
}

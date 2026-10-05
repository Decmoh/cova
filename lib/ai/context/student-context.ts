import type {
  AcademicSignal,
  StudentAgentContext,
  UpcomingDateSignal,
} from '@/lib/ai/types'

const ACADEMIC_SCORE_HINT =
  /(mastery|accuracy|score|percent|percentage|proficiency|readiness|confidence|correct|grade)/i
const ACADEMIC_LABEL_HINT =
  /(topic|concept|unit|chapter|course|class|subject|module|lesson|skill|exam|quiz|test)/i
const DATE_HINT =
  /(exam|quiz|test|midterm|final|assignment|deadline|due|date)/i
const COURSE_CODE = /\b[A-Z]{2,5}\s?-?\d{3,4}[A-Z]?\b/g

type Primitive = string | number | boolean | null

type FlatEntry = {
  sourceKey: string
  path: string
  value: Primitive
  parent?: Record<string, unknown>
}

function parseStoredValue(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function flatten(
  sourceKey: string,
  node: unknown,
  path: string,
  out: FlatEntry[],
  depth = 0,
) {
  if (depth > 8) return

  if (
    node === null ||
    typeof node === 'string' ||
    typeof node === 'number' ||
    typeof node === 'boolean'
  ) {
    out.push({ sourceKey, path, value: node as Primitive })
    return
  }

  if (Array.isArray(node)) {
    node.slice(0, 250).forEach((item, index) => {
      flatten(sourceKey, item, `${path}[${index}]`, out, depth + 1)
    })
    return
  }

  if (typeof node === 'object') {
    const object = node as Record<string, unknown>
    Object.entries(object)
      .slice(0, 500)
      .forEach(([key, value]) => {
        if (
          value === null ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          out.push({
            sourceKey,
            path: path ? `${path}.${key}` : key,
            value: value as Primitive,
            parent: object,
          })
        } else {
          flatten(
            sourceKey,
            value,
            path ? `${path}.${key}` : key,
            out,
            depth + 1,
          )
        }
      })
  }
}

function titleFromParent(parent?: Record<string, unknown>) {
  if (!parent) return null
  for (const key of ['name', 'title', 'topic', 'concept', 'label', 'course', 'subject', 'code']) {
    const value = parent[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function humanizePath(path: string) {
  return (
    path
      .split('.')
      .at(-1)
      ?.replace(/\[\d+\]/g, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Academic signal'
  )
}

function normalizeScore(value: number) {
  if (!Number.isFinite(value)) return null
  const percent = value >= 0 && value <= 1 ? value * 100 : value
  if (percent < 0 || percent > 100) return null
  return Math.round(percent * 10) / 10
}

function academicSignals(entries: FlatEntry[]): AcademicSignal[] {
  const candidates: AcademicSignal[] = []

  for (const entry of entries) {
    if (typeof entry.value !== 'number') continue
    const searchable = `${entry.sourceKey} ${entry.path}`
    if (!ACADEMIC_SCORE_HINT.test(searchable)) continue

    const normalizedScore = normalizeScore(entry.value)
    if (normalizedScore === null) continue

    const parentLabel = titleFromParent(entry.parent)
    const label =
      parentLabel ??
      (ACADEMIC_LABEL_HINT.test(entry.path) ? humanizePath(entry.path) : 'Academic performance')

    candidates.push({
      sourceKey: entry.sourceKey,
      path: entry.path,
      label,
      value: entry.value,
      normalizedScore,
    })
  }

  return candidates
    .sort((a, b) => a.normalizedScore - b.normalizedScore)
    .filter(
      (signal, index, all) =>
        index ===
        all.findIndex(
          (candidate) =>
            candidate.label === signal.label &&
            candidate.normalizedScore === signal.normalizedScore,
        ),
    )
    .slice(0, 20)
}

function upcomingDates(entries: FlatEntry[], now: Date): UpcomingDateSignal[] {
  const candidates: UpcomingDateSignal[] = []

  for (const entry of entries) {
    if (typeof entry.value !== 'string') continue
    const searchable = `${entry.sourceKey} ${entry.path}`
    if (!DATE_HINT.test(searchable)) continue

    const timestamp = Date.parse(entry.value)
    if (!Number.isFinite(timestamp)) continue

    const date = new Date(timestamp)
    const daysAway = Math.ceil((date.getTime() - now.getTime()) / 86_400_000)
    if (daysAway < 0 || daysAway > 180) continue

    candidates.push({
      sourceKey: entry.sourceKey,
      path: entry.path,
      label: titleFromParent(entry.parent) ?? humanizePath(entry.path),
      date: date.toISOString(),
      daysAway,
    })
  }

  return candidates
    .sort((a, b) => a.daysAway - b.daysAway)
    .filter(
      (signal, index, all) =>
        index ===
        all.findIndex(
          (candidate) =>
            candidate.label === signal.label && candidate.date === signal.date,
        ),
    )
    .slice(0, 20)
}

function courseCodes(entries: FlatEntry[]) {
  const codes = new Set<string>()

  for (const entry of entries) {
    if (typeof entry.value !== 'string') continue
    const matches = entry.value.toUpperCase().match(COURSE_CODE) ?? []
    matches.forEach((match) => codes.add(match.replace(/\s*-?\s*/, ' ')))
  }

  return Array.from(codes).slice(0, 30)
}

export function buildStudentAgentContext(
  userId: string,
  store: Record<string, string>,
  now = new Date(),
): StudentAgentContext {
  const entries: FlatEntry[] = []

  for (const [sourceKey, storedValue] of Object.entries(store)) {
    flatten(sourceKey, parseStoredValue(storedValue), '', entries)
  }

  return {
    userId,
    generatedAt: now.toISOString(),
    storedRecordCount: Object.keys(store).length,
    academicSignals: academicSignals(entries),
    upcomingDates: upcomingDates(entries, now),
    courseCodes: courseCodes(entries),
  }
}

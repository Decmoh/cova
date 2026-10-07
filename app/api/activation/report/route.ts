import { headers } from 'next/headers'
import { sql, eq, and, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studentData, user } from '@/lib/db/schema'
import { ACTIVATION_EVENTS, summarizeActivation } from '@/lib/activation-metrics'

export const dynamic = 'force-dynamic'
const OWNER = 'declan.mohan2007@gmail.com'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.email.trim().toLowerCase() !== OWNER) return Response.json({ error: 'Forbidden' }, { status: 403 })
  // Select only the new counters, never Canvas content, answers, or student profiles.
  const rows = await db.select({ analytics: sql<string | null>`${studentData.data}->>'skillgrid-cova-activation-v1'` })
    .from(studentData).innerJoin(user, eq(studentData.userId, user.id))
    .where(and(sql`lower(trim(${user.email})) <> ${OWNER}`, ne(user.role, 'faculty')))
  const summary = summarizeActivation(rows.map(row => row.analytics))
  const csvRows = [
    ['Report', 'Cova activation metrics — aggregate account activity, not Vercel traffic'],
    ['Generated at', new Date().toISOString()],
    ['Start date (UTC, inclusive)', summary.start], ['End date (UTC, inclusive)', summary.end],
    ['Collection', 'New activity since the analytics release; no historical backfill'],
    ['Exclusions', 'Owner and faculty accounts'],
    ['Active student accounts with measured activity', summary.activeStudents],
    ['Interpretation', 'Unique students per action, not an ordered cohort conversion rate'],
    ['Independent correct', 'First attempt, no hint, no guided help, no answer reveal; not a mastery claim'],
    ['Explanation viewed', 'Incorrect-answer feedback visible on screen; not proof it was read'],
    ['Session completed', 'Every question answered; exits and skipped-question sessions excluded'],
    [], ['Event', 'Unique students', 'Event count'],
    ...ACTIVATION_EVENTS.map(name => [name, summary.events[name].students, summary.events[name].events]),
  ]
  const csv = csvRows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  return new Response(`\ufeff${csv}`, { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="cova-activation-metrics.csv"',
    'Cache-Control': 'private, no-store',
  } })
}

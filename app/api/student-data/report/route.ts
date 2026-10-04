import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getStudentStore } from '@/lib/student-data'

function csvCell(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value) ?? ''
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const store = await getStudentStore(session.user.id)
  const rows = [
    ['Metric', 'Value'],
    ['Student', session.user.name],
    ['Email', session.user.email],
    ['Generated at', new Date().toISOString()],
    ['Stored records', Object.keys(store).length],
    [],
    ['Storage key', 'Value'],
    ...Object.entries(store).map(([key, value]) => [key, value]),
  ]
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')

  return new Response(`\ufeff${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="cova-campus-analytics.csv"',
      'Cache-Control': 'private, no-store',
    },
  })
}

export const dynamic = 'force-dynamic'

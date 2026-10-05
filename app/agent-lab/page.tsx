import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AgentLabClient } from '@/components/agent-lab'

const OWNER_EMAIL = 'declan.mohan2007@gmail.com'

export default async function AgentLabPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const isOwner =
    session.user.email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase()

  if (!isOwner) {
    return (
      <main className="min-h-screen bg-background px-6 py-16 text-foreground">
        <div className="mx-auto max-w-xl rounded-2xl border bg-card p-8 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Cova</p>
          <h1 className="mt-2 text-2xl font-semibold">Agent Lab is private</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This internal workspace is currently restricted to the Cova owner.
          </p>
        </div>
      </main>
    )
  }

  return <AgentLabClient userName={session.user.name} />
}

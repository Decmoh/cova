import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { auth } from '@/lib/auth'

export const metadata: Metadata = { title: 'Sign in · Cova Campus', robots: { index: false, follow: true } }

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/')

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <AuthForm mode="sign-in" />
    </main>
  )
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

type Mode = 'sign-in' | 'sign-up'

export function AuthForm({ mode }: { mode: Mode }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const name = String(form.get('name') ?? '').trim()

    if (isSignUp && password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setPending(true)
    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })
    setPending(false)

    if (result.error) {
      console.error('Auth error:', result.error)
      setError(
        isSignUp
          ? 'We couldn’t create your account. Try a different email.'
          : 'Incorrect email or password.',
      )
      return
    }

    window.location.href = '/'
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          C
        </span>
        <span className="text-lg font-semibold tracking-tight text-foreground">Cova Campus</span>
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
        {isSignUp ? 'Get started' : 'Welcome back'}
      </p>
      <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-foreground">
        {isSignUp ? 'Create your student account' : 'Sign in to your account'}
      </h1>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
        {isSignUp
          ? 'Your progress, practice, and career work save to your account automatically.'
          : 'Pick up right where you left off on any device.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {isSignUp && (
          <Field label="Full name" name="name" type="text" autoComplete="name" />
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          minLength={isSignUp ? 8 : undefined}
        />

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 h-11 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? 'Already have an account? ' : 'New to Cova Campus? '}
        <Link
          href={isSignUp ? '/sign-in' : '/sign-up'}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {isSignUp ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </div>
  )
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        name={name}
        required
        className="h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        {...props}
      />
    </label>
  )
}

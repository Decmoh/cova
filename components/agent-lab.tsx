'use client'

import { useEffect, useState } from 'react'

type AgentDefinition = {
  id: string
  name: string
  description: string
  version: string
  status: string
  tools: string[]
  permissions: string[]
}

type StudyCoachResult = {
  runId: string
  agent: {
    id: string
    name: string
    version: string
  }
  recommendation: {
    title: string
    summary: string
    minutes: number
    urgency: string
    focus?: {
      label: string
      score: number
    }
    upcoming?: {
      label: string
      date: string
      daysAway: number
    }
    plan: Array<{
      minutes: number
      action: string
    }>
    reasons: string[]
    confidence: string
  }
  contextSummary: {
    storedRecordCount: number
    detectedAcademicSignals: number
    detectedUpcomingDates: number
    detectedCourseCodes: string[]
  }
}

export function AgentLabClient({ userName }: { userName: string }) {
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [minutes, setMinutes] = useState(30)
  const [result, setResult] = useState<StudyCoachResult | null>(null)
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    fetch('/api/agents', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load the agent registry.')
        return response.json() as Promise<{ agents: AgentDefinition[] }>
      })
      .then((data) => {
        if (active) setAgents(data.agents)
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Unknown error')
        }
      })
      .finally(() => {
        if (active) setLoadingAgents(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function runStudyCoach() {
    setRunning(true)
    setError(null)

    try {
      const response = await fetch('/api/agents/study-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ minutes }),
      })

      const data = (await response.json()) as StudyCoachResult & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error ?? 'Study Coach run failed.')
      }

      setResult(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 border-b pb-8">
          <p className="text-sm font-medium text-muted-foreground">
            Internal workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Cova Agent Lab
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Signed in as {userName}. This page exercises the Agent OS against
            your real Cova account without changing the student-facing product.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            {error}
          </div>
        ) : null}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Registry
              </p>
              <h2 className="mt-1 text-xl font-semibold">Agent network</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {loadingAgents ? 'Loading…' : `${agents.length} registered`}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <article
                key={agent.id}
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{agent.name}</h3>
                  <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                    {agent.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {agent.description}
                </p>
                <div className="mt-4 text-xs text-muted-foreground">
                  v{agent.version} · {agent.tools.length} tools ·{' '}
                  {agent.permissions.length} permissions
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Executable agent
            </p>
            <h2 className="mt-1 text-xl font-semibold">Study Coach</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Reads only the academic state allowed by its tool permission and
              converts it into a focused study recommendation.
            </p>

            <label className="mt-6 block text-sm font-medium">
              Available minutes
            </label>
            <input
              type="number"
              min={15}
              max={120}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none"
            />

            <button
              type="button"
              onClick={runStudyCoach}
              disabled={running}
              className="mt-4 w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? 'Running Study Coach…' : 'Run Study Coach'}
            </button>
          </div>

          <div className="min-h-80 rounded-2xl border bg-card p-6 shadow-sm">
            {!result ? (
              <div className="flex min-h-64 items-center justify-center text-center">
                <div>
                  <p className="font-medium">No run yet</p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Run Study Coach to inspect the first real agent decision
                    generated from your Cova student state.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Run {result.runId}</span>
                  <span>·</span>
                  <span>{result.recommendation.confidence} confidence</span>
                  <span>·</span>
                  <span>{result.recommendation.urgency} urgency</span>
                </div>

                <h2 className="mt-4 text-2xl font-semibold">
                  {result.recommendation.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {result.recommendation.summary}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="Academic signals"
                    value={result.contextSummary.detectedAcademicSignals}
                  />
                  <Metric
                    label="Upcoming dates"
                    value={result.contextSummary.detectedUpcomingDates}
                  />
                  <Metric
                    label="Stored records"
                    value={result.contextSummary.storedRecordCount}
                  />
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold">Plan</h3>
                  <div className="mt-3 space-y-2">
                    {result.recommendation.plan.map((step, index) => (
                      <div
                        key={`${step.action}-${index}`}
                        className="flex gap-3 rounded-xl border p-3"
                      >
                        <span className="min-w-12 text-sm font-semibold">
                          {step.minutes}m
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {step.action}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold">Why Cova chose this</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {result.recommendation.reasons.map((reason) => (
                      <li key={reason}>• {reason}</li>
                    ))}
                  </ul>
                </div>

                {result.contextSummary.detectedCourseCodes.length ? (
                  <p className="mt-6 text-xs text-muted-foreground">
                    Detected courses:{' '}
                    {result.contextSummary.detectedCourseCodes.join(', ')}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DEFAULT_REPETITIONS, DEFAULT_TARGETS } from '../lib/defaults.ts'

/**
 * Starts a run and navigates to its page (SPEC C3).
 *
 * **It states what the run will cost before the button is pressed.** This is the
 * one moment in the product where the operator commits real money, and the
 * information exists everywhere except here: C2's warning is computed from
 * defaults it admits are hypothetical, and the run page's "planned attempts" is
 * only visible once the run has already been queued.
 *
 * The figure below needs no round trip, because this component knows every input:
 * the prompt count comes from the page, and N and the target list are the defaults
 * this dialog actually submits. If it ever gains controls for N or the targets,
 * the count must be computed from those controls instead - a stated figure that
 * does not match what is sent is worse than none.
 */
export function StartRunDialog({
  companyId,
  promptCount,
}: {
  companyId: string
  promptCount: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetCount = DEFAULT_TARGETS.length
  const plannedCalls = promptCount * targetCount * DEFAULT_REPETITIONS

  async function start(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const body: unknown = await response.json()
      if (!response.ok) {
        const message =
          typeof body === 'object' && body !== null && 'error' in body
            ? String((body as { error: unknown }).error)
            : `Request failed with ${response.status}`
        throw new Error(message)
      }
      const runId = (body as { runId: string }).runId
      router.push(`/runs/${runId}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm text-neutral-800">
        Starting this run makes <span className="font-medium">{plannedCalls} provider calls</span>{' '}
        — {promptCount} {promptCount === 1 ? 'prompt' : 'prompts'} × {targetCount} targets × N=
        {DEFAULT_REPETITIONS} — and every one of them costs real money.
      </p>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="rounded border border-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'Starting…' : `Start a run (${plannedCalls} calls)`}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}

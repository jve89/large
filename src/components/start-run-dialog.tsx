'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Starts a run and navigates to its page.
 *
 * Phase 0 renders a single button at the defaults, which is all the walking
 * skeleton needs to trigger one run through the web service. Phase 3 turns this
 * into a real dialog where the operator chooses N and the target list.
 */
export function StartRunDialog({ companyId }: { companyId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="rounded border border-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'Starting…' : 'Start a run'}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}

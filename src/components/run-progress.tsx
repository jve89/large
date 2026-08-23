'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Polls the run endpoint every two seconds while the run is `queued` or `running`
 * and stops once it is terminal.
 *
 * A run takes minutes, so a two-second delay is invisible and polling reuses the
 * endpoint that already exists. Server-sent events are a v2 item.
 */
export function RunProgress({ runId, initialStatus }: { runId: string; initialStatus: string }) {
  const router = useRouter()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [status, setStatus] = useState(initialStatus)

  useEffect(() => {
    if (status !== 'queued' && status !== 'running') return

    let cancelled = false

    const tick = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/runs/${runId}`, { cache: 'no-store' })
        if (!response.ok) return
        const body = (await response.json()) as {
          run: { status: string }
          progress: { done: number; total: number }
        }
        if (cancelled) return
        setProgress(body.progress)
        if (body.run.status !== status) {
          setStatus(body.run.status)
          // Terminal or not, the server component holds the real detail.
          router.refresh()
        }
      } catch {
        // A dropped poll is not worth surfacing; the next tick retries.
      }
    }

    void tick()
    const timer = setInterval(() => void tick(), 2000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [runId, status, router])

  if (status !== 'queued' && status !== 'running') return null

  return (
    <p className="mt-2 text-sm text-neutral-600">
      {status === 'queued' ? 'Queued, waiting for a worker' : 'Running'}
      {progress ? ` — ${progress.done} of ${progress.total} attempts stored` : ''}
    </p>
  )
}

/**
 * Raw provider response capture, and failure evidence.
 *
 * Two jobs, both about the same problem: **a fixture is frozen evidence, and
 * frozen evidence rots.** A provider changes its response shape, the stored
 * fixtures still pass because they are stored, and the adapter goes green against
 * a provider that no longer exists - the same class of failure as a deploy trigger
 * that reports success while deploying nothing.
 *
 * 1. **Capture mode.** When `PROVIDER_CAPTURE_DIR` is set, every raw provider
 *    response is written there as JSON. Off by default and asserted off during the
 *    test suite. It exists so that recapturing every fixture after a provider or
 *    model change is one command rather than an archaeology session - which is
 *    what makes the "recapture when the pinned model moves" rule survivable rather
 *    than merely annoying. It is deliberately a facility rather than a debug edit
 *    made during a gate run, because a debug edit made during a gate run is
 *    exactly the kind of thing that stays in.
 *
 * 2. **Failure evidence.** Nothing in the data model retains a raw provider
 *    response: a failed `Answer` stores `failureReason`, a short string, and
 *    nothing else. So without this, the first real web-search error this system
 *    ever sees in production would teach us nothing, and the error fixtures would
 *    stay *documented* rather than *observed* forever. Retaining the response
 *    properly would need a column, and a schema change is a stop-and-ask under
 *    CLAUDE.md -> Stop points - so it goes to the log instead, where the worker's
 *    stdout is already collected by the host.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Provider } from '@prisma/client'

/** How much of a response body is logged on a failure. Enough to rebuild a shape. */
const FAILURE_LOG_LIMIT = 4000

let counter = 0

function captureDir(): string | null {
  const dir = process.env.PROVIDER_CAPTURE_DIR?.trim()
  return dir ? dir : null
}

/** True when capture mode is on. Exported so a test can assert it is off. */
export function isCaptureEnabled(): boolean {
  return captureDir() !== null
}

/**
 * Writes one raw provider response to the capture directory, when capture mode is
 * on. A no-op otherwise - this sits on the hot path of every provider call.
 *
 * Never throws: a capture failure must not turn a paid-for answer into a failed
 * attempt.
 */
export function captureProviderResponse(
  provider: Provider,
  modelId: string,
  response: unknown,
): void {
  const dir = captureDir()
  if (!dir) return

  try {
    mkdirSync(dir, { recursive: true })
    counter += 1
    const name = `${provider}-${modelId}-${String(counter).padStart(3, '0')}.json`
    writeFileSync(
      path.join(dir, name),
      JSON.stringify({ provider, modelId, response }, null, 2),
      'utf8',
    )
  } catch {
    // Capture is diagnostic. Losing it must never cost an answer.
  }
}

/**
 * Records the shape behind a failed attempt, so that a real production failure can
 * later become an *observed* fixture instead of a documented one.
 *
 * Goes to stderr, and additionally to the capture directory when capture mode is
 * on. Truncated, because a response can be large and this is evidence of a shape
 * rather than an archive.
 */
export function logFailureEvidence(
  provider: Provider,
  modelId: string,
  reason: string,
  response: unknown,
): void {
  let body: string
  try {
    body = JSON.stringify(response) ?? 'undefined'
  } catch {
    body = `<unserialisable: ${String(response)}>`
  }
  const truncated =
    body.length > FAILURE_LOG_LIMIT
      ? `${body.slice(0, FAILURE_LOG_LIMIT)}… [truncated from ${body.length} chars]`
      : body

  console.warn(
    `[provider-failure] ${provider}:${modelId} — ${reason}\n` +
      `[provider-failure] raw response: ${truncated}`,
  )

  const dir = captureDir()
  if (!dir) return
  try {
    mkdirSync(dir, { recursive: true })
    appendFileSync(
      path.join(dir, 'failures.jsonl'),
      `${JSON.stringify({ provider, modelId, reason, response })}\n`,
      'utf8',
    )
  } catch {
    // Diagnostic only.
  }
}

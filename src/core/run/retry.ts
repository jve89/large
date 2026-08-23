/**
 * Retry policy for provider calls (SPEC C6).
 *
 * **Three attempts in total** — the initial call plus two retries, not three
 * retries. `Answer.httpAttempts` records what was actually spent, so an off-by-one
 * here is visible in the data and in the bill (CLAUDE.md rule 11).
 *
 * Only a result the adapter marked `retryable` is retried: a rate limit, a timeout
 * or a 5xx. A web search error object is not retryable — the call succeeded at the
 * HTTP level and the provider told us the search failed.
 */
import type { ProviderResult } from '../providers/types.ts'

/** The initial call plus two retries. */
export const MAX_ATTEMPTS_TOTAL = 3

export interface RetryOutcome {
  readonly result: ProviderResult
  /** How many HTTP attempts were actually spent, 1..MAX_ATTEMPTS_TOTAL. */
  readonly httpAttempts: number
}

export interface RetryOptions {
  readonly maxAttempts?: number
  readonly baseDelayMs?: number
  readonly signal?: AbortSignal
  /** Test seam so a test never actually waits. */
  readonly sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(new Error('aborted'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Exponential backoff: base, then base * 2, and so on. */
export function backoffDelayMs(attempt: number, baseDelayMs: number): number {
  return baseDelayMs * 2 ** (attempt - 1)
}

/**
 * Calls `attempt` until it returns a non-retryable result or the attempt budget is
 * exhausted, and reports how many attempts that cost.
 */
export async function withRetries(
  attempt: (attemptNumber: number) => Promise<ProviderResult>,
  options: RetryOptions = {},
): Promise<RetryOutcome> {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS_TOTAL
  const baseDelayMs = options.baseDelayMs ?? 1000
  const sleep = options.sleep ?? defaultSleep

  let last: ProviderResult = {
    ok: false,
    reason: 'no attempt was made',
    retryable: false,
  }

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    last = await attempt(attemptNumber)

    if (last.ok || !last.retryable) {
      return { result: last, httpAttempts: attemptNumber }
    }

    const isFinalAttempt = attemptNumber === maxAttempts
    if (isFinalAttempt) {
      return { result: last, httpAttempts: attemptNumber }
    }

    await sleep(backoffDelayMs(attemptNumber, baseDelayMs), options.signal)
  }

  return { result: last, httpAttempts: maxAttempts }
}

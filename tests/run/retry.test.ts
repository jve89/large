import { describe, expect, it, vi } from 'vitest'
import type { ProviderResult } from '../../src/core/providers/types.ts'
import { MAX_ATTEMPTS_TOTAL, backoffDelayMs, withRetries } from '../../src/core/run/retry.ts'

const ok: ProviderResult = {
  ok: true,
  text: 'answer',
  citations: [],
  usage: { inputTokens: 1, outputTokens: 1, searchCount: 1 },
  costMicros: 0n,
  latencyMs: 1,
}

const retryable: ProviderResult = { ok: false, reason: 'rate limited', retryable: true }
const permanent: ProviderResult = { ok: false, reason: 'web search error', retryable: false }

const noSleep = async (): Promise<void> => {}

describe('withRetries', () => {
  it('makes three attempts in total, not three retries', () => {
    expect(MAX_ATTEMPTS_TOTAL).toBe(3)
  })

  it('spends one attempt when the first call succeeds', async () => {
    const attempt = vi.fn(async () => ok)
    const outcome = await withRetries(attempt, { sleep: noSleep })
    expect(outcome.httpAttempts).toBe(1)
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('stops at three attempts when every call is retryable', async () => {
    const attempt = vi.fn(async () => retryable)
    const outcome = await withRetries(attempt, { sleep: noSleep })
    expect(attempt).toHaveBeenCalledTimes(3)
    expect(outcome.httpAttempts).toBe(3)
    expect(outcome.result.ok).toBe(false)
  })

  it('does not retry a non-retryable failure', async () => {
    // A web search error object is HTTP 200: the call worked, the search did not.
    const attempt = vi.fn(async () => permanent)
    const outcome = await withRetries(attempt, { sleep: noSleep })
    expect(attempt).toHaveBeenCalledTimes(1)
    expect(outcome.httpAttempts).toBe(1)
  })

  it('reports the attempts actually spent when a retry succeeds', async () => {
    const attempt = vi
      .fn<(n: number) => Promise<ProviderResult>>()
      .mockResolvedValueOnce(retryable)
      .mockResolvedValueOnce(ok)
    const outcome = await withRetries(attempt, { sleep: noSleep })
    expect(outcome.httpAttempts).toBe(2)
    expect(outcome.result.ok).toBe(true)
  })

  it('backs off exponentially between attempts', () => {
    expect(backoffDelayMs(1, 1000)).toBe(1000)
    expect(backoffDelayMs(2, 1000)).toBe(2000)
    expect(backoffDelayMs(3, 1000)).toBe(4000)
  })

  it('waits between attempts but not after the last one', async () => {
    const sleep = vi.fn(async () => {})
    await withRetries(async () => retryable, { sleep })
    expect(sleep).toHaveBeenCalledTimes(2)
  })
})

/**
 * A recording `ProviderAdapter` for tests.
 *
 * Stubbing is correct here. CLAUDE.md's "no fixture, no stub" binds the Phase 0
 * skeleton path and `verify:live` - the places whose whole job is to prove the
 * real providers are reached. Unit tests are the other case, and
 * `ExecuteDeps.adapterFor` in src/core/run/execute.ts exists precisely as this
 * seam. The rules being tested here - which attempts are issued, and what terminal
 * status follows - are about the worker's arithmetic, not about either provider.
 *
 * The recorder is the point: SPEC C15 says a resumed run executes *only* the
 * combinations with no stored answer, and the way to prove that is that the call
 * was never made, not that a duplicate insert was rejected afterwards.
 */
import type { Provider } from '@prisma/client'
import type { ProviderAdapter, ProviderResult, Target } from '../../src/core/providers/types.ts'

export interface StubCall {
  readonly provider: Provider
  readonly modelId: string
  readonly prompt: string
}

export interface StubAdapterFactory {
  /** Every call made, in the order the adapters were asked. */
  readonly calls: StubCall[]
  /** Pass to `ExecuteDeps.adapterFor`. */
  readonly adapterFor: (target: Target) => ProviderAdapter
}

export function okResult(text: string, overrides: Partial<Extract<ProviderResult, { ok: true }>> = {}) {
  return {
    ok: true as const,
    text,
    citations: [{ url: 'https://example.com/a', title: 'A source' }],
    usage: { inputTokens: 100, outputTokens: 200, searchCount: 1 },
    costMicros: 1_000n,
    latencyMs: 42,
    ...overrides,
  }
}

export function failedResult(reason: string, retryable = false): ProviderResult {
  return { ok: false, reason, retryable }
}

/**
 * Builds an adapter factory whose behaviour is decided per call by `respond`.
 *
 * `respond` receives the target and prompt and the number of calls already made
 * against that same target, so a test can make one provider degrade while the
 * other stays healthy - the case CLAUDE.md rule 3 exists for.
 */
export function createStubAdapters(
  respond: (call: StubCall, callIndexForTarget: number) => ProviderResult,
): StubAdapterFactory {
  const calls: StubCall[] = []
  const perTarget = new Map<string, number>()

  const adapterFor = (target: Target): ProviderAdapter => ({
    provider: target.provider,
    modelId: target.modelId,
    async ask(prompt: string): Promise<ProviderResult> {
      const call: StubCall = {
        provider: target.provider,
        modelId: target.modelId,
        prompt,
      }
      const key = `${target.provider}:${target.modelId}`
      const index = perTarget.get(key) ?? 0
      perTarget.set(key, index + 1)
      calls.push(call)
      return respond(call, index)
    },
  })

  return { calls, adapterFor }
}

/** Every call succeeds. */
export function alwaysOk(): StubAdapterFactory {
  return createStubAdapters((call) => okResult(`an answer to: ${call.prompt}`))
}

/** Every call fails, non-retryably, so no attempt is spent on a retry. */
export function alwaysFails(reason = 'stubbed failure'): StubAdapterFactory {
  return createStubAdapters(() => failedResult(reason))
}

/**
 * The only contract the runner knows about a provider.
 *
 * Nothing outside this directory names a provider (CLAUDE.md rule 9). Targets are
 * a list; a third provider is a new file plus a registry entry, never a change to
 * a caller.
 */
import type { Provider } from '@prisma/client'

/** One (provider, model id) pair. v1 configures two; nothing assumes two. */
export interface Target {
  readonly provider: Provider
  readonly modelId: string
}

export interface ProviderCitation {
  readonly url: string
  readonly title: string | null
}

export interface ProviderUsage {
  readonly inputTokens: number
  readonly outputTokens: number
  /** Web searches the provider's server-side tool actually performed. */
  readonly searchCount: number
}

export type ProviderResult =
  | {
      ok: true
      text: string
      citations: ProviderCitation[]
      usage: ProviderUsage
      costMicros: bigint
      latencyMs: number
    }
  | { ok: false; reason: string; retryable: boolean }

export interface ProviderAdapter {
  readonly provider: Provider
  readonly modelId: string
  /**
   * Sends the prompt **unmodified** with the provider's server-side web search
   * enabled: no system prompt, no temperature or top_p, no length instruction.
   * `max_tokens` is the only other parameter and exists solely so an answer is
   * never truncated. Steering the model raises the measured numbers and destroys
   * their meaning.
   *
   * Returns `{ ok: false }` — it does not throw — when the provider replies with a
   * web search **error object** rather than a result list. Both providers return
   * that as HTTP 200 (as researched 2026-08-23; re-check, don't trust), so an
   * adapter that only caught exceptions would record it as a successful answer
   * with zero citations. That is the failure mode the verification gate exists to
   * catch (SPEC C7).
   */
  ask(prompt: string, signal: AbortSignal): Promise<ProviderResult>
}

/**
 * The only parameter set beyond the tool declaration, and it exists solely so an
 * answer is never truncated — a truncated answer can cut off a brand, which would
 * then be counted as absent.
 *
 * 128,000 is the documented maximum output for both pinned models
 * (claude-sonnet-5 and gpt-5.6-terra), as researched 2026-08-23; re-check, don't
 * trust. A cap costs nothing: billing is per token generated, not per token
 * allowed, so the maximum is the safe value rather than an expensive one.
 */
export const MAX_OUTPUT_TOKENS = 128_000

export function targetKey(target: Target): string {
  return `${target.provider}:${target.modelId}`
}

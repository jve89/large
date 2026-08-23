/**
 * The v1 measurement configuration.
 *
 * `DEFAULT_TARGETS` is a **list**. Nothing indexes it by position and nothing
 * assumes its length is two (CLAUDE.md rule 9). Adding a provider is an entry
 * here plus an adapter file in src/core/providers/.
 *
 * These two figures are what SPEC C2's over-50-prompts warning must name when it
 * states a resulting call count, because the prompt endpoint cannot know the N or
 * the targets of any future run.
 */
import type { Target } from '../core/providers/types.ts'

/**
 * N — independent attempts per (prompt, target). LLM answers are
 * non-deterministic; a single attempt is a sample of one.
 *
 * Whether N=3 is stable enough to be believed is settled empirically in Phase 9,
 * not here (SPEC -> Open questions).
 */
export const DEFAULT_REPETITIONS = 3

/**
 * Model ids are confirmed against each provider's live models endpoint in Phase 0
 * before they are written into an adapter (as researched 2026-08-23; re-check,
 * don't trust).
 */
export const DEFAULT_TARGETS: readonly Target[] = [
  { provider: 'anthropic', modelId: 'claude-sonnet-5' },
  { provider: 'openai', modelId: 'gpt-5.6-terra' },
]

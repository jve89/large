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
 * The largest N `POST /api/runs` will accept.
 *
 * **This is a cost guardrail, not a spec rule.** No capability, definition or key
 * decision names it; it was introduced in Phase 0 as a literal inside the route's
 * zod schema and moved here in Phase 3 so that it is visible as the invention it
 * is. `Run.repetitions` carries CHECK >= 1, which *is* normative; there is no
 * corresponding upper bound in the database.
 *
 * It exists because N multiplies the call count of every run: at 51 prompts and
 * two targets, N=50 is 5,100 provider calls from one careless request. The quota
 * stage in `PLAN.md` -> Roadmap beyond v1 supersedes it, because a run a customer
 * has already paid for needs no arbitrary ceiling.
 *
 * Do not read 50 as normative, and do not delete it as arbitrary. Both are wrong.
 */
export const MAX_REPETITIONS = 50

/**
 * Model ids are confirmed against each provider's live models endpoint in Phase 0
 * before they are written into an adapter (as researched 2026-08-23; re-check,
 * don't trust).
 */
export const DEFAULT_TARGETS: readonly Target[] = [
  { provider: 'anthropic', modelId: 'claude-sonnet-5' },
  { provider: 'openai', modelId: 'gpt-5.6-terra' },
]

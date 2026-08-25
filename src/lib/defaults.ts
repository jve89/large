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
 * The largest prompt list a run may be queued against.
 *
 * Like `MAX_REPETITIONS` this is a **cost guardrail, not a spec rule** - and like
 * it, the number is arithmetic rather than taste. The first real measurement, in
 * Phase 4's browser pass, was 429,238 micro-dollars for six calls: about
 * **$0.072 per provider call** (as measured 2026-08-25; re-check, don't trust -
 * it moves with token counts and with each provider's prices).
 *
 * A run costs prompts x targets x N x $0.072. At the current two targets and the
 * default N of 3, that is about **$0.43 per prompt**, so 100 prompts is roughly
 * **$43** for one run. The absolute ceiling, at `MAX_REPETITIONS` of 50, is
 * 100 x 2 x 50 = 10,000 calls, about **$715** - and that ceiling is dominated by
 * N, not by this bound.
 *
 * 100 is chosen as twice C2's warning threshold of 50: a genuinely long list still
 * saves and still runs, carrying the warning C2 requires, while a careless paste
 * cannot turn into an unbounded bill. Without any bound the cost of one run is
 * unbounded, and stating the call count before the click limits surprise but not
 * exposure.
 *
 * Enforced at **queue** time rather than at save time, deliberately: C2 says a
 * list over 50 "SHALL still allow the save", so refusing to store a long list
 * would contradict it. Saving is free; running is what spends money.
 */
export const MAX_PROMPTS = 100

/**
 * Model ids are confirmed against each provider's live models endpoint in Phase 0
 * before they are written into an adapter (as researched 2026-08-23; re-check,
 * don't trust).
 */
export const DEFAULT_TARGETS: readonly Target[] = [
  { provider: 'anthropic', modelId: 'claude-sonnet-5' },
  { provider: 'openai', modelId: 'gpt-5.6-terra' },
]

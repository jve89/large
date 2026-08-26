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
 * two targets, N=50 is 5,100 provider calls from one careless request. Bounding N
 * alone never fixed that, though - the product of the three factors is what costs
 * money, and `MAX_PLANNED_CALLS` below is the bound on it. This one survives as
 * the sanity limit on N by itself. The quota stage in `PLAN.md` -> Roadmap beyond
 * v1 supersedes both, because a run a customer has already paid for needs no
 * arbitrary ceiling.
 *
 * Do not read 50 as normative, and do not delete it as arbitrary. Both are wrong.
 */
export const MAX_REPETITIONS = 50

/**
 * A fallback average cost of one provider call, in integer micro-dollars, used
 * only when nothing has been stored to measure instead.
 *
 * **This is an observation, not a price** - which is why it is here and not in
 * `src/core/providers/pricing.ts`. CLAUDE.md rule 12 governs per-token and
 * per-search *prices*, each of which is a figure a provider publishes. This is a
 * figure this system measured about its own traffic: how many tokens a
 * buying-moment prompt with web search actually costs once answered. It is used
 * only to state an estimate in a refusal message. No stored `costMicros` is ever
 * computed from it - those come from `costMicrosFor` and the real usage figures.
 *
 * Measured 2026-08-25 over the 14 successful answers stored to date, all real
 * provider calls: anthropic averaged 78,463 micro-dollars per call (20,081 input
 * tokens, 1,830 output, 2.00 searches) and openai 82,223 (21,565 / 1,472 / 2.14).
 * 80,000 is the round figure between them; re-check, don't trust - it moves with
 * answer length and with each provider's prices.
 *
 * It supersedes the 71,540 figure this file previously carried, which came from
 * only six calls in Phase 4's browser pass.
 *
 * **Treat 80,000 as provisional.** Fourteen answers is not a sample, and the
 * figure has a driver that has not been characterised: how many web searches a
 * question provokes. "Who is the best plumber in Amsterdam" plausibly triggers
 * more searches than a factual question, which would mean this product's unit cost
 * varies with the kind of question a customer asks - and that matters for pricing
 * later, where the spread matters as much as the mean. Phase 9 re-derives it
 * against a real sample and records the spread, not only the mean.
 *
 * Nothing shown to an operator uses this constant while stored answers exist:
 * `src/core/run/estimate.ts` computes the figure from them, precisely so that no
 * displayed dollar amount is a literal that can rot.
 */
export const FALLBACK_MICROS_PER_CALL = 80_000n

/**
 * The largest number of provider calls a single run may plan.
 *
 * **This is the cost bound.** `MAX_PROMPTS` and `MAX_REPETITIONS` below are sanity
 * limits on their own quantity; this one bounds the quantity that actually spends
 * money. A run costs prompts x targets x N calls, and bounding any single one of
 * those three factors leaves the product unbounded: at `MAX_PROMPTS` of 100 and
 * `MAX_REPETITIONS` of 50 against the current two targets, a run that passes both
 * of those limits plans 10,000 calls - about **$800** from one request that
 * violates nothing.
 *
 * 300 calls was about **$24** at the average measured on 2026-08-25. That figure
 * is illustration only and is not what the refusal message prints: the message
 * derives its estimate from stored answers (`src/core/run/estimate.ts`), because a
 * per-call cost written down as a literal goes stale, and stale low. The bound
 * itself is on the call count, which is exact.
 *
 * What 300 allows, against the current two targets:
 *
 *   - a real client run of 20 prompts at the default N=3 - 120 calls, ~$10;
 *   - Phase 9's ten-prompt real-brand run at N=3 - 60 calls, ~$5;
 *   - 50 prompts at N=3, exactly at the limit - 300 calls, ~$24. Fifty is C2's
 *     warning threshold, so the longest list C2 considers ordinary still runs at
 *     the default N;
 *   - the full 100-prompt list at N=1 - 200 calls, ~$16.
 *
 * What it refuses: the full 100-prompt list at the default N=3 (600 calls, ~$48),
 * anything above N=3 on a list longer than 50, and the 10,000-call ceiling
 * entirely. `MAX_PROMPTS` is therefore no longer reachable at the default N, and
 * that is deliberate - a 100-prompt run is unusual, and the intent is that an
 * unusual run is refused and raised deliberately rather than discovered on a
 * statement.
 *
 * The unit is calls rather than dollars for a second reason: calls scale with the
 * target list, which is on the roadmap to grow. A third provider makes every run
 * 1.5x - a 20-prompt analysis goes from 120 calls to 180 - and 300 absorbs that
 * without starting to refuse ordinary work.
 *
 * Raising it is one edit here. Do that in preference to weakening the check.
 *
 * **Temporarily 100 for Phase 9, 2026-08-26, on the operator's instruction.**
 * Every run Phase 9 plans is 60 calls - ten prompts x two targets x N=3 - so
 * nothing legitimate is refused, while a mis-click that would have cost three
 * times as much is refused before a single provider call. The Phase 9 runs are
 * the first real spend against a real client's prompts and the first this project
 * has queued from the UI rather than from a script, which is exactly when a
 * wrong N or a doubled prompt list is plausible.
 *
 * **Raise it back to 300 after Phase 9.** Two consequences are live while it is
 * lowered, and both are intended: `MAX_PROMPTS` is now unreachable at every N
 * against the current two targets, so a maximal prompt list is refused by the
 * ceiling rather than by its own limit; and a 20-prompt client run at N=3 - 120
 * calls, the ordinary case this ceiling was sized for - is refused too. That
 * second one is why this is temporary and not a decision.
 */
export const MAX_PLANNED_CALLS = 100

/**
 * The largest prompt list a run may be queued against.
 *
 * **This is a list-shape limit and no longer a cost one. Read that literally.**
 * `MAX_PLANNED_CALLS` subsumes it entirely for cost: at the current two targets
 * and a ceiling of 300 this bound binds only at N=1, because 100 prompts at N=2
 * is already 400 calls and refused by the ceiling before this check could matter.
 * While the ceiling is temporarily 100 for Phase 9 it does not bind at any N at
 * all, and the check below is reached only when fewer targets are measured.
 *
 * It stays for the one thing the ceiling cannot say: a list of more than a hundred
 * prompts is a paste accident rather than a measurement, whatever it would have
 * cost, and "shorten the list" is a remedy the caller can act on where "lower one
 * of three factors" is not. That is its whole purpose, and it is written down here
 * because a limit nobody can explain in six months is how a check that cannot fail
 * survives - this project has paid for two of those already.
 *
 * 100 is twice C2's warning threshold of 50: a genuinely long list still saves and
 * still runs, carrying the warning C2 requires.
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

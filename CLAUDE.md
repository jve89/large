# CLAUDE.md - Large AI

## Role

You are the architect and implementer. The operator is the executor and reviewer.
Lead on structure; ask when the spec is silent - do not guess.

## Before writing any code

- **Environment first.** Match the pinned runtime before any install:
  `nvm use` (Node 22.23.1, see `.nvmrc`), then `node -v` to confirm. An install on
  the wrong runtime writes the wrong lockfile.
- Read `SPEC.md`, `ARCHITECTURE.md` and `PLAN.md` at the start of every session.
- Take the current phase from PLAN's order table. Work on that phase only.
- Never edit a file you have not read this session. Ask for it first.
- Never write code while any consistency conflict is unresolved.

## Output

- Return COMPLETE files, never fragments or "...rest unchanged".
- Small, targeted changes scoped to the current phase.
- Modular, testable, deterministic logic.

## Constraints

- No new dependencies without asking.
- Do not change the pinned stack in `ARCHITECTURE.md`.
- Do not invent features that are not in `SPEC.md`. Flag gaps; do not fill them.
- Do not add authentication, scheduling, trend charts, exports, a delete button, a
  third provider, or any advice feature. Every one of those is explicitly out of
  scope for v1 and each already has a named hook.

## Project rules that are easy to get wrong

These are the mistakes that pass every compiler and every casual review. Check
each one before claiming a phase done.

1. **A failed call is never "not mentioned".** An `Answer` with status `failed` is
   excluded from every numerator and from every denominator - coverage included,
   because coverage's denominator is the planned attempts and not the stored rows
   (see rule 3). If a prompt has zero successful answers against a target, that
   cell shows "no data", not a zero.
2. **Coverage and N travel with every figure.** No percentage, average or count is
   rendered anywhere without the coverage of its own target and the run's N beside
   it.
3. **Coverage is per target, never per run**, and its denominator is the
   **planned** attempts for that target (prompts x N), never the number of stored
   rows. One degraded provider must not invalidate the other provider's
   measurement. A run is `failed` in exactly two cases: no target reached the
   threshold, or the reclaim limit was exceeded. An ordinary failed call is
   neither - that is `completed_with_errors`.
4. **Aggregates are never persisted.** Mention rate, average position, competitor
   frequency and total cost are computed in `lib/aggregate.ts` at read time. If you
   find yourself adding a column for one of them, stop.
5. **Money is integer micro-dollars.** No floats, ever, anywhere near a cost.
6. **The prompt goes out unmodified.** No system prompt, no `temperature` or
   `top_p`, no length instruction. `max_tokens` exists only so an answer is never
   truncated. Steering the model raises the numbers and destroys their meaning.
7. **Match on visible text, never on raw text.** Strip markdown link targets, image
   targets and fenced code blocks first. A brand that appears only inside a URL or
   only in a citation is not a mention, and counting it shifts every position.
8. **A provider search error is not an empty result.** Both providers return web
   search failures as HTTP 200 with an error object instead of a result list (as
   researched 2026-08-23; re-check, don't trust). An
   adapter must return `{ ok: false }` for that case, not a successful answer with
   zero citations. This is the failure mode the whole verification gate exists to
   catch.
9. **Nothing assumes two providers.** Targets are a list. Never write `modelA` /
   `modelB`, never index a target by position, never hard-code a provider name
   outside `src/core/providers/`.
10. **Runs are immutable once queued.** Editing a company's prompts, aliases or
    competitors must not change any existing run. If a change would reach into
    `RunPrompt`, `RunTarget`, a run's brand snapshot or a stored `Answer`, it is
    wrong.
11. **Three attempts per call, in total** - the initial call plus two retries, not
    three retries. `Answer.httpAttempts` records what was actually spent, so an
    off-by-one here is visible in the data and in the bill.
12. **Prices live only in `src/core/providers/pricing.ts`**, each row dated. Never
    inline a per-token or per-search price in an adapter.
13. **Environment validation is role-aware.** The provider keys are required for
    the worker and for scripts, not for the web process. Do not make them
    unconditionally required - that puts the web service into a restart loop.
14. **Resume a stalled run; never restart it.** The unique constraint on
    (prompt, target, repetition) tells you what is already paid for. Re-running a
    completed combination spends money for a row that already exists.
15. **Never delete or overwrite raw answer text.** It is the substrate for the v2
    judge and the v2 advice engine, and it cannot be regenerated without paying for
    the calls again.
16. **Every claim about a third-party service carries a date** in the form
    "as researched YYYY-MM-DD; re-check, don't trust". Pricing, limits and free
    tiers rot.
17. **Secrets never enter the repository.** Every required variable is declared in
    `lib/env.ts` and fails loudly at startup when absent.

## Stop points

- Stop after each phase. Report what changed and what is untested, and remind the
  operator to update the Status column in PLAN's order table.
- Do not start the next phase until told to.
- Stop and ask if a phase appears to require a change to the pinned stack, the
  data model, or anything in `SPEC.md`'s "Explicitly NOT in scope".

## Verification

Before claiming a phase done, run and show the output of:

```
npm run verify
```

That is the whole gate. `npm run verify` chains typecheck, lint and test and then
runs `verify:live`, which performs one real end-to-end run through the real queue,
worker, adapters and parser. Running the first three separately beforehand just
runs them twice. It needs
a running PostgreSQL and both API keys, and it costs two real provider calls each
time it runs. Use `npm run typecheck` and `npm run test` for the fast loop during
a phase; run `npm run verify` at the end of one.

CI runs typecheck, lint and test on every push and needs no secrets. The full
`verify` including the live call runs only when the `verify-live` workflow is
dispatched by hand. CI passing is therefore not the same as the phase gate
passing.

Then confirm the phase's EARS criterion in `PLAN.md` actually holds. A red gate
means not done. Do not self-certify around it.

# CLAUDE.md - Large AI

## Role

You are the architect and implementer. The operator is the executor and reviewer.
Lead on structure; ask when the spec is silent - do not guess.

## Before writing any code

- **Environment first.** Match the pinned runtime before any install:
  `nvm use` (Node 22.23.1, see `.nvmrc`), then `node -v` to confirm. An install on
  the wrong runtime writes the wrong lockfile.
- Read `SPEC.md`, `ARCHITECTURE.md` and `PLAN.md` at the start of every session.
  `SPEC.md` -> Vision says where this is going; it authorises no work, and it is
  what a phase decision is checked against.
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
   frequency, cited domain frequency and total cost are computed in
   `lib/aggregate.ts` at read time. If you find yourself adding a column for one of
   them, stop.
5. **Money is integer micro-dollars.** No floats, ever, anywhere near a cost.
6. **The prompt goes out unmodified.** No system prompt, no `temperature` or
   `top_p`, no length instruction. `max_tokens` exists only so an answer is never
   truncated. Steering the model raises the numbers and destroys their meaning.
7. **Match on visible text, never on raw text.** A brand that appears only inside
   an address, or only in a citation, is not a mention, and counting it shifts
   every position after it.
   **What "visible text" removes is defined in exactly one place:** `SPEC.md` ->
   Definitions -> Visible text. That definition is normative and this rule
   deliberately does not restate the list, because it restated it once and then
   described the pre-widening semantics for a day afterwards - while being the rule
   a session reads *while writing parser code*. If you are changing what is
   removed, change the definition, bump `MEASUREMENT_SEMANTICS_VERSION`, and add a
   row to the Measurement semantics log; this rule needs no edit.
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
18. **A side effect is proved at its seam, not at its definition.** When a function
    exists to do something at a boundary - write to a log, call an adapter, enqueue
    a row, deploy - the test drives the **caller** and observes the effect. A test
    that calls the function directly proves the function; it proves nothing about
    whether anything calls it. Before writing such a test, ask: if I delete the one
    line that calls this, does any test go red? If the answer is no, the test is
    watching the wrong thing.
    This is the characteristic defect of this codebase and it has already cost four
    incidents: Railway with `source.repo` set and `repoTriggers` empty, so the
    worker never deployed for four phases; a stub adapter asserted against but
    never wired into `processNextRun`, reporting zero calls for the wrong reason; a
    commit pushed that CI never ran; and `logFailureEvidence`, unit-tested while
    its only call site was exercised by nothing. Every one has the same shape - the
    part works, the seam does not, and nothing looks at seams.
19. **Verify the check ran against this commit, not that the check is green.**
    "CI is green" and "Railway is healthy" are statements about a *service*, not
    about your work. Confirm the run and the deploy exist **for this sha**:
    `gh run list --json headSha,status,conclusion` and **select the row whose
    headSha equals yours**, rather than reading the most recent run - if no row
    matches, the answer is "CI has not run this", which is a different and worse
    state than "CI failed".
    For Railway, ask for the deployed commit rather than the service's health:

        railway api 'query { project(id: "<id>") { services { edges { node {
          name serviceInstances { edges { node { latestDeployment {
          status meta } } } } } } } } }'

    and compare `meta.commitHash` per service. `railway status` reports that
    services are up and says nothing about which commit they run;
    `railway deployment list` gives timestamps, not shas, so it only tells you a
    deploy happened near the right time. A service can be perfectly healthy while
    running code from four phases ago - that is exactly what happened to the
    worker, and a timestamp would not have caught it either.

20. **The full local test suite runs before every push, whatever the diff
    contains.** `npm run test`, all of it, every time - not the files that look
    related, and not "it's only docs". Which tests a diff can break is a judgement
    about the diff; the suite is where the race lived, and the heartbeat ordering
    defect had already passed CI three times by luck before it failed once. It
    costs eleven seconds. `verify:live` is the exception and stays at phase
    boundaries, because that one costs money.

21. **When the spec says one thing must always accompany another, make it a type,
    and keep a seam test for the half the type cannot reach.** A convention that
    two things travel together survives exactly as long as everyone remembers it; a
    type carries the obligation into every call site that did not think about it.
    C10 - coverage and N beside every figure - is the worked example: `Figure<T>`
    puts the value behind a wrapper holding both, so a renderer cannot obtain the
    number without having them, and `tests/ui/run-page.test.ts` asserts the page
    actually prints them, because no type can require that. Both halves are needed
    and they fail differently: strip the qualifier from the renderer and the 25
    arithmetic tests stay green while the page tests go red.
    This is rule 18 applied to a pairing rather than to a side effect, and it is
    narrow on purpose - it is for obligations of the form "X is never displayed,
    stored or returned without Y", not for typing things in general.

22. **When a document and the code disagree, ask whether a capability depends on
    it.** The tiebreaker is not "the code is the truth" and not "the spec wins" -
    both are wrong often enough to be dangerous. If the disagreement is a
    capability's statement of itself, the **document is right and the code is
    behind**: fix the code. If it is a document describing an implementation
    detail that has since moved, the **code is right and the document is stale**:
    fix the document. Worked example, 2026-08-25: `ARCHITECTURE.md` documented a
    `prompts` array on `GET /api/runs/:runId` that the route did not return, and a
    per-target aggregate shape that no longer matched. The prompts array is the
    API-level statement of C18, so the route gained it; the aggregate shape was
    only stale prose, so the document was corrected. Same file, same day, opposite
    directions.


## Stop points

- Stop after each phase. Report what changed and what is untested.
- **You** update `PLAN.md` when a phase goes green: set that phase's Status to
  `done` and the next one to `next`, and strike through any blocker the phase
  resolved. Do it in the same commit as the phase's work. This is not the
  operator's job. A stale table is not cosmetic - `PLAN.md` says "the table is the
  instruction", so a fresh session reading it restarts a completed phase.
- Do not start the next phase until told to.
- Stop and ask if a phase appears to require a change to the pinned stack, the
  data model, or anything in `SPEC.md`'s "Explicitly NOT in scope".
- Stop and ask if a decision would make a later layer of `SPEC.md` -> Vision
  impossible. Merely inconvenient for a later layer is fine and several v1
  choices are deliberately that; foreclosing one is not. The named hooks - the
  N-entry target list, the adapter registry, the single foreign-key chain to
  Company, retained raw answer text, immutable hashed runs - exist for that
  reason and are not to be removed as unused.

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

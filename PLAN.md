# PLAN - Large AI

## Rules

- One phase per session, a fresh session each time.
- A phase that fails twice is too big - split it here and do the halves.
- Commit after every green phase.
- Numbers are labels. Expect reordering; never renumber - code and commits cite
  the numbers.

## Order - the table is the instruction

| Order | Phase | Delivers | Status |
|---|---|---|---|
| 0 | Skeleton | C13, C14 | next |
| 1 | Company registry | C1 | |
| 2 | Prompt list | C2 | |
| 3 | Queue a run | C3 | |
| 4 | Worker: claim, resume, concurrency, retry | C4, C6, C15 | |
| 5 | Answers and citations | C5, C7 | |
| 6 | Mention parsing | C8 | |
| 7 | Aggregation, coverage and cost | C9, C10, C12 | |
| 8 | Comparability guard | C11 | |
| 9 | Presentation pass against a real brand | C10, C11 | |
| 10 | Ship | SPEC "Success = done when" | |

## Blocked on the operator

- **Anthropic Console account with prepaid credits and an API key** - blocks
  Phase 0. A Claude Max subscription does not grant API access.
- **OpenAI platform account with prepaid credits and an API key** - blocks
  Phase 0. A ChatGPT Plus subscription does not grant API access.
- **Railway account, Hobby or Pro** - blocks the first deploy in Phase 0.
- **GitHub repository created**, with both API keys added as repository secrets -
  blocks the first deploy in Phase 0 and the on-demand live workflow.
- **A real brand: name, aliases, competitors, and at least ten buying-moment
  prompts** - blocks Phase 9 and therefore Phase 10.

## Phase 0 - Skeleton

Thinnest slice for this shape: **one route inserts a queued run, the worker claims
it, one real call per provider with web search enabled, the raw answers with their
citations are stored, the parser produces a mention result, and the run page shows
it.** No fixture, no stub, no hard-coded answer anywhere on that path.

Includes the gate command, `.env.example`, both CI workflows, and the first deploy.

Scope: project scaffolding, `lib/env.ts`, the full Prisma schema and first
migration, both provider adapters at their minimum, the worker poll loop with
`SELECT ... FOR UPDATE SKIP LOCKED` and a heartbeat, minimal `visible-text.ts`,
`mentions.ts` and `citations.ts`, one run page, and `scripts/verify-live.ts`.

Also determines and records in `ARCHITECTURE.md` the `max_tokens` value that is
high enough never to truncate an answer at either provider - an open question in
`SPEC.md`.

- Delivers: C13, C14 (plus the wiring that later phases deepen)
- Done when:
  - IF a required environment variable is absent, THEN the application exits at
    startup naming that variable - verified by `npm run verify` with the variable
    unset, which must exit non-zero.
  - WHEN `npm run verify` is executed with both keys present and PostgreSQL
    running, the system SHALL run typecheck, lint and tests and then complete one
    real end-to-end run of one prompt against both targets at N=1, storing at
    least two successful answers each carrying at least one citation and a parsed
    mention result - verified by `npm run verify` exiting 0.
  - `.github/workflows/ci.yml` is green on the pushed commit.
  - The same commit is live on Railway with all three services running and both
    keys set on the worker - verified by triggering one run through the deployed
    web service and seeing it reach `completed`.
- Commit: `chore: walking skeleton`

## Phase 1 - Company registry

- Delivers: C1
- Done when: WHEN a company is submitted with a non-empty name, it is persisted
  with its aliases and competitors and retrievable by id; IF the name is empty,
  the request is rejected and nothing is persisted - verified by
  `npm run test -- companies` and `npm run verify`.
- Commit: `feat: company registry`

## Phase 2 - Prompt list

- Delivers: C2
- Done when: WHEN a prompt list is saved, every non-empty line becomes one ordered
  prompt for that company and the previous list is replaced in full; IF the list
  exceeds 50 prompts, a warning naming the resulting call count is returned and
  the save still succeeds - verified by `npm run test -- prompts` and
  `npm run verify`.
- Commit: `feat: prompt list`

## Phase 3 - Queue a run

- Delivers: C3
- Done when: WHEN a run is started, a run record with status `queued` exists
  carrying an immutable snapshot of the prompt texts, the target list, the brand
  name, the aliases and the competitors, plus the chosen N and the `basisHash`
  computed over that snapshot, and the request returns without waiting; IF the
  company has no prompts, the request is rejected and no run is created; editing
  the company's prompts, aliases or competitors afterwards leaves that run
  unchanged - verified by `npm run test -- runs.queue`, `npm run test -- hash`
  and `npm run verify`.
- Commit: `feat: queue a run`

## Phase 4 - Worker: claim, resume, concurrency, retry

- Delivers: C4, C6, C15
- Done when:
  - WHILE a run is `queued`, exactly one worker claims it and sets it to
    `running`, and no more than `PROVIDER_CONCURRENCY` calls per provider are in
    flight from that process.
  - WHILE a worker executes a run, it refreshes that run's heartbeat at least
    every fifteen seconds.
  - IF a `running` run's heartbeat is older than `STALE_RUN_SECONDS`, THEN a
    worker reclaims it and executes only the combinations that have no stored
    answer.
  - IF a run has been reclaimed more than `MAX_RECLAIMS` times, THEN it is set to
    `failed` with that reason and no further provider calls are made for it.
  - IF a call fails with a rate limit, a timeout or a 5xx, THEN it is retried up
    to three times with exponential backoff before being recorded as failed.
  - Verified by `npm run test -- worker.claim` (two concurrent claimers, exactly
    one winner), `npm run test -- worker.resume` (a stale run with half its
    answers stored resumes and issues only the missing calls) and
    `npm run test -- retry`.
- Commit: `feat: worker claim, resume and retry`

## Phase 5 - Answers and citations

- Delivers: C5, C7
- Done when: WHEN an attempt completes, one answer row exists carrying status, raw
  text, provider, model id, repetition, input and output tokens, search count, cost
  in micro-dollars and latency; IF an attempt fails, the row has status `failed`
  with a reason and is not counted as an answer lacking the brand; IF a provider
  returns a web search error object rather than a result list, the attempt is
  recorded as failed and not as an answer with zero citations - verified by
  `npm run test -- answers` and `npm run test -- citations` against stored
  fixtures of both real and error-shaped provider responses.
- Commit: `feat: answer and citation recording`

## Phase 6 - Mention parsing

- Delivers: C8
- Done when: WHEN an answer is recorded successfully, the recognised brands in its
  visible text are persisted with each one's 1-based position by first occurrence
  and the total number of recognised brands found; matching is case-insensitive
  and Unicode-normalised, requires a non-alphanumeric boundary on both sides,
  tolerates extra whitespace inside multi-word aliases, ignores markdown link
  targets, image targets and fenced code blocks, prefers the longest matching
  alias, and resolves a name in both lists in favour of the subject brand; a brand
  occurring only in a citation counts as not mentioned - verified by
  `npm run test -- visible-text` and `npm run test -- mentions` against fixtures
  covering alias variants, casing, accents, punctuation, plurals, line-wrapped
  names, markdown links, code fences, overlapping aliases, absence, and an empty
  competitor list.
- Commit: `feat: mention parsing`

## Phase 7 - Aggregation, coverage and cost

- Delivers: C9, C10, C12
- Done when: mention rate, average position and competitor frequency are computed
  at read time per target with no aggregate stored as a column; every displayed
  figure carries its target's coverage and the run's N; IF a target's coverage is
  below `COVERAGE_THRESHOLD` that target's figures are labelled unreliable while
  other targets are unaffected and the run stays visible; IF every attempt for one
  prompt against one target failed, that cell reads "no data" and never "not
  mentioned"; the run's terminal status follows the rules in `SPEC.md` -> Run
  status; and WHEN a run reaches a terminal status its total token usage, total
  search count and total cost are displayed - verified by
  `npm run test -- aggregate` with fixtures at 100, 85, 79 and 0 percent coverage
  per target including one run where the two targets differ, and by inspecting the
  run page.
- Commit: `feat: aggregation, coverage and cost`

## Phase 8 - Comparability guard

- Delivers: C11
- Done when: IF two runs of one company differ in `basisHash`, THEN they are not
  presented as one series and the change of measurement basis is stated - verified
  by `npm run test -- comparability` with four runs: identical basis, changed
  prompt, changed model id, and changed alias list.
- Commit: `feat: comparability guard`

## Phase 9 - Presentation pass against a real brand

The first phase that uses real client data rather than fixtures. Screens 1 to 3
are made readable against figures that actually came out of the system, because
this product's whole risk is a number being misread.

- Delivers: C10 and C11, re-verified against real output
- Done when:
  - A run of the operator-supplied real brand with at least ten real prompts has
    completed with every target at coverage of 80 percent or higher, and at least
    one citation on every successful answer.
  - Every figure on screens 1 to 3 is readable without ambiguity: no percentage
    appears without its coverage and its N, no failed cell reads as a zero, and a
    run whose basis changed says so.
  - **Stability check:** the same run is repeated at least a day later on an
    identical basis. IF the two results differ by more than one step of N, THEN N
    is raised and `ARCHITECTURE.md` and `SPEC.md` are updated before Phase 10
    begins. This resolves the open question in `SPEC.md` about whether N=3 is
    believable.
  - Verified by `npm run verify` plus the two real runs on the deployed instance.
- Commit: `feat: presentation pass`

## Phase 10 - Ship

- Delivers: SPEC's "Success = done when"
- Done when: `npm run verify` exits 0 against the deployed configuration; all
  fifteen capabilities pass their EARS criteria; the real-brand run from Phase 9
  is reachable at the deployed URL; every environment variable is set on every
  service that needs it; both provider integrations have been exercised live end
  to end; and the "Blocked on the operator" list above is empty.
- Commit: `chore: launch`

## Deferred (v2, not now)

- **The advice engine.** Reprocesses stored raw answer text and citation data; it
  needs no new provider calls against the measured models. This is why raw text is
  never deleted.
- **Accounts, login and row-level security.** `companyId` is already on every
  scoped row, so this is a middleware layer plus RLS, not a migration.
- **More providers.** Gemini and Grok for coverage; **Perplexity** specifically
  because citations are its core product. The target list, the provider enum and
  the adapter registry already take N entries.
- **A shared rate limiter across workers.** `PROVIDER_CONCURRENCY` is per process,
  so running W workers multiplies the effective provider limit by W. Whoever turns
  on the second worker must add a shared counter (Postgres or Redis) at the same
  time, or both providers will start refusing calls.
- **An LLM judge for unknown competitor discovery.** Runs over stored answers, so
  it can be applied to the entire history retroactively - and it can be scored
  against the deterministic parser, which is why the deterministic one comes first.
- **Historical trend charts.** Runs are already immutable and hashed on their full
  measurement basis, so the series exists; only the chart is missing.
- **Scheduled and recurring runs.** A cron writes the same `queued` row the web
  layer writes.
- **`archivedAt` on companies and runs.** Hides a row from the list without
  destroying stored answers. v1 has no delete affordance at all.
- **Server-sent events for run progress**, if runs ever grow long enough that
  two-second polling becomes wasteful.
- **Per-customer cost and margin reporting.** Token usage, search counts and cost
  are captured per answer from Phase 5 onward.
- **Automatic prompt generation from a company description.** The operator does
  this by hand in v1; that manual work is the training data for automating it.

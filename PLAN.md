# PLAN - Large AI

## Rules

- One phase per session, a fresh session each time.
- A phase that fails twice is too big - split it here and do the halves.
- Commit after every green phase.
- Numbers are labels. Expect reordering; never renumber - code and commits cite
  the numbers. The **Order** column below is the position in the queue; the
  **Phase** column carries the permanent number. New work takes a new number and
  is inserted at the position where it belongs.
- Claude maintains the Status column and the "Blocked on the operator" list, in
  the same commit as the phase's work (`CLAUDE.md` -> Stop points).

## Order - the table is the instruction

| Order | Phase | Delivers | Status |
|---|---|---|---|
| 1 | 0 - Skeleton | C13, C14 | done |
| 2 | 1 - Company registry | C1 | done |
| 3 | 2 - Prompt list | C2 | done |
| 4 | 3 - Queue a run | C3 | done |
| 5 | 4 - Worker: claim, resume, retry, terminal status | C4, C6, C15 | done |
| 6 | 5 - Answers and citations | C5, C7 | done |
| 7 | 6 - Mention parsing | C8 | next |
| 8 | 7 - Aggregation, coverage and cost | C9, C10, C12 | |
| 9 | 11 - Cited domain frequency | C16 | |
| 10 | 12 - Traceability to evidence | C17 | |
| 11 | 8 - Comparability guard | C11 | |
| 12 | 9 - Presentation pass against a real brand | C10, C11, C12, C16, C17 | |
| 13 | 10 - Ship | SPEC "Success = done when" | |

Phases 11 and 12 are new work and therefore take new numbers, but both belong
after Phase 7. Phase 11 is a read-time aggregate over stored citation rows, so it
cannot precede the phase that stores them (Phase 5) nor the aggregation module it
lives in (Phase 7). Phase 12 makes every displayed figure reachable back to the
answers it came from, so it cannot precede the figures themselves (Phases 7 and
11) or the rows beneath them (Phases 5 and 6).

## Blocked on the operator

- ~~Anthropic Console account with prepaid credits and an API key~~ - **done
  2026-08-23.** $5 credit; key in the local `.env` and in the repository secrets.
- ~~OpenAI platform account with prepaid credits and an API key~~ - **done
  2026-08-23.** $5 credit. The key alone was not enough: the first live gate run
  failed with `429 You have no credits remaining`, which is why "with prepaid
  credits" is written into this line.
- ~~Railway account, Hobby or Pro~~ - **done 2026-08-23.** Project `large`, three
  services, provisioned from the Railway CLI.
- ~~GitHub repository created, with both API keys added as repository secrets~~ -
  **done 2026-08-23.** `jve89/large`, private, both secrets set. Railway's GitHub
  App had to be granted access to the repository by hand before it could build.
- **A real brand: name, aliases, competitors, and at least ten buying-moment
  prompts** - blocks Phase 9 and therefore Phase 10. **Still open.**

## Phase 0 - Skeleton

Thinnest slice for this shape: **one route inserts a queued run, the worker claims
it, one real call per provider with web search enabled, the raw answers with their
citations are stored, the parser produces a mention result, and the run page shows
it.** No fixture, no stub, no hard-coded answer anywhere on that path.

Includes the gate command, `.env.example`, both CI workflows, and the first deploy.

Scope: project scaffolding, `lib/env.ts` with role-aware validation and the
PostgreSQL major-version assertion, `tsconfig.worker.json` and the `build:worker`
script, the full Prisma schema and first migration, `lib/defaults.ts`,
`pricing.ts`, both provider
adapters at their minimum, the worker poll loop with
`SELECT ... FOR UPDATE SKIP LOCKED` and a heartbeat, minimal `visible-text.ts`,
`mentions.ts` and `citations.ts`, one run page, both CI workflows, and
`scripts/verify-live.ts`.

Also resolves three open questions from `SPEC.md` and records the answers in
`ARCHITECTURE.md`: the `max_tokens` value that is high enough never to truncate an
answer at either provider; the confirmed model id strings for both providers and
the Anthropic web search tool version; and the per-token and per-search prices,
written into `pricing.ts` with the date they were read. Phase 5 stores a cost per
answer and cannot do so until that table exists.

- Delivers: C13, C14 (plus the wiring that later phases deepen)
- Done when:
  - IF an environment variable required for the running role is absent, THEN that
    process exits at startup naming it - verified by `npm run verify` with
    `DATABASE_URL` unset, which must exit non-zero, and by the web process starting
    successfully with no provider keys present.
  - IF the database major version is not the pinned one, THEN startup fails naming
    both versions.
  - `npm run build:worker` produces `dist/worker/index.js`.
  - The web service's start command applies `prisma migrate deploy` before
    starting, so the deployed database matches the committed schema.
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
  with its aliases and competitors and retrievable by id; WHEN a company's name,
  aliases or competitors are edited, the change is persisted and every existing
  run is left untouched; IF a company is submitted **or edited** with an empty
  name, the request is rejected and nothing is persisted - verified by
  `npm run test -- api/companies` and `npm run verify`.
- Commit: `feat: company registry`

## Phase 2 - Prompt list

- Delivers: C2
- Done when: WHEN a prompt list is saved, every non-empty line becomes one ordered
  prompt for that company and the previous list is replaced in full; IF two lines
  are identical after trimming, only the first is stored and the response names
  how many lines were submitted, how many prompts were stored and **which specific
  lines were removed** - de-duplication being on the exact trimmed string, so
  lines differing only in case or in internal spacing are both kept; IF the list
  exceeds 50 prompts, a warning is returned naming the resulting call count **and
  both figures it was computed from** - `DEFAULT_REPETITIONS` and the length of
  `DEFAULT_TARGETS` from `lib/defaults.ts` - and the save still succeeds; the
  de-duplication report and the warning can appear together; and replacing a
  company's prompt list leaves every existing run untouched - verified
  by `npm run test -- api/prompts` and `npm run verify`.
- Commit: `feat: prompt list`

## Phase 3 - Queue a run

- Delivers: C3
- Done when: WHEN a run is started, a run record with status `queued` exists
  carrying an immutable snapshot of the prompt texts, the target list, the brand
  name, the aliases and the competitors, plus the chosen N and the `basisHash`
  computed over four of those - prompts, targets, aliases, competitors, but not the
  brand name - and the request returns without waiting; IF the
  company has no prompts, the request is rejected and no run is created; editing
  the company's prompts, aliases or competitors afterwards leaves that run
  unchanged - verified by `npm run test -- api/runs-queue`,
  `npm run test -- hash` and `npm run verify`.
- Commit: `feat: queue a run`

## Phase 4 - Worker: claim, resume, retry, terminal status

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
  - IF a call fails with a rate limit, a timeout or a 5xx, THEN at most three
    attempts are made in total - the initial call plus two retries - with
    exponential backoff between them, and `Answer.httpAttempts` records how many
    were spent.
  - WHEN the worker finishes or abandons a run, it writes the terminal status
    according to `SPEC.md` -> Run status, using `COVERAGE_THRESHOLD` against the
    planned attempt count per target: `completed` when every attempt succeeded,
    `completed_with_errors` when at least one target still reaches the threshold,
    `failed` when none does or when the reclaim limit was exceeded.
  - Verified by `npm run test -- worker/claim` (two concurrent claimers, exactly
    one winner), `npm run test -- worker/resume` (a stale run with half its
    answers stored resumes and issues only the missing calls),
    `npm run test -- run/retry`, and `npm run test -- run/status` covering all
    three terminal outcomes including a high-coverage run killed by the reclaim
    limit.
- Commit: `feat: worker claim, resume and retry`
- **Second correction, recorded 2026-08-25.** A latent ordering defect in the same
  code, found when it finally lost the race in CI: `clearInterval(beat)` sat in the
  `finally`, so it ran *after* `finishRun`, and a fire-and-forget heartbeat already
  in flight could re-populate `heartbeatAt` on a run that had just been finished.
  The beat is now stopped and awaited **before** the terminal status is written.
  Cosmetic in production - the claim query matches on `status = 'running'`, so a
  finished run is not reclaimable whatever its heartbeat says - but it is a real
  ordering hazard, and it had passed CI three times by luck before failing once.
- **Correction, recorded 2026-08-25.** The heartbeat clause held, but Phase 4's
  report justified it wrongly: it cited the per-attempt `heartbeat` callback in
  `executeRun`, when what actually satisfies the clause is a `setInterval` started
  at claim and cleared in a `finally`. Those are not equivalent - a per-attempt
  beat is bounded by one attempt's duration, not by the interval, and could exceed
  `STALE_RUN_SECONDS`. The code was mechanism (a) all along, so the gate did not
  pass on a false clause; the *evidence offered for it* was wrong. The clause is
  now proved by observation in `tests/worker/heartbeat.test.ts`, which fails if the
  write ever moves onto the attempt path.

## Phase 5 - Answers and citations

- Delivers: C5, C7
- Done when: WHEN an attempt completes, one answer row exists carrying status, raw
  text, provider, model id, repetition, input and output tokens, search count, cost
  in micro-dollars and latency; IF an attempt fails, the row has status `failed`
  with a reason and is not counted as an answer lacking the brand; IF a provider
  returns a web search error object rather than a result list, the attempt is
  recorded as failed and not as an answer with zero citations - verified by
  `npm run test -- run/answers` and `npm run test -- parse/citations` against
  stored fixtures of both real and error-shaped provider responses.
- Commit: `feat: answer and citation recording`

## Phase 6 - Mention parsing

- Delivers: C8
- Done when: WHEN an answer is recorded successfully, the recognised brands in its
  visible text are persisted with each one's 1-based position by first occurrence
  and the total number of recognised brands found; matching is case-insensitive
  and Unicode-normalised, requires a non-alphanumeric boundary **or a string edge**
  on both sides, tolerates extra whitespace inside multi-word aliases, ignores
  markdown link targets, image targets and fenced code blocks, prefers the longest
  matching alias, and resolves a name in both lists in favour of the subject brand;
  a brand occurring only in a citation counts as not mentioned - verified by
  `npm run test -- parse/visible-text` and `npm run test -- parse/mentions`
  against fixtures covering alias variants, casing, accents, punctuation,
  line-wrapped names, markdown links, code fences, overlapping aliases, absence,
  an empty competitor list, a brand at the very first and very last character of
  the answer (both must match), and a plural of a single-word alias (which must
  **not** match, per C8).
- Commit: `feat: mention parsing`

## Phase 7 - Aggregation, coverage and cost

- Delivers: C9, C10, C12
- Done when: mention rate, average position and competitor frequency are computed
  at read time per target with no aggregate stored as a column; every displayed
  figure carries its target's coverage and the run's N; IF a target's coverage is
  below `COVERAGE_THRESHOLD` that target's figures are labelled unreliable while
  other targets are unaffected and the run stays visible; IF every attempt for one
  prompt against one target failed, that cell reads "no data" and never "not
  mentioned"; and WHEN a run reaches a terminal status - which Phase 4 writes -
  its total token usage, total
  search count and total cost are displayed - verified by
  `npm run test -- aggregate` with fixtures at 100, 85, 79 and 0 percent coverage
  per target including one run where the two targets differ, and by inspecting the
  run page.
- Commit: `feat: aggregation, coverage and cost`

## Phase 11 - Cited domain frequency

The Objective promises "which sources those models cite when they answer".
Phase 5 stores them and the run page shows them per answer; a run of 20 prompts
x 2 targets x N=3 therefore hands the reader 120 separate URL lists. This phase
turns that raw data into an answer to the question.

- Delivers: C16
- Done when:
  - WHEN a run is read, each target carries its cited domains with a count,
    computed at read time in `lib/aggregate.ts` from that target's answers with
    status `ok` only, ordered by descending count with ties broken by domain
    ascending so the order is reproducible.
  - A domain is the host of the stored citation URL, lower-cased with a leading
    `www.` removed. **The count is a number of answers, not a number of citation
    rows:** an answer citing two pages of one site, or the same page twice, adds
    one to that domain. Counting rows would let a heavily footnoting model inflate
    its favourite source.
  - Every displayed domain list carries that target's coverage and the run's N,
    per C10, and is labelled unreliable when the target is below
    `COVERAGE_THRESHOLD`.
  - IF a target has no successful answers, its domain list reads "no data" and is
    never rendered as an empty list.
  - No column is added to the schema for any part of this figure, per C9 - checked
    by there being no migration in this phase.
  - Verified by `npm run test -- cited-domains` with fixtures covering: the same
    host cited with and without `www.`; **two different pages of one site inside
    one answer, which must count once**; the same domain across two answers, which
    must count twice; a `failed` answer carrying citations, constructed so that
    counting them would change the resulting order (it must not); a target with
    zero successful answers, which reads "no data"; **a target whose successful
    answers carry no citations at all, which reads as an empty list and must not
    read "no data"** - the model genuinely cited nothing, and that is an
    observation rather than an absence of one; two domains on an equal count,
    which must come back in ascending domain order; and two targets in one run
    whose lists differ. Plus by inspecting the run page.
- Commit: `feat: cited domain frequency`

## Phase 12 - Traceability to evidence

`SPEC.md` -> Vision names this the second of three differentiators, and until now
nothing in the pack enforced it: every other capability constrains how a figure is
computed, none required that a reader can check it. This phase makes the evidence
reachable from the figure.

- Delivers: C17
- Done when:
  - WHEN a target's aggregate figures are displayed, every answer they were
    computed from is reachable from that page, without the reader editing a URL by
    hand.
  - Each reachable answer carries its raw text, its citations in stored order, and
    every recognised name found in it with that name's 1-based position and the
    total recognised in that answer.
  - A `failed` answer is reachable alongside the successful ones and carries its
    failure reason, so a cell reading "no data" can be explained rather than only
    labelled.
  - No aggregate figure is displayed whose underlying answers are unreachable.
  - Verified by `npm run test -- traceability` with fixtures covering: an `ok`
    answer with both mentions and citations; a `failed` answer whose reason must
    be reachable; a cell where every repetition failed, which reads "no data" and
    whose failure reasons must still be reachable; a target below
    `COVERAGE_THRESHOLD`, whose figures are labelled unreliable and whose answers
    must remain reachable; and an answer with no recognised brand, which must be
    reachable and must not be confused with a failure. Plus by inspecting the run
    page.
- Commit: `feat: traceability to evidence`

## Phase 8 - Comparability guard

- Delivers: C11
- Done when: IF two runs of one company differ in `basisHash`, THEN they are not
  presented as one series and the change of measurement basis is stated - verified
  by `npm run test -- comparability` with five runs: identical basis, changed
  prompt, changed model id, changed alias list, and changed competitor list - plus
  a sixth with only the brand name changed, which must **not** break the series.
- Commit: `feat: comparability guard`

## Phase 9 - Presentation pass against a real brand

The first phase that uses real client data rather than fixtures. Screens 1 to 3
are made readable against figures that actually came out of the system, because
this product's whole risk is a number being misread.

- Delivers: C10, C11, C12, C16 and C17, re-verified against real output
- Done when:
  - A run of the operator-supplied real brand with at least ten real prompts has
    completed with every target at coverage of 80 percent or higher, and at least
    one citation on every successful answer.
  - Every figure on screens 1 to 3 is readable without ambiguity: no percentage
    appears without its coverage and its N, no failed cell reads as a zero, a
    cited-domain list of a target with no successful answers reads "no data", the
    run's total token usage, search count and cost are present and legible (C12),
    and a run whose basis changed says so.
  - Every figure on screen 3 reaches its evidence in one step (C17), checked
    against real answers rather than fixtures - this is the differentiator, so it
    is checked on real output or it is not checked.
  - **Per-call cost is re-derived and its spread recorded.** The figure in
    `lib/defaults.ts` is provisional - it moved eleven percent between samples of
    six and fourteen answers - and it has an uncharacterised driver: how many web
    searches a question provokes, which plausibly differs between a buying-moment
    prompt and a factual one. This is the first phase with a real sample. Record
    the mean **and the spread**, per target, because that number becomes the basis
    of pricing at roadmap stage 2 and its variance matters as much as its value.
  - **Stability check:** the same run is repeated at least a day later on an
    identical basis. IF the two results differ by more than one step of N, THEN N
    is raised and `ARCHITECTURE.md` and `SPEC.md` are updated before Phase 10
    begins. This resolves the open question in `SPEC.md` about whether N=3 is
    believable, and per `SPEC.md` -> Vision -> "What would falsify this" it is
    also the test of the product thesis: a result that varies too much at any
    workable N means the causal dataset cannot exist.
  - Verified by `npm run verify` plus the two real runs on the deployed instance.
- Commit: `feat: presentation pass`

## Phase 10 - Ship

- Delivers: SPEC's "Success = done when"
- Done when: `npm run verify` exits 0 against the deployed configuration; all
  seventeen capabilities pass their EARS criteria; the real-brand run from Phase 9
  is reachable at the deployed URL; every environment variable is set on every
  service that needs it; both provider integrations have been exercised live end
  to end; and the "Blocked on the operator" list above is empty.
- Commit: `chore: launch`

## Roadmap beyond v1

This replaces what used to be a flat "Deferred" list. It is in two parts.
**Product stages** are ordered: each one unlocks the next, and each names what
must exist before it can start. They are called stages, not layers, because
`SPEC.md` -> Vision already numbers three *layers* and they are not these -
Vision's layer 3, the causal dataset, is delivered by stage 6 here.
**Engineering items** are not ordered at all; each names the condition that
triggers it. Nothing here is authorised by being
written down - `SPEC.md` -> Vision -> "How to use this section" says the same.

### Product stages, in order

**1. Accounts, quotas and payment.**
*Unlocks:* anyone other than the operator using the product at all, and with it
every stage below. It is also the item that closes the v1 exposure recorded in
`ARCHITECTURE.md` -> Key decisions - no authentication, so anyone holding a URL
can read every company and every run.
*Requires first:* v1 shipped (Phase 10). The single-operator stage exists so the
measurement is proved correct before anyone depends on it; adding accounts to an
instrument that is still wrong just gives the wrong numbers more readers. The
data model is already ready: every row reaches its company through one
foreign-key chain (`Citation`/`Mention` -> `Answer` -> `Run` -> `Company`), so
this is a middleware layer plus RLS policies keyed off that chain, not a
migration.

**2. Per-customer cost and margin reporting.**
*Unlocks:* usage-based pricing that is defensible rather than guessed. `SPEC.md`
-> Vision prices analyses because each one spends real money at the provider;
that pricing cannot be set, and a free scan cannot be sized, without knowing what
a run actually costs per customer.
*Requires first:* stage 1, for the notion of a customer. The measurement itself
is already there - token usage, search counts and cost are captured per answer
from Phase 5 onward, and cost is integer micro-dollars, so the arithmetic is
exact at the point someone is invoiced.

**3. Automatic prompt generation from business, city and category.**
*Unlocks:* self-service. There is no self-service without it, because no plumber
will sit down and write twenty buying-moment prompts. It is also the precondition
for more languages and countries, since a per-country prompt library is not
something anyone writes by hand.
*Requires first:* stages 1 and 2, and the hand-written prompt lists from v1 - the
operator agreeing prompts with each client by hand is the training and evaluation
data for automating it, which is why v1 does that work manually rather than
skipping it. C11 must already be enforced: a generated prompt list is a different
measurement basis by definition, and a generator that quietly changed a customer's
basis between runs would draw a trend through two different instruments.

**4. An audit of the customer's own presence against the harvested criteria.**
*Unlocks:* the bridge from measuring to acting - the "find out what is missing
from its own presence" half of the Vision, and the first thing a customer can do
something with on a Tuesday.
*Requires first:* the harvested criteria, which come from a judge pass over
stored raw answer text (see Engineering items), and a website field on `Company`
that the v1 data model deliberately does not have - the same field that would let
C16 mark which cited domain is the client's own. Both are data model changes and
therefore stop-and-ask.

**5. More providers, more languages and more countries.**
*Unlocks:* the "any trade, any city, any language" claim in the Vision, and the
population size that stage 6 needs.
*Requires first:* stage 3, for the prompt library; the shared rate limiter, since
more targets is what finally makes a second worker worth running; and per-country
competitor sets. The target list, the provider enum and the adapter registry
already take N entries, so a new provider is a new file and a list entry.
Gemini and Grok for coverage; **Perplexity** specifically because citations are
its core product.

**6. The advice engine, built on the causal dataset.**
*Unlocks:* the stage that cannot be bought, only accumulated - saying which
interventions actually move a recommendation, with evidence.
*Requires first:* the condition stated once in `SPEC.md` -> Explicitly NOT in
scope -> The advice engine, which this line does not restate. It additionally
requires Phase 9's stability check to have come out favourably: per `SPEC.md` ->
Vision -> "What would falsify this", if results vary too much to be believed at
any workable N then this stage cannot exist and the Vision section is rewritten
rather than extended. It reprocesses stored raw answer text and citation data and
needs no new provider calls against the measured models - which is why raw text
is never deleted.

### Engineering items, each with its trigger

- **An N and target-list control in the start-run dialog.** *Triggered by:* anyone
  needing to run at an N other than the default. The dialog states the exact call
  count before the button is pressed (C3), but it always submits
  `DEFAULT_REPETITIONS` and `DEFAULT_TARGETS`, because it has no controls for
  either - the endpoint accepts both, so this is a dashboard gap and not a worker
  or API one. Consequence today: there is no way to click through a cheap N=1 run,
  which made Phase 4's browser pass cost $0.43 rather than the $0.02 estimated.
- **A graceful worker shutdown - draining in-flight attempts.** *Triggered by:* the
  billed-and-unstored calls becoming material. The **correctness** half of this
  item was done on 2026-08-25 and is no longer deferred: an interrupted run is now
  left `running` for the reclaim path instead of being failed outright, and an
  aborted attempt is no longer written into the measurement. What remains is the
  efficiency half - letting in-flight attempts finish before the process exits, so
  that up to eight calls per interrupted deploy are not bought twice - together
  with the question of whether a reclaim following a **clean** shutdown should
  count against `MAX_RECLAIMS` at all. The limit exists to stop a run that keeps
  killing workers, and a deploy is not that; the answer is expected to be no, and
  it needs a column or a status to tell the two apart, which is a data model change
  and therefore a stop-and-ask when the phase is scheduled.
  The history of the entry is kept in `ARCHITECTURE.md` -> Key decisions, because
  what this item said before that date was the opposite of what the code did.

- ~~**A graceful worker shutdown. The trigger has fired; the decision is open.**~~
  *Triggered by:* deploys interrupting runs. This item used to say the cost was
  two accepted inefficiencies - eight in-flight calls billed but unstored per
  deploy, and one `MAX_RECLAIMS` consumed - and that "the reclaim path resumes the
  run, which is correct but not free". **That was wrong**, and it was checked at
  the seam on 2026-08-25: a SIGTERM stores every in-flight attempt as a `failed`
  answer, `processNextRun` then writes a terminal status, and the run ends
  `failed` with `finishedAt` set. It is not reclaimable, so a long run survives
  **no** deploys rather than four, and `MAX_RECLAIMS` is never consumed because no
  reclaim happens. The evidence and the reason the misreading was possible are in
  `ARCHITECTURE.md` -> Key decisions. The fix is to let in-flight attempts finish
  before exiting and to leave an interrupted run `running` for the reclaim path;
  it is a phase, not a patch, and its shape - including whether a reclaim
  following a clean shutdown should count against `MAX_RECLAIMS` at all - is an
  open operator decision.

- **Upgrade the error fixtures from `documented` to `observed`.** *Triggered by:*
  the first real web-search error object seen in production. Seven of the nine
  files in `tests/fixtures/` are `documented` - their shape comes from the
  provider's own documentation, not from a response this system has received - and
  they are the only evidence CLAUDE.md rule 8 is checked against outside the live
  gate. `logFailureEvidence` writes the raw response of every response-shaped
  failure to the worker log precisely so this trigger can be acted on: take the
  logged body, rebuild the fixture, change its `$meta.evidence` to `observed`.
  Until then the rule is proved against dated documentation, which is a real
  boundary and is stated as one.
- **A test for the transport-error branch of each adapter.** *Triggered by:* the
  same event, or sooner if a transport failure shape changes. `ask()`'s `catch`
  block - the one that turns a thrown SDK error into `{ ok: false }` with a
  retryable flag - is covered for Anthropic by one stubbed case in
  `tests/providers/ask-seam.test.ts` and not at all for OpenAI, and neither
  exercises a real 5xx, timeout or rate limit. The retry policy that sits on top
  of `retryable` is tested; the classification feeding it is not.
- **Component tests for the UI.** *Triggered by:* the second person able to change
  a component, or the first UI regression that reaches a client. There is no DOM
  test environment in the repo, so `prompt-editor.tsx`, `start-run-dialog.tsx` and
  the run page are covered only by the hand browser pass each phase performs. That
  is adequate while one operator writes and checks every screen and stops being
  adequate the moment it is not. Adding it means a jsdom environment and a
  component-testing library, which is a stack change and therefore a stop-and-ask.
- **A shared rate limiter across workers.** *Triggered by:* starting a second
  worker process. `PROVIDER_CONCURRENCY` is per process, so running W workers
  multiplies the effective provider limit by W. Whoever turns on the second worker
  adds a shared counter (Postgres or Redis) in the same change, or both providers
  start refusing calls.
- **A release phase for migrations.** *Triggered by:* scaling the web service past
  one instance. `prisma migrate deploy` runs in the web service's start command,
  which is correct at exactly one instance and a corrupted migration table at two.
- **An LLM judge for unknown competitor discovery, and criteria harvesting.**
  *Triggered by:* having enough stored answer text to score a judge against the
  deterministic parser - which is why the deterministic one comes first. It runs
  over stored answers, so it applies to the entire history retroactively with no
  new provider calls. This is also the engine behind the harvested criteria that
  product stage 4 needs.
- **Historical trend charts.** *Triggered by:* Phase 9's stability check
  establishing an N at which run-to-run variation is smaller than the movement the
  chart would draw. Runs are already immutable and hashed on their full
  measurement basis, so the series exists; only the chart is missing, and drawing
  it before that condition holds is the category's own worst habit.
- **Scheduled and recurring runs.** *Triggered by:* the quota stage existing, so
  that an automatic run is something a customer has already paid for. A cron then
  writes the same `queued` row the web layer writes.
- **Exports.** *Triggered by:* a customer asking for the numbers outside the app.
  A run's figures and its citation list as CSV or PDF; everything needed is
  already derivable from stored rows.
- **`archivedAt` on companies and runs.** *Triggered by:* customers creating rows
  the operator did not, which is the accounts stage. Hides a row from a list
  without destroying stored answers; it is not a delete.
- **Server-sent events for run progress.** *Triggered by:* runs growing long
  enough that two-second polling becomes wasteful.

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
| 4 | 3 - Queue a run | C3, C19 | done |
| 5 | 4 - Worker: claim, resume, retry, terminal status | C4, C6, C15 | done |
| 6 | 5 - Answers and citations | C5, C7 | done |
| 7 | 6 - Mention parsing | C8 | done |
| 8 | 7 - Aggregation, coverage and cost | C9, C10, C12, C18 | done |
| 9 | 11 - Cited domain frequency | C16 | done |
| 10 | 12 - Traceability to evidence | C17 | done |
| 11 | 8 - Comparability guard | C11 | done |
| 12 | 13 - Mark the client's own cited domain | C16, extended | done |
| 13 | 9 - Presentation pass against a real brand | C10, C11, C12, C16, C17 | next |
| 14 | 10 - Ship | SPEC "Success = done when" | |

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

## Register of behaviour reality has never produced

Every clause below is implemented and tested, and **no real provider has ever
made it happen.** Each is proved against rows we wrote ourselves.

This exists because the same structural fact keeps surfacing one phase at a time
and then scattering across reports: **a gate that asserts health cannot exercise
the code that handles unhealth.** `verify:live` fails if a successful answer
carries no citation - so it can never produce C16's empty-citation case. Phase 9
requires 80 percent coverage per target - so it cannot exercise C10's
below-threshold clauses. Those gates are right and are not to be weakened. What is
wrong is only ever having said so in passing.

The counts below were taken from the stored data on 2026-08-25, not from memory.
A product whose second differentiator is that it says when it does not know owes
itself the same treatment, and at Ship this table is the honest answer to "which
of these behaviours has this instrument only ever performed against fixtures".

| Clause | Observed in real data | Why the gates cannot produce it | What would |
|---|---|---|---|
| **A provider web-search error object** - HTTP 200 carrying an error instead of a result list (rule 8; C5, C7) | Never. Seven of the nine files in `tests/fixtures/` are `documented`, not `observed` | It needs a provider's search subsystem to fail while the request succeeds. `verify:live` asserts the call succeeded; it has no way to ask for this | A real occurrence in production. `logFailureEvidence` writes the raw body of every response-shaped failure to the worker log for exactly this purpose - take the body, rebuild the fixture, change `$meta.evidence` to `observed` |
| **A successful answer carrying no citations** - C16's "cited nothing" empty list, which must not read as "no data" | Never: **0** of the stored `ok` answers have zero citations | `verify:live` **fails** if any successful answer lacks a citation. The gate asserts the exact negation of this clause | A model answering from what it already knows without searching - plausible on a question it considers settled |
| **Coverage strictly between 0 and the threshold** - a partially degraded target labelled unreliable (C10) | Never. Only **0%** and **100%** have ever been observed, including the 401 pass, which produced both ends and nothing between | A partial failure needs some attempts against one target to fail while others succeed. A bad credential fails all of them; a healthy run fails none | A real rate limit or transient 5xx mid-run - likelier as prompt lists grow, and certain once a second worker multiplies the effective provider limit |
| **The retry path** - a retryable status producing more than one HTTP attempt (C6) | Never: **0** answers have `httpAttempts` > 1. The one known real 429, on the first live gate run, predates stored answers | Nothing in the gate provokes a 408, 429 or 5xx | Concurrency against a provider limit. `PROVIDER_CONCURRENCY` is 4 per provider per process today |
| **A reclaim and resume** - a stale run taken over and finished by the next worker (C15) | Never: **0** runs have `reclaimCount` > 0 | No worker has died mid-run in production, and no deploy has yet interrupted a real run | A deploy during a long run. The 300-call ceiling makes runs long enough that this is now a question of when |
| **`failed` as a terminal status** - both of its causes (SPEC -> Run status) | Never: 11 `completed`, 1 `completed_with_errors`, **0** `failed` | Neither cause - no target reaching the threshold, or the reclaim limit exceeded - can be produced by a healthy gate | The rate-limit case above, or four interrupting deploys against one run |
| **Average position `not-applicable`** - measured, and the brand was named in no successful answer | Never: **0** stored `ok` answers lack a subject mention | Every run so far has measured a brand the models actually name | **A real client that is genuinely absent** - which is precisely the customer this product exists for. The least-exercised path belongs to the most important user |
| **The same host cited with and without `www.`** in one target's answers, which must group as one domain (C16) | Never: **0** hosts have appeared in both forms | Nothing forces a model to vary the form it cites | More answers, or a provider that normalises differently from the other |
| ~~Two pages of one site inside one answer~~ | **Observed, 12 times.** This one is real | - | - |
| **The long-context price tier** - over 272,000 input tokens at openai (`pricing.ts`) | Never: **0** answers. A buying-moment prompt runs about 20,000 input tokens | Nothing in v1's shape approaches it | Not v1. The branch guards against a provider changing the threshold rather than against this product's own traffic |
| **"Cited but not named"** - a client's own domain in the citations of an answer that named somebody else (Phase 13) | Never, and it cannot have been: **0** `ok` answers have ever had the subject go unnamed, so there has never been an answer for it to happen in | Every brand measured so far is one the models name readily, so the subject is named in every successful answer | Phase 9's deliberately absent brand. It is the first realistic chance, and Phase 9 now carries a criterion to report the count **even when it is zero** |
| **C11 firing at all** - two runs of one company differing in basis | Never. Production holds **one** run; no two runs have ever differed in basis outside tests | Nothing in a gate changes a company's prompts, aliases, competitors or targets between runs | An operator editing a company between runs, which is ordinary use and will happen the first week a real client exists |
| **A series interrupted and resumed** - basis A, then B, then A again, which must be two series and not three | Never | As above, and it needs three runs across two bases | The same operator changing something and changing it back - likelier than it sounds, since a prompt list is edited by re-pasting |
| **C3's prompt-maximum and C19's planned-call refusals** | Never triggered by a real request | Both refuse before a run exists; no operator has yet asked for one that large | An operator pasting a long list, which is what they are for |

Two notes on reading this table. The `www.` row and the struck-through row beneath
it were flagged together as "likely, and invisible if wrong" - one of them turned
out to be happening already, which is the argument for counting rather than
assuming. And the degraded coverage rows were **partly** closed on 2026-08-25 by
the 401 browser pass in Phase 11: 0 percent and its "no data" cells have now been
produced by a real provider failure. What has not is anything in between.

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

- Delivers: C3, C19
- Done when: WHEN a run is started, a run record with status `queued` exists
  carrying an immutable snapshot of the prompt texts, the target list, the brand
  name, the aliases and the competitors, plus the chosen N and the `basisHash`
  computed over five inputs - prompts, targets, aliases, competitors and the
  measurement semantics version, but **not** the brand name - and the request
  returns without waiting; IF the
  company has no prompts, the request is rejected and no run is created; editing
  the company's prompts, aliases or competitors afterwards leaves that run
  unchanged - verified by `npm run test -- api/runs-queue`,
  `npm run test -- hash` and `npm run verify`.
- Commit: `feat: queue a run`
- **C19 added afterwards, 2026-08-25, and satisfied by commit `820ea43`.** The
  planned-call bound shipped as debt work between phases and had no capability
  behind it, so nothing obliged either the refusal or the derived estimate; the
  Stage 3 check found `queue.ts` calling both cost guardrails "neither a spec rule"
  while `SPEC.md` stated one of them as a normative clause. C19 promotes the bound
  rather than demoting the clause, because refusing a run before it spends money,
  with a stated reason, is observable behaviour that protects a customer from a
  bill. It takes no new phase - the work exists and is covered by the cost-bound
  block in `tests/api/runs-queue.test.ts`, five tests of which go red if the bound
  is removed - which is the same handling C18 got against Phase 7.

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
  markdown link targets, image targets, fenced code blocks, URLs and email
  addresses, prefers the longest matching alias, and resolves a name in both lists
  in favour of the subject brand; a brand occurring only in a citation counts as
  not mentioned - verified by
  `npm run test -- parse/visible-text` and `npm run test -- parse/mentions`
  against fixtures covering alias variants, casing, accents, punctuation,
  line-wrapped names, markdown links, code fences, overlapping aliases, absence,
  an empty competitor list, a brand at the very first and very last character of
  the answer (both must match), a plural of a single-word alias (which must
  **not** match, per C8), and each address form - bare URL, autolink,
  reference-link definition, `www.` host and email address - none of which may
  count, while a bare domain written as prose still may.
- Commit: `feat: mention parsing`
- **Scope note, recorded 2026-08-25.** The parser and its persistence both existed
  before this phase - Phase 0 wrote a minimal `mentions.ts` and `visible-text.ts`,
  Phase 5 wired `findMentions` into `persistAttempt`. What this phase did was make
  every clause of C8 actually hold and provable: it widened the Visible text
  definition after finding four address forms that counted a brand from inside an
  address (see `SPEC.md` -> Definitions), and it added the seam file
  `tests/parse/mentions-seam.test.ts`, without which deleting the one line that
  calls the parser left the whole parser suite green.
  **What the browser pass measured about the widening: nothing, and that is worth
  recording.** One real prompt at N=3 against both targets produced six answers
  containing zero bare URLs, zero autolinks, zero reference definitions and zero
  email addresses - anthropic emitted no links in its text at all, and openai
  emitted only markdown links, which the previous parser already handled. Re-parsed
  under both the old and the new reduction, all six give an identical result. The
  four gaps are real and each is proved by a test that goes red against the old
  parser, but they are proved against constructed text; how often a real model
  emits them is unmeasured, and one question is not a sample. Phase 9's ten real
  prompts are the first honest opportunity to say.

## Phase 7 - Aggregation, coverage and cost

- Delivers: C9, C10, C12, C18
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
  **C18's clause, added 2026-08-25:** every prompt in the run's snapshot has its
  text displayed on the run page and returned by `GET /api/runs/:runId`, verified
  by `npm run test -- ui/run-page` - both assertions go red if either is removed.
  This clause exists because C18 was satisfied by this phase's code and guarded by
  nothing, which is the defect the capability was written to close, reproduced on
  the capability itself.
- Commit: `feat: aggregation, coverage and cost`
- **Recorded 2026-08-25.** Two things this phase established that later phases
  inherit. C10 is enforced in two places because it can fail in two - `Figure<T>`
  makes a value unreachable without its coverage and N, and
  `tests/ui/run-page.test.ts` asserts the page prints them; strip the qualifier
  from the renderer and every arithmetic test stays green while the page tests go
  red. And the read was measured rather than assumed at the 300-call ceiling: 5 to
  7 SQL queries, 26 ms, with `aggregateRun` itself at 0.3 ms - constant in queries,
  growing only in bytes. See `ARCHITECTURE.md` -> Key decisions.
- **C18 added afterwards, 2026-08-25, and satisfied by this phase's commit.** The
  capability was written after Phase 7 shipped, when the check against the
  Objective and the Vision found "the prompt library is not a secret" enforced by
  nobody. It takes no new phase, because the work exists: the run page renders a
  per-prompt breakdown for each target and prints each prompt's text from the run's
  own snapshot, reachable in one click and without constructing a URL. That is the
  same handling C1, C13 and C14 got in the pack rewrite - map the capability onto
  the phase that already delivered it rather than invent one.
  **One caveat, recorded rather than papered over:** the prompt texts are rendered
  inside each target's breakdown, so a run with zero targets would display none.
  No such run can be created - `POST /api/runs` requires at least one target and
  `queueRun`'s only other caller passes the default list - so the gap is
  unreachable rather than absent, and it is written here so a future change to
  either of those does not silently break C18.

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
- **Decisions recorded 2026-08-25.** The domain rule is stated in `SPEC.md` ->
  Definitions -> Cited domain: host, lower-cased, trailing dot and leading `www.`
  removed, and **a subdomain is its own source**. The consequence worth knowing is
  that it needs **no public suffix list at all** - nothing in it depends on where a
  registrable domain begins, so no country TLD can defeat it. The trigger for a
  public suffix list is therefore not a new country but the first capability that
  needs two hosts grouped by *organisation*, which is Phase 13 below.
  Ties are broken by domain ascending compared by **code unit**, not by
  `localeCompare`, which depends on the runtime's ICU data and can order two
  domains differently on a laptop and in the container. The competitor list has
  been corrected the same way; it had used `localeCompare` since Phase 7.
- **The degraded browser pass was run, 2026-08-25, and every clause held.** One
  prompt at N=3 against both targets with an **invalid Anthropic credential**, on
  the deployed code running locally. What the page actually showed:
  run `completed_with_errors`; totals "over 3 successful answers of 6 planned ·
  N=3 · $0.18"; the anthropic target labelled *"Unreliable - coverage 0% is below
  the threshold, so these figures are not presented as a measurement. The other
  targets are unaffected"*, with all four of its figures reading "no data · coverage
  0% (0 of 3 planned) · N=3 · unreliable" and its single cell reading *"no data -
  all 3 attempts failed"* rather than a zero; the openai target unaffected at 100
  percent with mention rate 100%, average position 1, and a cited-source table
  reading `coolblue.nl 3 · mediamarkt.nl 3 · consumentenbond.nl 2 · expert.nl 2 ·
  tweakers.net 2 · acm.nl 1 · rijksoverheid.nl 1` - count descending with every tie
  in ascending domain order. The run stayed visible throughout.
  **The broken provider cost nothing**, as predicted: 401 is not a retryable
  status, so each failed attempt records `httpAttempts` 1 and `costMicros` 0. The
  whole pass cost 181,112 micro-dollars on the working provider alone.
  These clauses had never been exercised by a real provider failure before this.
  They now have been - by a transport failure. The **web-search error object**
  remains the untested path; see the note below.
- **Closing sequence addition: one degraded browser pass.** Do this pass as part of
  this phase's close, not as work of its own. Run it with an **invalid credential
  for one provider only**. The working provider costs its usual few cents; the
  broken one costs nothing, because a 401 never reaches a billable call. What comes
  out is exactly the scenario the degraded clauses describe - one target at 0
  percent labelled unreliable, its cells reading "no data" rather than zero, the
  other target unaffected, the run still visible - with a real provider on the
  other end of the failure rather than a row someone constructed.
  It exists because **Phase 9 is structurally incapable of producing it**: that
  gate requires 80 percent coverage per target to pass, so it cannot exercise the
  code that handles coverage below the threshold. Without this pass those clauses
  stay fixture-backed through Ship.
- **What that pass does not cover, and what would.** A 401 is a transport failure.
  It does not exercise the **web-search error object** - the HTTP 200 carrying an
  error instead of a result list, which CLAUDE.md rule 8 exists for and which is
  the failure the whole verification gate was built to catch. That path stays
  proved against `documented` fixtures until a real one is seen. Its trigger is
  already written down: see "Upgrade the error fixtures from `documented` to
  `observed`" under Engineering items, and `logFailureEvidence`, which writes the
  raw body of every response-shaped failure to the worker log precisely so that
  trigger can be acted on. The limitation now has a trigger rather than a hope.

## Phase 13 - Mark the client's own cited domain

The open question the pack rewrite left, answered: **yes, eventually, and not in
Phase 11.** A target citing the client's own site while recommending somebody else
is "cited but not named" made visible on the page, and it is one of the more
sellable things this instrument can say - see `SPEC.md` -> Open questions, where
that state is already named and reserved.

It is a phase of its own rather than part of C16 because it needed a website field
on `Company` and somewhere to enter it, and folding a migration into C16 would have
made one phase do two things.

- Delivers: C16, extended
- **Both stop-and-asks were answered 2026-08-26. One yes, one no.**
  *The website field: approved.* One nullable column, no backfill, no existing run
  changed meaning. It is not speculative - it unlocks "cited but not named", and
  the presence-audit stage at roadmap stage 5 needs the same field.
  *The public suffix list: refused, and it turned out not to be needed.* The
  reasoning in the paragraph above was wrong in a way worth keeping: it assumed
  the phase had to decide that `acme.nl` and `shop.acme.nl` are one business, which
  in general requires knowing where the registrable boundary sits. It does not have
  to decide, because **the operator supplies the answer** - the client gives their
  website. The question is not "what is the registrable domain of
  `shop.acme.co.uk`" but "does this cited host equal, or end with a dot plus, the
  host the client gave us", which needs `new URL`, a `www.` strip and a suffix
  comparison. It works identically for `.nl` and `.co.uk`.
  Two further reasons the dependency was refused rather than merely unnecessary. A
  public suffix list is data that ages, and this is a **read-time** rule - so a
  routine dependency update would silently change what counts as one business,
  which is precisely the drift `AGGREGATION_SEMANTICS_VERSION` exists to catch and
  precisely the kind of change nobody thinks to version. And it would have arrived
  without any capability needing its general case.
- Done when: WHEN a target's cited-domain list is displayed, the domains belonging
  to the client's own site are marked as such; IF a company has no website
  recorded, THEN the list is displayed exactly as C16 specifies and nothing is
  marked - the absence of the field is never rendered as "none of these are yours".
- Commit: `feat: mark the client's own cited domain`
- **Recorded 2026-08-26.** The inconsistency this phase creates, named rather than
  inherited: a run's **figures** are frozen - a run is a measurement taken at a
  time, not a query standing over stored text - but the **marking** is computed at
  read time, so an old run's domain list is marked against today's website. That is
  correct and stays: the marking annotates a stored measurement exactly as every
  other read-time aggregate does, and the alternative - snapshotting a website onto
  each run - would make changing a domain break a series, which is the false
  negative this project has now avoided three times. What it requires is that the
  page **say so**, and it does: the note names the host being matched against and
  that it is the one recorded now. Without it a customer who changes their domain
  sees an old run's marking move and reasonably concludes the measurement moved.
  Neither `basisHash` nor `AGGREGATION_SEMANTICS_VERSION` covers this, and that is
  worth knowing: the version governs changes to the **rules**, while a website is
  mutable **data**. It is the first read-time input of that kind, and the only
  protection against it is the sentence on the page.
  **Browser pass, 2026-08-26, $0.00** - the Coolblue run already cited the client's
  own site, so no provider call was needed. Recording `https://www.coolblue.nl`
  through the form marked `coolblue.nl 3 (yours)` on both targets and marked
  nothing else - `mediamarkt.nl`, `expatinfoholland.nl`, `ikea.com`,
  `en.wikipedia.org`, `consumentenbond.nl`, `expert.nl` and `kieskeurig.nl` all
  unmarked - with the note naming `coolblue.nl` as what it was matched against and
  saying it is the website recorded **now**. The order was untouched:
  `coolblue.nl`, `expatinfoholland.nl` and `ikea.com` all at 3, still in ascending
  domain order. The absent case was checked on a second real run whose company has
  no website: zero occurrences of "(yours)", zero of the note, and the cited list
  rendered in full.

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
- **Recorded 2026-08-25.** Three things this phase settled.
  **"One step" is measured in the reader's action, not the transport.** A page that
  inlined every answer was zero steps and unusable; a link that opens the evidence
  for the figure in front of you is one step and correct. Measured at the 300-call
  ceiling: the run page fell from **1,377 KB to 163 KB**, an evidence page for one
  target is 692 KB - the size of what was actually asked for - and for a single
  cell it is **20 KB**, which is the path a reader disputing a "no data" cell
  takes. Query count is unchanged at 7; this was never about queries.
  **Each figure type reaches a different shape of evidence, and `lib/evidence.ts`
  states the mapping rather than implying it.** Mention rate reaches the successful
  answers; average position the narrower set that named the brand; competitor
  frequency and cited domains the successful answers, with the cited-domain
  explanation telling a reader *before* they count URLs by hand that the unit is
  the answer; coverage is the odd one, because its denominator is the plan and its
  evidence therefore includes attempts that were never made and have no row at all.
  **The seam test was too weak on the first attempt, and that is worth keeping in
  the record.** It asserted the healthy target's link reached the healthy target -
  which stays true when *every* link on the page is wired to the first target.
  Wiring them all to target 0 left it green. It now asserts per block: every
  evidence link rendered inside one target's section reaches that target and no
  other, and the same experiment turns it red. A link that resolves proves nothing
  about where it resolves to.

## Phase 8 - Comparability guard

- Delivers: C11
- Done when: IF two runs of one company differ in `basisHash`, THEN they are not
  presented as one series and the change of measurement basis is stated - verified
  by `npm run test -- comparability` with **seven** runs: identical basis, changed
  prompt, changed model id, changed alias list, changed competitor list, and a
  changed **`MEASUREMENT_SEMANTICS_VERSION`** - plus a seventh with only the brand
  name changed, which must **not** break the series.
  The semantics-version case was added 2026-08-25 and is the one that matters most
  here, because it is the input C11 was extended to carry and the only one no
  operator action produces: an alias change is visible to whoever made it, while a
  parser change is visible to nobody. Without that case the criterion could not
  fail on the very input the guard had just been given, and Phase 9 - which
  compares two runs a day apart - is where that would first have mattered.
- Commit: `feat: comparability guard`
- **Recorded 2026-08-25.** Three decisions, one of which reversed an earlier one.
  **What C11 observably guards today is the company's run list.** There is no trend
  chart - deferred until Phase 9 establishes an N - and the run page shows one run
  at a time, so it was worth asking whether the guard had any surface at all before
  building to it, given that C18 turned out to have none a week after it was
  written. It does: the run list shows every run of one company in time order with
  its basis, and a reader looking at four rows descending by date is reading a
  series whether or not anything calls it one. They are now grouped, and a list
  spanning more than one basis says in words that it is not one series. The API
  returns the same grouping so a client need not re-derive it. When scheduled runs
  arrive at stage 3 and a chart is drawn, it is drawn over these groups.
  **Prompt and target order no longer change the basis.** Every (prompt, target,
  repetition) is an independent call, so twenty prompts asked in a different order
  are the same twenty questions, and hashing them as a list refused a comparison
  between two runs that had asked identically. That is a **false negative**, and it
  is the quieter of this guard's two failure modes: a false positive draws a wrong
  line and somebody argues with it, while a false negative only tells a customer
  their history is unavailable. The canonical form of all four operator inputs is
  now recorded in `SPEC.md` -> Definitions, and the two tests that asserted the old
  decision were inverted rather than deleted.
  **The aggregation version cannot make the guard refuse, and that is now a test
  rather than a comment.** `tests/comparability.test.ts` recomputes the hash payload
  from exactly its five inputs, so adding a sixth - the aggregation version or
  anything else - turns it red, which no comment can do.
  **The browser pass found the guard firing on real history, not constructed
  rows.** The `verify-live` company has 12 runs across **three** bases: 8 from
  before the semantics version existed, 1 from an intermediate version, and 3 from
  after the canonical form changed. Every one of those splits was caused by this
  project's own changes over two days, and the page now says so - "these 12 runs
  were measured on 3 different bases and are not one series" - instead of listing
  twelve rows a reader would take for one line. The register's C11 row stays
  accurate all the same: **no operator action** has ever changed a basis, which is
  the case the guard was written for and the one still unexercised.

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
  - **The link-text-domain false negative is counted.** Since 2026-08-25 a
    markdown link whose visible text is a bare domain is removed with its target,
    so a brand named *only* that way is not counted. Count the answers in which a
    recognised brand appears only as link text and nowhere else in the visible
    text. The expectation is zero, because a model that recommends a business names
    it in prose; **if it is not zero on real data, it comes back to the operator**
    before Phase 10. This is a measurement of a belief, not a check of the code.
  - **The aggregation semantics version is legible to a reader comparing over
    time.** C9 states the version on every rendering; C11 deliberately does not
    react to it, because a change in how figures are summarised does not make two
    runs incomparable to each other. What is missing, and what this phase is the
    right place to settle, is the reader-facing half: saying "these figures were
    computed under a different aggregation rule than the ones you saw before"
    when it is true. Decide the wording against real figures rather than in the
    abstract; nothing was built for it in Phase 11.
  - **At least two brands are measured: one the models name, and one genuinely
    absent.** Every run this project has ever made measured a brand the models
    name readily, so the register above records that "average position, not
    applicable - measured, and the brand was named nowhere" has **never been
    produced by reality**. That is not a gap in coverage, it is a gap in the
    screen this product sells.
    The reasoning is commercial rather than technical. First contact with almost
    every customer is a free scan whose most common honest answer is "you are not
    named in any of these six answers". That is the screen a plumber sees, and it
    is the screen that decides whether they pay - and it is the one screen this
    instrument has never rendered from real data.
    So: pick a real small business in a real city whose category the models will
    answer about, and expect zero mentions. **It must not render as a degraded
    run.** Coverage can be 100 percent, every attempt successful, every figure
    valid, and the answer still be that the brand appears nowhere. Mention rate
    reads a measured 0 percent; average position reads not-applicable and never
    "no data"; the cited-domain list is full; nothing is labelled unreliable.
    **The distinction between "we could not measure you" and "we measured you and
    you are not there" is the single most important thing this instrument
    communicates, and only one side of it has ever been on screen.** Verify it on
    the page, not only in the figures.
  - **A third brand, whose name is also an ordinary word.** Bakkerij De Zon,
    optician Vision, cafe Het Anker. A large minority of small businesses are named
    this way and the mention parser has only ever been tested against distinctive
    proper nouns - Acme, Coolblue, Globex - which is a selection effect in the
    evidence rather than a property of the parser.
    The failure mode is the **mirror image** of the address problem fixed on
    2026-08-25. There the parser counted citations as mentions; here it would count
    ordinary language as a mention - "de zon scheen die dag" scoring as a
    recommendation. Word boundaries and longest-alias-first do not touch it,
    because the match is a genuine word match; what is wrong is that the word is
    not being used as a name.
    **This criterion is a measurement, not a fix.** Run it, count how often a
    recognised brand is matched where the words are not naming the business, and
    record the number. If it is common it becomes a phase; if it is rare it becomes
    a row in the register with a count behind it. Either way it stops being a
    hunch. Three brands - one named readily, one absent, one an ordinary word - and
    all three cases that occur in practice are covered by one run.
  - **"Cited but not named" is watched for, and reported whether or not it
    occurs.** The register records that no `ok` answer has ever had the subject go
    unnamed, so a client's own domain appearing in the citations of an answer that
    recommends somebody else has never happened in real data either. The absent
    brand above is the first realistic chance to see it. Count the answers where
    the client's own domain is cited and the subject is not named, and report the
    figure **even when it is zero** - a zero here is a finding about the market,
    not a gap in the run.
  - **Citation churn and mention churn are measured separately, on the same runs.**
    This is a distinct criterion from the stability check below, and the two must
    not be merged. The published volatility figures in this category - see Roadmap
    stage 3 - measure how fast **cited sources** change and are widely reported as
    though they measured visibility. They are not the same quantity. A model can
    cite an entirely different set of pages this week and still recommend the same
    three businesses; whether it does is an open empirical question that nobody has
    published.
    This instrument stores mentions and citations separately, per answer, on
    immutable hashed runs, so it can measure both from one pair of runs on an
    identical basis: the proportion of cited domains that changed between them, and
    the proportion of recognised brands that changed. Record both, per target.
    IF mentions turn out to be materially more stable than citations, THEN that is
    a finding this category has not published and it belongs to differentiator 3;
    record it in `SPEC.md` -> Vision rather than only in a phase report. IF they
    move together, that is equally worth knowing and weakens the case for the
    recurring stage rather than strengthening it.
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
  nineteen capabilities pass their EARS criteria; the real-brand run from Phase 9
  is reachable at the deployed URL; every environment variable is set on every
  service that needs it; both provider integrations have been exercised live end
  to end; and the "Blocked on the operator" list above is empty.
- Commit: `chore: launch`

## Roadmap beyond v1

This replaces what used to be a flat "Deferred" list. It is in two parts.
**Product stages** are ordered: each one unlocks the next, and each names what
must exist before it can start. They are called stages, not layers, because
`SPEC.md` -> Vision already numbers three *layers* and they are not these -
Vision's layer 3, the causal dataset, is delivered by stage 7 here.
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

**3. Scheduled, recurring re-measurement.**
*Unlocks:* the subscription. It is the mechanism that turns a one-off analysis
into a recurring one, and it is why this category charges monthly at all: the
measurement keeps running because the answer keeps changing. This product has a
stronger claim to that than the incumbents do, because it can **demonstrate** the
staleness rather than assert it - cited domains are already stored per answer
(C16) and runs are already immutable and hashed, so the churn in what a model
draws on is measurable from this system's own history.

Two published measurements of that churn, and both say it is far faster than a
monthly cadence assumes:

- **SISTRIX**: 82,619 qualified prompts and 1,548,213 snapshots over 17 weeks,
  17 December 2025 to 8 April 2026, six countries. ChatGPT Search replaced **74
  percent of cited sources weekly** and Google AI Mode 56 percent, while Google AI
  Overviews drifted only 5 percent weekly with 53 percent of prompts unchanged.
  The authors call their domain-level figures conservative; URL-level volatility
  ran 15 percent higher. (as researched 2026-08-25; re-check, don't trust)
- **GetMentions**: 530,875 citations from 67,144 answers across 2,398 queries over
  7 consecutive days in June 2026, logged-out and non-personalised from a fixed
  location. **69 percent of sources changed day to day** - Gemini 88.3 percent,
  ChatGPT 79.2 percent, Google AI Mode 75.9 percent, Perplexity 44.4 percent.
  (as researched 2026-08-25; re-check, don't trust)

**Read both with the interest in mind.** GetMentions sells in this category, and
so does Profound, whose volatility post sits alongside these; a vendor selling
monitoring has an interest in a high churn number. SISTRIX is a search-data
company with a stated methodology and a stated conservative bias, which is why it
is listed first. Neither is peer-reviewed. These figures are a reason to build the
stage, not evidence this product may quote at a customer - what it may quote is
what it measures itself.
An earlier working figure of 40-60 percent monthly was carried here briefly and
was wrong in the safe direction: the published measurements are weekly and daily,
not monthly, so the case for re-measurement is stronger than the guess it replaced.
The two are also **not the same quantity as the one this product sells** - see
Phase 9, which measures citation churn against mention churn on the same runs.
*Requires first:* stage 1, because an automatic run spends real money and must be
something a customer has already paid for - which is the same condition
`SPEC.md` -> Explicitly NOT in scope -> "Scheduled or automatic runs" already
names; and stage 2, because a subscription price has to be set against what a
recurring run actually costs. It also requires **C11**: a measurement repeated
across a changed basis is not a trend, it is two instruments, and a scheduler that
quietly re-ran a customer on a drifted basis would draw exactly the line this
product exists to refuse. C11 is Phase 8 and therefore lands before Ship, so
nothing here is blocked. Mechanically the stage is small - a cron writes the same
`queued` row the web layer writes, and no new trigger mechanism is needed - which
is precisely why it survived as a chore nobody would allocate a phase to.

**4. Automatic prompt generation from business, city and category.**
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

**5. An audit of the customer's own presence against the harvested criteria.**
*Unlocks:* the bridge from measuring to acting - the "find out what is missing
from its own presence" half of the Vision, and the first thing a customer can do
something with on a Tuesday.
*Requires first:* the harvested criteria, which come from a judge pass over
stored raw answer text (see Engineering items), and a website field on `Company`
that the v1 data model deliberately does not have - the same field that would let
C16 mark which cited domain is the client's own. Both are data model changes and
therefore stop-and-ask.

**6. More providers, more languages and more countries.**
*Unlocks:* the "any trade, any city, any language" claim in the Vision, and the
population size that stage 7 needs.
*Requires first:* stage 4, for the prompt library; the shared rate limiter, since
more targets is what finally makes a second worker worth running; and per-country
competitor sets. The target list, the provider enum and the adapter registry
already take N entries, so a new provider is a new file and a list entry.
Gemini and Grok for coverage; **Perplexity** specifically because citations are
its core product.

**7. The advice engine, built on the causal dataset.**
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

- **Upgrade the error fixtures from `documented` to `observed`.** *Triggered by:*
  the first real web-search error object seen in production. Seven of the nine
  files in `tests/fixtures/` are `documented` - their shape comes from the
  provider's own documentation, not from a response this system has received - and
  they are the only evidence CLAUDE.md rule 8 is checked against outside the live
  gate. `logFailureEvidence` writes the raw response of every response-shaped
  failure to the worker log precisely so this trigger can be acted on: take the
  logged body, rebuild the fixture, change its `$meta.evidence` to `observed`.
  Until then the rule is proved against dated documentation, which is a real
  boundary and is stated as one - see "Register of behaviour reality has never
  produced" above, which now holds every such boundary in one place.
- **A test for the transport-error branch of each adapter.** *Triggered by:* the
  same event, or sooner if a transport failure shape changes. `ask()`'s `catch`
  block - the one that turns a thrown SDK error into `{ ok: false }` with a
  retryable flag - is covered for Anthropic by one stubbed case in
  `tests/providers/ask-seam.test.ts` and not at all for OpenAI, and neither
  exercises a real 5xx, timeout or rate limit. The retry policy that sits on top
  of `retryable` is tested; the classification feeding it is not.
- **Component tests for the UI.** *Triggered by:* the second person able to change
  a component, or the first UI regression that reaches a client. **Narrowed
  2026-08-25:** the run **page** is now covered - `tests/ui/run-page.test.ts`
  renders the real server component with `react-dom/server`, already a dependency,
  and vitest's own mocking for `useRouter`; no DOM environment and no stack change
  were needed. What remains uncovered is the **client** components -
  `prompt-editor.tsx`, `start-run-dialog.tsx` and `run-progress.tsx` - whose
  behaviour is interaction rather than markup, and they are still covered only by
  the hand browser pass each phase performs. That
  is adequate while one operator writes and checks every screen and stops being
  adequate the moment it is not. Adding it means a jsdom environment and a
  component-testing library, which is a stack change and therefore a stop-and-ask.
- **A public suffix list.** *Triggered by:* the first capability that must group
  hosts by organisation **without being told which organisation** - which is
  shared-dataset work, not any phase now scheduled. Phase 13 was expected to be the
  trigger and was not: the operator supplies the client's host, so that capability
  never has to infer a registrable boundary. It is explicitly **not** triggered by adding a
  country: C16's domain rule never groups by registrable domain, so `acme.co.uk`
  and `blog.acme.co.uk` are simply two hosts and no multi-label suffix can defeat
  it. A naive last-two-labels rule would break on `.co.uk` and `.com.au`, which is
  why the rule avoids the question rather than answering it badly. Adding the list
  is a new dependency and therefore a stop-and-ask.
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
  product stage 5 needs.
- **Historical trend charts.** *Triggered by:* Phase 9's stability check
  establishing an N at which run-to-run variation is smaller than the movement the
  chart would draw. Runs are already immutable and hashed on their full
  measurement basis, so the series exists; only the chart is missing, and drawing
  it before that condition holds is the category's own worst habit.
- **Exports.** *Triggered by:* a customer asking for the numbers outside the app.
  A run's figures and its citation list as CSV or PDF; everything needed is
  already derivable from stored rows.
- **`archivedAt` on companies and runs.** *Triggered by:* customers creating rows
  the operator did not, which is the accounts stage. Hides a row from a list
  without destroying stored answers; it is not a delete.
- **Server-sent events for run progress.** *Triggered by:* runs growing long
  enough that two-second polling becomes wasteful.

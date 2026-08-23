# SPEC - Large AI

## Objective

Large AI lets a business find out, with a reproducible number, how often and how
prominently its brand appears in the answers that large language models give to
the questions its buyers actually ask - and which sources those models cite when
they answer. v1 measures. It does not advise.

## Primary user

**The operator** (Johan). He onboards a client company, agrees the buying-moment
prompts with that client, starts a measurement run, and reads the result back to
the client. He is the only person who enters data.

**The client** is a secondary reader. In v1 there are no accounts and no login:
the client is given the URL of a run and can read it. Anyone holding an
application URL can navigate to any company. This is a deliberate v1 limitation,
not an oversight - see `ARCHITECTURE.md` -> Key decisions.

## Core action

Start a run for one brand against a fixed list of prompts and two LLM providers,
and read back per provider: how often the brand was mentioned, at what position,
next to which competitors, and which sources the model cited.

## Definitions (these words are used precisely throughout the pack)

- **Run** - one measurement: one company x M prompts x T targets x N repetitions.
- **Target** - one (provider, model id) pair. v1 has two; nothing assumes two.
- **Repetition** - one of N independent attempts at the same (prompt, target).
  LLM answers are non-deterministic; a single attempt is a sample of one.
- **Attempt / Answer** - the result of one repetition against one target. Carries
  raw text, status, citations, token usage and cost.
- **Coverage** - successful answers divided by the **planned** attempts for that
  target, which is the number of prompts times N. Computed per target, never for
  the run as a whole. The denominator is the plan, not the number of stored rows:
  a run abandoned after a tenth of its work must not read as fully covered.
- **Visible text** - the answer text with markdown link targets, image targets and
  fenced code blocks removed. All brand matching happens on visible text only.
- **Position** - the rank of the brand's first occurrence in the visible text
  among all recognised brands in that one answer. It is ordering in the text, not
  the model's intended ranking.
- **Recognised brand** - the subject brand (via its aliases) or a competitor from
  the run's competitor snapshot. v1 does not discover unknown brands.
- **Measurement basis** - the ordered prompt texts, the ordered target list, the
  brand aliases and the competitor list of a run, hashed together as `basisHash`.
  The brand **name** is deliberately excluded: renaming a company does not change
  what was measured, while changing an alias does. N is excluded too - see C10.

## Capabilities (v1) - each has an ID and an EARS criterion

- **C1 - Company registry**: WHEN the operator submits a company with a non-empty
  name, the system SHALL persist that company together with its brand aliases and
  its competitor names, and make it retrievable by id.
  WHEN the operator edits a company's name, aliases or competitors, the system
  SHALL persist the change and SHALL leave every existing run untouched.
  IF a company is submitted or edited with an empty name, THEN the system SHALL
  reject it with a validation error and persist nothing.

- **C2 - Prompt list**: WHEN the operator saves a prompt list for a company, the
  system SHALL persist each non-empty line as one ordered prompt belonging to that
  company, replacing the previous list in full.
  IF a prompt list contains more than 50 prompts, THEN the system SHALL display a
  warning stating the resulting call count **at the default N and the default
  target list**, naming both, and SHALL still allow the save. The prompt endpoint
  does not know the N or the targets of any future run, so the figure it shows is
  explicitly the default case and says so.

- **C3 - Queue a run**: WHEN the operator starts a run for a company, the system
  SHALL create a run record with status `queued` carrying an immutable snapshot of
  the prompt texts, the target list, the brand name, the brand aliases and the
  competitor list, together with the chosen N and the `basisHash` computed over
  exactly four of those - the prompt texts, the targets, the aliases and the
  competitors - and SHALL return without waiting for the measurement to finish.
  IF the company has no prompts, THEN the system SHALL reject the request and
  create no run.

- **C4 - Claim and execute**: WHILE a run has status `queued`, the worker SHALL be
  able to claim it exactly once, set it to `running`, and execute one attempt for
  every (prompt, target, repetition) combination, sending the prompt text
  unmodified with the provider's server-side web search tool enabled, with no
  system prompt, no sampling parameters, and a `max_tokens` set only high enough
  that an answer is never truncated.
  IF two workers claim concurrently, THEN exactly one SHALL obtain the run and the
  other SHALL receive none.

- **C5 - Record every attempt**: WHEN an attempt completes, the system SHALL
  persist one answer row carrying its status, the raw answer text, the provider,
  the model id, the repetition number, input and output token counts, the number
  of web searches performed, cost, and latency.
  IF an attempt fails, THEN the system SHALL persist an answer row with status
  `failed` and a failure reason, and SHALL NOT persist it as an answer in which the
  brand was absent.

- **C6 - Retry transient failures**: IF a provider call fails with a rate limit, a
  timeout or a 5xx, THEN the system SHALL make at most three attempts in total -
  the initial call plus two retries - with exponential backoff between them,
  before recording it as failed. The number of attempts spent is stored on the
  answer row.

- **C7 - Extract citations**: WHEN a provider returns web search results, the
  system SHALL persist each cited source as a citation row carrying its URL and
  title, linked to the answer it came from.
  IF the provider returns a web search error object instead of a result list, THEN
  the system SHALL record that attempt as failed and SHALL NOT record it as an
  answer containing zero citations.

- **C8 - Parse mentions**: WHEN an answer is recorded successfully, the system
  SHALL determine which recognised brands occur in its visible text and SHALL
  persist, for each, its 1-based position by first occurrence together with the
  total number of recognised brands found.
  Matching SHALL be case-insensitive and Unicode-normalised; SHALL require a
  non-alphanumeric boundary or a string edge on both sides; SHALL tolerate
  additional whitespace and line breaks inside a multi-word alias; SHALL ignore
  markdown link targets, image targets and fenced code blocks; SHALL prefer the
  longest matching alias where aliases overlap; and SHALL resolve a name present in
  both the alias list and the competitor list in favour of the subject brand.
  There is no stemming and no suffix rule: a plural or possessive suffix that is
  itself alphanumeric breaks the boundary, so "Acmes" does not match the alias
  "Acme". An operator who wants such a form counted adds it to the alias list.
  IF a brand occurs only in a citation and not in the visible text, THEN it SHALL
  count as not mentioned.

- **C9 - Aggregate on read**: The system SHALL compute mention rate, average
  position and competitor frequency from the stored answer rows at read time, and
  SHALL NOT store any aggregate as a persisted field.

- **C10 - Coverage and N travel with every figure**: WHEN the system displays any
  aggregate figure, it SHALL display the coverage of that figure's target and the
  run's N alongside it.
  IF a target's coverage is below the configured threshold, THEN the system SHALL
  label that target's figures unreliable instead of presenting them as a
  measurement, SHALL leave other targets unaffected, and SHALL keep the run visible.
  IF every attempt for one prompt against one target failed, THEN the system SHALL
  display that cell as "no data" and SHALL NOT display it as "not mentioned".

- **C11 - Comparability guard**: IF two runs of the same company differ in
  `basisHash`, THEN the system SHALL NOT present them as one series, and SHALL
  state that the measurement basis changed.

- **C12 - Cost visibility**: WHEN a run reaches a terminal status, the system SHALL
  display the total token usage, the total number of web searches and the total
  cost of that run, derived from the per-answer figures.

- **C13 - Fail loudly on missing configuration**: IF an environment variable that
  is required **for the running process role** is absent, THEN that process SHALL
  fail at startup with a message naming the missing variable, and SHALL NOT start
  in a degraded state.
  The provider API keys are required for the worker process and for `verify:live`,
  and are not required for the web process, which never calls a provider. A single
  shared schema that demanded them everywhere would put the web service into a
  restart loop on a host where only the worker holds the keys.
  IF the database is reachable but its major version is not the pinned one, THEN
  the process SHALL fail at startup naming both versions.

- **C14 - Live verification gate**: WHEN `npm run verify` is executed, the system
  SHALL run typecheck, lint and tests, and SHALL then execute one real end-to-end
  run of one prompt against both targets at N=1 through the real queue, worker,
  adapters and parser.
  IF an API key is missing, if the run does not reach a terminal status of
  `completed`, if fewer than two successful answers were stored, if any stored
  answer has no citation, or if the parser produced no result, THEN the command
  SHALL exit non-zero.

- **C15 - Resume a stalled run**: WHILE a worker is executing a run, it SHALL
  refresh that run's heartbeat at least every fifteen seconds.
  IF a run has status `running` and its heartbeat is older than the configured
  staleness window, THEN a worker SHALL be able to reclaim it and SHALL execute
  only the (prompt, target, repetition) combinations that have no stored answer,
  rather than starting the run again.
  IF a run has been reclaimed more than the configured maximum number of times,
  THEN the system SHALL set it to `failed` with that reason and SHALL stop
  spending provider calls on it.

## Run status

- `queued` - created, not yet claimed.
- `running` - claimed by a worker with a live heartbeat.
- `completed` - every attempt succeeded.
- `completed_with_errors` - some attempts failed, and at least one target is at or
  above the coverage threshold, so part of the run is presentable.
- `failed` - no target reached the coverage threshold, or the reclaim limit was
  exceeded. Nothing in this run may be presented as a measurement.

## Explicitly NOT in scope

- **The advice engine** ("use these words", "publish here"). This is v2 and cannot
  be designed honestly before the measurement data exists.
- **User accounts, login, and payments.** v1 has no authentication of any kind.
- **More than two providers.** The schema and the adapter layer are built for N
  providers; the v1 configuration contains two. See Deferred in `PLAN.md`.
- **Historical trend charts.** Runs are stored immutably and comparably, so the
  series exists - v1 simply does not draw it.
- **Scheduled or automatic runs.** Every run is started by hand.
- **Discovery of unknown competitors.** v1 recognises only brands the operator
  entered. Raw answer text is retained so that a later judge pass can find the
  rest by reprocessing, without new provider calls.
- **Deleting companies or runs.** Prompts are removed by saving a shorter list;
  companies and runs have no delete affordance. The stored answers are the asset,
  there is no authentication protecting a delete button, and a mistaken company
  costs one unused row.
- **Steering the model.** No system prompt, no temperature or top_p, no length
  instruction. An instrument that influences its own reading is worse than no
  instrument, because its output looks better.
- **Multiple languages or countries.**
- **White-label reporting, exports, dashboards, run-to-run comparison screens.**
- **Identity with the consumer products.** v1 measures the *APIs* of both
  providers with web search enabled. That approximates what a person sees in the
  ChatGPT or Claude apps; it is not the same thing. Those products run their own
  system prompt, their own retrieval and sometimes a different model version. The
  tool promises representativeness, not identity.

## Success = done when

`npm run verify` exits 0 against the deployed configuration, all fifteen
capabilities pass their EARS criteria, and one real run of a real brand with at
least ten real prompts has completed with every target at coverage of 80 percent
or higher, producing at least one citation per successful answer.

## Open questions - each line names its owner

- **[Owner: you]** Create an Anthropic Console account (console.anthropic.com) with
  prepaid credits and issue an API key. A Claude Max subscription does not grant
  API access (as researched 2026-08-23; re-check, don't trust). Blocks Phase 0.
- **[Owner: you]** Create an OpenAI platform account (platform.openai.com) with
  prepaid credits and issue an API key. A ChatGPT Plus subscription does not grant
  API access (as researched 2026-08-23; re-check, don't trust). Blocks Phase 0.
- **[Owner: you]** Create a Railway account and decide Hobby versus Pro. Three
  services (web, worker, Postgres) are not expected to fit inside the Hobby credit
  (as researched 2026-08-23; re-check, don't trust); expect Hobby plus usage.
  Blocks the first deploy.
- **[Owner: you]** Create the GitHub repository and add both provider API keys as
  repository secrets. Blocks the first deploy in Phase 0 and the on-demand
  `verify-live` workflow.
- **[Owner: you]** Supply the first real brand: name, aliases, competitor list and
  at least ten buying-moment prompts. Without this the Success criterion above
  cannot be met. Blocks Phase 9.
- **[Owner: Claude, Phase 0]** Confirm the exact per-token and per-search prices at
  both providers in their consoles and write them into
  `src/core/providers/pricing.ts` with the date they were read. The estimate used
  during the interview ($25-30 per thousand searches, as researched 2026-08-23) is
  from secondary sources and may be a material share of run cost. Phase 5 stores a
  cost per answer and cannot do so until this table exists.
- **[Owner: Claude, Phase 0]** Confirm the exact model id strings for **both**
  providers against their live models endpoints, and confirm the Anthropic web
  search tool version, before any of them is written into an adapter.
- **[Owner: Claude]** Determine the `max_tokens` value that is high enough never to
  truncate an answer at either provider, during Phase 0, and record it in
  `ARCHITECTURE.md`. A truncated answer can cut off a brand and would be counted as
  not mentioned.
- **[Owner: Claude]** Establish empirically, during `PLAN.md` Phase 9, whether N=3
  produces figures stable enough to be believed. Phase 0 runs one prompt at N=1 and
  cannot answer this. If two runs a day apart on an identical basis differ by more
  than one step of N, then N must rise, and this document and `ARCHITECTURE.md` are
  updated, before Phase 10 begins.

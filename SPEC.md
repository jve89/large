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
- **Answer** - the result of one attempt. Carries raw text, status, citations,
  token usage and cost.
- **Coverage** - successful answers divided by attempted answers, per run.
- **Position** - the rank of the brand's first textual occurrence among all
  recognised brands in that one answer. It is ordering in the text, not the
  model's intended ranking.
- **Recognised brand** - the subject brand (via its aliases) or a competitor from
  the company's competitor list. v1 does not discover unknown brands.

## Capabilities (v1) - each has an ID and an EARS criterion

- **C1 - Company registry**: WHEN the operator submits a company with a non-empty
  name, the system SHALL persist that company together with its brand aliases and
  its competitor names, and make it retrievable by id.
  IF a company is submitted with an empty name, THEN the system SHALL reject it
  with a validation error and persist nothing.

- **C2 - Prompt list**: WHEN the operator saves a prompt list for a company, the
  system SHALL persist each non-empty line as one ordered prompt belonging to that
  company.
  IF a prompt list contains more than 50 prompts, THEN the system SHALL display a
  warning stating the resulting call count, and SHALL still allow the save.

- **C3 - Queue a run**: WHEN the operator starts a run for a company, the system
  SHALL create a run record with status `queued` that carries an immutable copy of
  the prompt texts, an immutable list of targets, the chosen N, and a hash of the
  prompt set - and SHALL return without waiting for the measurement to finish.

- **C4 - Claim and execute**: WHILE a run has status `queued`, the worker SHALL be
  able to claim it exactly once, set it to `running`, and execute one attempt for
  every (prompt, target, repetition) combination with the provider's server-side
  web search tool enabled.
  IF two workers claim concurrently, THEN exactly one SHALL obtain the run and the
  other SHALL receive none.

- **C5 - Record every attempt**: WHEN an attempt completes, the system SHALL
  persist one answer row carrying its status, the raw answer text, the provider,
  the model id, the repetition number, input and output token counts, cost, and
  latency.
  IF an attempt fails, THEN the system SHALL persist an answer row with status
  `failed` and a failure reason, and SHALL NOT persist it as an answer in which the
  brand was absent.

- **C6 - Retry transient failures**: IF a provider call fails with a rate limit, a
  timeout or a 5xx, THEN the system SHALL retry it up to three times with
  exponential backoff before recording it as failed.

- **C7 - Extract citations**: WHEN a provider returns web search results, the
  system SHALL persist each cited source as a citation row carrying its URL and
  title, linked to the answer it came from.
  IF the provider returns a web search error object instead of a result list, THEN
  the system SHALL record that attempt as failed and SHALL NOT record it as an
  answer containing zero citations.

- **C8 - Parse mentions**: WHEN an answer is recorded successfully, the system
  SHALL determine for that answer which recognised brands occur, in what textual
  order, and SHALL persist the subject brand's position together with the total
  number of recognised brands found.

- **C9 - Aggregate on read**: The system SHALL compute mention rate, average
  position and competitor frequency from the stored answer rows at read time, and
  SHALL NOT store any aggregate as a persisted field.

- **C10 - Always show coverage**: WHEN the system displays any aggregate figure for
  a run, it SHALL display that run's coverage alongside it.
  IF a run's coverage is below 80 percent, THEN the system SHALL label the run
  unreliable instead of presenting its percentages as a measurement, and SHALL
  still keep the run visible.
  IF every attempt for one prompt failed, THEN the system SHALL display that prompt
  as "no data" and SHALL NOT display it as "not mentioned".

- **C11 - Comparability guard**: IF two runs of the same company differ in their
  prompt set hash or in their target list, THEN the system SHALL NOT present them
  as one series, and SHALL state that the measurement basis changed.

- **C12 - Cost visibility**: WHEN a run reaches a terminal status, the system SHALL
  display the total token usage and total cost of that run, derived from the
  per-answer figures.

- **C13 - Fail loudly on missing configuration**: IF a required environment
  variable is absent, THEN the application SHALL fail at startup with a message
  naming the missing variable, and SHALL NOT start in a degraded state.

- **C14 - Live verification gate**: WHEN `npm run verify` is executed, the system
  SHALL run typecheck, lint and tests, and SHALL then execute one real end-to-end
  run of one prompt against both targets at N=1 through the real queue, worker,
  adapters and parser.
  IF an API key is missing, if the run does not reach `completed`, if fewer than
  two successful answers were stored, if any stored answer has no citation, or if
  the parser produced no result, THEN the command SHALL exit non-zero.

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
- **Multiple languages or countries.**
- **White-label reporting, exports, dashboards, run-to-run comparison screens.**
- **Identity with the consumer products.** v1 measures the *APIs* of both
  providers with web search enabled. That approximates what a person sees in the
  ChatGPT or Claude apps; it is not the same thing. Those products run their own
  system prompt, their own retrieval and sometimes a different model version. The
  tool promises representativeness, not identity.

## Success = done when

`npm run verify` exits 0 on the deployed configuration, all fourteen capabilities
pass their EARS criteria, and one real run of a real brand with at least ten real
prompts has completed against both targets with coverage at or above 80 percent,
producing at least one citation per successful answer.

## Open questions - each line names its owner

- **[Owner: you]** Create an Anthropic Console account (console.anthropic.com) with
  prepaid credits and issue an API key. A Claude Max subscription does not grant
  API access. Blocks Phase 0.
- **[Owner: you]** Create an OpenAI platform account (platform.openai.com) with
  prepaid credits and issue an API key. A ChatGPT Plus subscription does not grant
  API access. Blocks Phase 0.
- **[Owner: you]** Create a Railway account and decide Hobby versus Pro. Three
  services (web, worker, Postgres) will not fit inside the Hobby credit; expect
  Hobby plus usage. Blocks the first deploy.
- **[Owner: you]** Supply the first real brand: name, aliases, competitor list and
  at least ten buying-moment prompts. Without this the Success criterion above
  cannot be met.
- **[Owner: Claude]** Confirm the exact per-search price of the web search tool at
  both providers in their consoles. The estimate used during the interview
  ($25-30 per thousand searches, as researched 2026-08-23) is from secondary
  sources and may be a material share of run cost.
- **[Owner: Claude]** Confirm the exact OpenAI model id string against the live
  models endpoint before it is written into a provider adapter.
- **[Owner: Claude]** Establish empirically, during `PLAN.md` Phase 9, whether N=3
  produces figures stable enough to be believed. Phase 0 runs one prompt at N=1 and
  cannot answer this. If two runs a day apart on an identical basis differ by more
  than one step of N, then N must rise, and this document and `ARCHITECTURE.md` are
  updated, before Phase 10 begins.

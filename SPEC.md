# SPEC - Large AI

## Objective

Large AI lets a business find out, with a reproducible number, how often and how
prominently its brand appears in the answers that large language models give to
the questions its buyers actually ask - and which sources those models cite when
they answer. v1 measures. It does not advise.

## Vision - where this goes

v1 is the ground floor of a larger building. This section describes the
building, so that no session has to guess.

**The end product.** A self-service platform where any business - any trade,
any city, any language - can establish how visible it is in the answers large
language models give to the questions its buyers actually ask, see why the
businesses that *are* named get named, and find out what is missing from its
own presence. The nearest analogue is a search-visibility suite such as
Semrush, built for language models instead of for search engines.

**Who pays, and for what.** The customer pays for the analyses they run. Every
measurement costs real money at the provider, so pricing follows usage rather
than a flat unlimited fee: a small free scan, then paid full analyses, then
tiers carrying a quota. Analyses are never run speculatively in the hope that a
customer turns up. That a paid run also enriches the shared dataset is a
by-product, never a reason to spend.

**The user changes; the instrument does not.** v1 has exactly one user - the
operator - and no accounts. That is a stage, not an endpoint. It exists so the
measurement can be proved correct before anyone else depends on it. Accounts,
quotas and payment turn this instrument into a product; they do not change what
it measures.

### What this has to be better at

The category is not empty. Semrush, Profound, Peec AI, ZipTie and others sell
LLM visibility tracking between roughly $69 and $499 per month, and
local-specific entrants such as Ayzeo already offer visibility tracking plus a
prioritised checklist for small businesses (as researched 2026-08-24; re-check,
don't trust). Being "for local businesses" is a segment choice, not a
difference.

They are converging on one shape: a visibility score, a competitor list, a
recommendations panel. They are also drawing one criticism - that they measure
prompts they invented rather than what people ask, that personalisation makes
their numbers irreproducible, that their methodology is undisclosed, and that
their trend lines are drawn through noise.

Three things separate this product, in increasing order of how long each takes
to copy.

**1. Criteria are harvested, not assumed.** When a model recommends a business
it frequently states its own selection criteria - price transparency, a
verifiable registration number, opening hours, review volume. Those criteria
differ per category: a plumber is judged on trust and price, a restaurant on
menu and reviews, a firm of solicitors on accreditation. A fixed checklist
cannot follow that; a harvested one reads it out of the answers already stored.

**2. Every figure is traceable, and the instrument says when it does not know.**
Each number links to the evidence beneath it: the actual answers, their raw
text, and every recognised name found in them with its position. Coverage and N
sit beside every
figure. A target below the coverage threshold is labelled unreliable instead of
being shown as a measurement. A run whose measurement basis changed says so
rather than extending a series. The prompt library is not a secret.
This is commercially uncomfortable and that is the point: a competitor who has
sold a confident single score cannot start qualifying it later.

**3. The causal dataset.** Measure, change something, measure again, on an
identical basis, across thousands of businesses. Nobody in this category can
yet say which interventions actually move a recommendation; they say "results
typically appear within 30-60 days" (as researched 2026-08-24; re-check, don't
trust) and offer no evidence. Immutable
hashed runs, retained raw text and per-answer cost make that evidence
collectible here. It cannot be bought, only accumulated.

### Why local service businesses first

Not because the product is only for them. Because they are the population in
which the third layer becomes provable fastest: their recommendation comes from
retrieval rather than from what the model already knows, so a change to their
own site can plausibly move it within weeks; they can change that site on a
Tuesday; and there are very many of them. A global soft-drink brand cannot run
that experiment. A plumber can.

### How to use this section

This section authorises no work. Its purpose is to make one question answerable
at any point in the build:

**Does this decision make a later layer impossible?**

A v1 choice that is merely inconvenient for a later layer is fine, and several
are deliberate. A v1 choice that forecloses one is a stop-and-ask under
`CLAUDE.md` -> Stop points. The existing hooks - the N-entry target list, the
adapter registry, the single foreign-key chain to Company, retained raw answer
text, immutable hashed runs - exist for exactly this reason and are not to be
removed as unused.

### What would falsify this

If the stability check in `PLAN.md` -> Phase 9 shows that results vary too much
to be believed at any workable N, then layer 3 cannot exist and this section
needs rewriting rather than extending. That check is therefore not a
presentation detail; it is the test of the thesis.

## Primary user

**v1 has exactly one user: the operator** (Johan). He onboards a client company,
agrees the buying-moment prompts with that client, starts a measurement run, and
reads the result back to the client. He is the only person who enters data.

That is a stage, not the endpoint. The single-operator shape exists so the
measurement can be proved correct before anyone else depends on it. Accounts,
quotas and payment are the first stage above it - `PLAN.md` -> Roadmap beyond v1
- and no v1 decision may make that stage impossible.

**The client** is a secondary reader. In v1 there are no accounts and no login:
the client is given the URL of a run and can read it. Anyone holding an
application URL can navigate to any company. This is a deliberate v1 limitation
with a named exit, not an oversight: `ARCHITECTURE.md` -> Key decisions states
the exposure plainly, and the accounts stage is what closes it.

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
- **Visible text** - the answer text with markdown link targets, image targets,
  fenced code blocks, URLs and email addresses removed. All brand matching happens
  on visible text only.
  A **URL** here means a token carrying a scheme (`http://`, `https://`) or a
  leading `www.`, whether it is a markdown target, a bare address in prose, an
  autolink in angle brackets, or a reference-link definition.
  A **bare domain** - `acme.nl`, with neither scheme nor `www.` - depends on where
  it stands, and the markdown already says which case it is. In running prose it is
  kept: "try acme.nl for pipes" is a model naming a business, and an operator may
  use a domain as an alias. As the visible text of a markdown link it is removed
  along with its target **only when it is that link's own address**, because that
  is not prose but the visible half of an attribution:
  `[acme.nl](https://www.acme.nl/prices)` yields a citation and no mention, while
  `[Acme](https://acme.nl)` still names the brand. Hosts are compared after any
  `www.` is stripped, and a label that is the registrable domain of a deeper target
  host still counts as that link's address, so a subdomain or a path does not
  defeat it.
  Where the label is address-shaped but is **not** the target's address, it is
  kept. `[Node.js](https://nodejs.org)` names a brand that happens to contain a dot
  and a TLD-shaped suffix; dropping it would be a parsing artifact rather than a
  measurement choice, and the two cases are told apart by information the parser
  already has.
  The accepted cost is therefore narrower than it first appears: a business whose
  brand genuinely **is** its domain - Booking.com, Werkspot.nl - and which appears
  only as a link to itself and nowhere in prose, is not counted. The expectation
  is that this is rare, because a model that recommends a business names it in
  prose and reserves link text for attribution. That is a belief, and `PLAN.md` ->
  Phase 9 measures it rather than arguing it. The direction of the error is
  deliberate: under-counting is what this product chose when it decided to label
  thin coverage unreliable rather than present it as a measurement, and inflating a
  headline number by reading citations as mentions is the criticism the category
  already attracts.
  *Widened 2026-08-25, and this is a change of measurement basis.* The definition
  previously named only the three markdown forms, which left four ways for a brand
  to be counted from inside an address: a bare URL, an autolink, a reference-link
  definition, and an email address. Answers from a web-searching model are full of
  addresses and a client's own domain contains its own name, so the subject brand
  was recorded as mentioned in answers that never named it, and every competitor
  position after it shifted. Visible text is a reduction made for matching, not a
  claim about what a reader sees - fenced code was already removed on the same
  grounds.
- **Position** - the rank of the brand's first occurrence in the visible text
  among all recognised brands in that one answer. It is ordering in the text, not
  the model's intended ranking.
- **Recognised brand** - the subject brand (via its aliases) or a competitor from
  the run's competitor snapshot. v1 does not discover unknown brands.
- **Cited domain** - the host of a stored citation's URL, lower-cased, with a
  leading `www.` removed. C7 guarantees every stored citation URL is absolute and
  http or https, so every stored citation has exactly one domain.
  A domain is counted **per answer**: an answer citing two pages of one site, or
  the same page twice, has drawn on that domain once. The unit of observation is
  the answer, never the citation row - see C16.
- **Measurement basis** - the ordered prompt texts, the ordered target list, the
  brand aliases, the competitor list of a run, and the **measurement semantics
  version**, hashed together as `basisHash`.
  The brand **name** is deliberately excluded: renaming a company does not change
  what was measured, while changing an alias does. N is excluded too - see C10.
  *The fifth input was added 2026-08-25.* The first four are what an operator can
  edit; the fifth is what the system means by a mention. Without it a parser change
  altered the meaning of every figure while the affected runs kept their hash and
  went on being presented as one series - the precise thing C11 exists to prevent.
  `basisHash` is computed once, when a run is queued, and stored; nothing
  recomputes it on read, so a version bump distinguishes future runs from past ones
  rather than rewriting the comparability of the past.

- **Measurement semantics log** - what each version of the measurement semantics
  means. `MEASUREMENT_SEMANTICS_VERSION` in `src/core/parse/semantics.ts` is
  otherwise an uninterpretable number: this table is what lets a reader say *why*
  two runs are not comparable when C11 says they are not. A version is bumped when
  a change can alter which brands are found, their positions, or the total
  recognised, for the same answer text - and not otherwise.

  | Version | Date | What changed | Why |
  |---|---|---|---|
  | 1 | before 2026-08-25 | Not stamped. Visible text removed markdown link targets, image targets and fenced code blocks, and nothing else. | The constant did not exist. Runs from this period carry a hash over four inputs and so differ from every later run by construction. |
  | 2 | 2026-08-25 | Visible text also removes URLs, autolinks, reference-link definitions and email addresses; and a markdown link whose visible text is itself a bare domain loses both halves. | Two changes, one bump, because both alter what counts as a mention. A brand inside an address was being counted, and a client's own domain contains its own name, so the subject was recorded as mentioned in answers that never named it and every position after it shifted. Link text that is a bare domain is an attribution rather than prose, and the markdown says which it is. |
  | 3 | 2026-08-25 | A domain-shaped link label is removed only when it is that link's **own address**, compared by host after stripping `www.` and allowing a deeper target host. An address-shaped label pointing elsewhere is kept. | Version 2 merged two error classes. `[acme.nl](https://acme.nl)` is an attribution and dropping it is a conservative measurement choice; `[Node.js](https://nodejs.org)` is a brand that merely contains a dot, and dropping it was a parsing artifact with no compensating benefit. Taken the same day as version 2 rather than after Phase 9's count, because each bump invalidates every series recorded under the version before it and production held one run. |

## Capabilities (v1) - each has an ID and an EARS criterion

- **C1 - Company registry**: WHEN the operator submits a company with a non-empty
  name, the system SHALL persist that company together with its brand aliases and
  its competitor names, and make it retrievable by id.
  WHEN the operator edits a company's name, aliases or competitors, the system
  SHALL persist the change and SHALL leave every existing run untouched.
  IF a company is submitted or edited with an empty name, THEN the system SHALL
  reject it with a validation error and persist nothing.
  Aliases and competitors are de-duplicated case-insensitively and **silently**,
  unlike the prompt list in C2, which reports every line it removes. That
  asymmetry is deliberate, not an oversight: aliases and competitors are a set, so
  a repeated alias changes no measurement and dropping it costs the operator
  nothing, whereas a duplicate prompt double-weights one question in that run's
  mention rate and therefore corrupts a figure. Report the removal where it
  changes a number; stay quiet where it cannot.

- **C2 - Prompt list**: WHEN the operator saves a prompt list for a company, the
  system SHALL persist each non-empty line as one ordered prompt belonging to that
  company, replacing the previous list in full.
  IF two or more submitted lines are identical after trimming, THEN the system
  SHALL persist the first and SHALL NOT persist the others, and SHALL report in
  its response how many lines were submitted, how many prompts were stored, and
  which specific lines were removed.
  De-duplication is on the **exact trimmed string**. It is never case-insensitive
  and never normalises internal whitespace, because two prompts differing in case
  or in spacing are two different prompts to a provider and therefore two
  different measurements. This differs deliberately from C1, which folds aliases
  case-insensitively.
  A duplicate prompt is removed rather than warned about because it is never
  something the operator wants: it double-weights one question in that run's
  mention rate, which is a corrupted measurement and not merely an expensive one,
  and a warning that can be dismissed still lets that measurement be produced and
  read back to a client. What is removed is reported line by line - the removal is
  never silent, and that is the half of this rule that matters.
  IF a prompt list contains more than 50 prompts, THEN the system SHALL display a
  warning stating the resulting call count **at the default N and the default
  target list**, naming both, and SHALL still allow the save. The prompt endpoint
  does not know the N or the targets of any future run, so the figure it shows is
  explicitly the default case and says so.
  The de-duplication report and this warning are independent: either may appear
  alone and both may appear together. The count the 50 is compared against is the
  number of prompts **stored**, since a prompt is a non-empty line and a removed
  duplicate is not a prompt.

- **C3 - Queue a run**: WHEN the operator starts a run for a company, the system
  SHALL create a run record with status `queued` carrying an immutable snapshot of
  the prompt texts, the target list, the brand name, the brand aliases and the
  competitor list, together with the chosen N and the `basisHash` computed over
  exactly four of those - the prompt texts, the targets, the aliases and the
  competitors - and SHALL return without waiting for the measurement to finish.
  IF the company has no prompts, THEN the system SHALL reject the request and
  create no run.
  IF any target in the request has no price on record, THEN the system SHALL
  reject the request and create no run, naming that target. A target the price
  table does not carry is one the system structurally cannot measure: its
  `costMicros` cannot be computed, and prices live only in
  `src/core/providers/pricing.ts`, so there is nowhere else a figure could
  legitimately come from. A run that cannot cost itself is not a measurement, and
  refusing it at queue time is the difference between one clear error and a run
  whose every attempt fails for a reason nobody can see beforehand.
  IF the company has more prompts than the configured maximum, THEN the system
  SHALL reject the request and create no run, naming the count, the maximum and
  the number of calls the run would have made. The maximum is a cost guardrail
  rather than a capability - the arithmetic is recorded beside it in
  `lib/defaults.ts` - and it is checked when a run is queued rather than when a
  list is saved, because C2 requires a long list to still save. Saving is free;
  running is what spends money.
  WHEN a run is created, the system SHALL state the number of provider calls it
  will make - prompts x targets x N - and SHALL state it **before** the operator
  commits to the run, not only afterwards. This is the point at which real money
  is spent, and unlike C2's warning the figure here is exact rather than a default
  case, because the N and the target list are known.

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
  The provider and the model id are **reached** through the answer's `RunTarget`,
  not stored as columns on the answer. "Carrying" above means the row identifies
  them unambiguously, never that it duplicates them: every row reaches its company
  through a single foreign-key chain, and denormalising two columns v1 never reads
  was considered and rejected in `ARCHITECTURE.md` -> Key decisions. A later reader
  must not satisfy this capability by adding those columns.

- **C6 - Retry transient failures**: IF a provider call fails with a rate limit, a
  timeout or a 5xx, THEN the system SHALL make at most three attempts in total -
  the initial call plus two retries - with exponential backoff between them,
  before recording it as failed. The number of attempts spent is stored on the
  answer row.

- **C7 - Extract citations**: WHEN a provider returns web search results, the
  system SHALL persist each cited source as a citation row carrying its URL and
  title, linked to the answer it came from, in the order the provider first
  reported it.
  A stored citation URL SHALL be absolute and SHALL use the http or https scheme;
  a cited source whose URL is neither SHALL NOT be stored.
  The citations of one answer SHALL be de-duplicated: two citations of the same
  URL, differing at most by a URL fragment, SHALL be stored once. A citation list
  must not repeat a source the model drew on once.
  "In the order the provider first reported it" means the order of **first**
  report, renumbered contiguously from zero **after** de-duplication: a collapsed
  duplicate does not hold a slot. Given citations A, B, A#fragment, C the stored
  orders are A=0, B=1, C=2. The provider's own indices are not preserved, because
  after a collapse they would no longer be contiguous and nothing reads them.
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
  markdown link targets, image targets, fenced code blocks, URLs and email
  addresses, as **Visible text** defines those; SHALL prefer the
  longest matching alias where aliases overlap; and SHALL resolve a name present in
  both the alias list and the competitor list in favour of the subject brand.
  There is no stemming and no suffix rule: a plural or possessive suffix that is
  itself alphanumeric breaks the boundary, so "Acmes" does not match the alias
  "Acme". An operator who wants such a form counted adds it to the alias list.
  IF a brand occurs only in a citation, a URL, an email address, or the visible
  text of a markdown link that is itself a bare domain, and not otherwise in the
  visible text, THEN it SHALL count as not mentioned. An address is where a brand
  lives, not a recommendation of it: "contact them at info@acme.nl" names the brand
  in the prose either way, and `https://acme.nl/prices` on its own does not.

- **C9 - Aggregate on read**: The system SHALL compute mention rate, average
  position, competitor frequency and cited domain frequency from the stored answer
  rows at read time, and SHALL NOT store any aggregate as a persisted field.

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

- **C16 - Cited domain frequency**: WHEN the system displays a run's result, it
  SHALL compute for each target, at read time from that target's **successful**
  answers, **in how many of those answers each cited domain appears**, and SHALL
  display those domains ordered by descending count - ties broken by domain
  ascending, so that the order of equal counts is reproducible - with that
  target's coverage and the run's N beside them, per C10.
  The count is a number of answers and never a number of citation rows: a domain
  cited three times in one answer counts once, because a model that footnotes one
  source repeatedly has drawn on it once. Counting rows would let a heavily
  footnoting model inflate its favourite source.
  The system SHALL derive this from the stored citation rows on every read and
  SHALL NOT persist it, or any part of it, as an aggregate column, per C9.
  IF an answer has status `failed`, THEN its citations SHALL contribute nothing to
  this figure, per C5 - a failed call is never "cited nothing".
  IF a target has no successful answers, THEN the system SHALL display "no data"
  for that target's domains and SHALL NOT display an empty list, which would read
  as "the model cited no sources".
  C16 counts domains; it deliberately does **not** mark which of them is the
  client's own site. That needs a website field on `Company` that the data model
  does not have - see "Explicitly NOT in scope" below.

- **C17 - Every figure is traceable to its evidence**: WHEN the system displays an
  aggregate figure for a target, it SHALL make the answers that figure was
  computed from reachable from where the figure is displayed, without the reader
  constructing a URL by hand.
  Each reachable answer SHALL carry its raw text, its citations in stored order,
  and every recognised name found in it with that name's 1-based position and the
  total number of recognised brands in that answer.
  IF an answer has status `failed`, THEN it SHALL be reachable alongside the
  successful ones carrying its failure reason, so that a cell reading "no data"
  can be explained rather than merely labelled.
  The system SHALL NOT display an aggregate figure whose underlying answers are
  unreachable.
  Every other capability constrains how a figure is computed; this one requires
  that a reader can check it. It is what stands behind Vision -> "What this has to
  be better at", point 2, and it is the reason the raw text is retained rather
  than only parsed.

- **C18 - The prompt library is not a secret**: WHEN the system displays a run's
  results, it SHALL display the text of every prompt in that run's snapshot,
  reachable from that page without the reader constructing a URL by hand.
  The prompts are the questions the figures answer. A mention rate computed from
  questions a reader cannot see is not checkable however much evidence sits under
  it, so this is the same obligation as C17 applied one level up: C17 makes a
  figure reachable to the answers beneath it, and this makes it reachable to the
  question above it. Vision -> "What this has to be better at", point 2 ends with
  the sentence this capability carries, and the criticism it answers is that this
  category measures prompts it invented and does not say which.
  It is the run's **snapshot** rather than the company's current list, because the
  snapshot is what was measured; C3 already freezes it and rule 10 keeps it frozen.
  *Added 2026-08-25, after Phase 7 shipped.* Every other promise in that Vision
  paragraph had a capability behind it - C17, C10, C10 again, C11 - and this one
  had none, so removing the display would have broken no criterion. It is satisfied
  by Phase 7's commit rather than by new work; see `PLAN.md` -> Phase 7.

## Run status

- `queued` - created, not yet claimed.
- `running` - claimed by a worker with a live heartbeat.
- `completed` - every attempt succeeded.
- `completed_with_errors` - some attempts failed, and at least one target is at or
  above the coverage threshold, so part of the run is presentable.
- `failed` - no target reached the coverage threshold, or the reclaim limit was
  exceeded. Nothing in this run may be presented as a measurement.

## Explicitly NOT in scope

Each entry states what is excluded, why, and the condition under which it returns.
"Returns" is a condition, never a date, and never a licence to start early.

- **The advice engine** ("use these words", "publish here").
  *Why:* it cannot be designed honestly before the measurement data exists, and
  advice invented ahead of evidence is precisely what this product exists to
  replace.
  *Returns:* when the causal dataset of Vision layer 3 exists. That means two
  things together, and this is the single statement of the condition that
  `PLAN.md` references rather than restates: every stage above it in `PLAN.md` ->
  Roadmap beyond v1 is running, **and** enough measure-change-measure cycles on
  identical bases have accumulated across many businesses to say which
  interventions actually moved a recommendation. Raw answer text is never deleted
  so that this stage inherits the whole history.

- **User accounts, login, and payments.** v1 has no authentication of any kind.
  *Why:* v1 has one user and no unattended sign-up, so an auth layer would be
  structure with nobody behind it, built before the measurement it protects is
  proved.
  *Returns:* the moment anyone other than the operator can reach the application
  without him. That is also the moment the exposure recorded in `ARCHITECTURE.md`
  -> Key decisions stops being acceptable. The single foreign-key chain to Company
  exists so this arrives as middleware plus policies, not as a migration.

- **More than two providers.** The schema and the adapter layer are built for N
  providers; the v1 configuration contains two.
  *Why:* two targets are enough to prove that nothing assumes a fixed number, and
  each additional target multiplies the cost of every run linearly.
  *Returns:* when a customer's buyers actually use a third assistant, or when
  Perplexity's citation data is wanted for its own sake. The target list, the
  provider enum and the adapter registry already take N entries.

- **Historical trend charts.** Runs are stored immutably and comparably, so the
  series exists - v1 simply does not draw it.
  *Why:* a trend line through two runs of a non-deterministic instrument is noise
  drawn confidently, which is the exact criticism the category has earned.
  *Returns:* when Phase 9's stability check has established an N at which
  run-to-run variation is smaller than the movement being drawn, and only across
  runs the comparability guard confirms share one `basisHash`.

- **Scheduled or automatic runs.** Every run is started by hand.
  *Why:* every run spends real money at the provider, and nothing may spend it
  speculatively.
  *Returns:* as product stage 3 in `PLAN.md` -> Roadmap beyond v1, which is where
  it was moved on 2026-08-25 from the unordered engineering items. It requires the
  quota stage first, because that is what makes an automatic run something a
  customer has already paid for. A cron then writes the same `queued` row the web
  layer writes; no new trigger mechanism is needed. It is on the product path
  rather than in the chore list because recurring re-measurement is what turns a
  one-off analysis into a subscription.

- **Discovery of unknown competitors.** v1 recognises only brands the operator
  entered.
  *Why:* the deterministic parser has to exist first, because it is the baseline
  an LLM judge is scored against; judge-first has nothing to check itself against.
  *Returns:* when there is enough stored answer text to score a judge against the
  parser. Raw answer text is retained so that pass reprocesses the entire history
  without new provider calls.

- **Deleting companies or runs.** Prompts are removed by saving a shorter list;
  companies and runs have no delete affordance.
  *Why:* the stored answers are the asset and cannot be regenerated without paying
  for the calls again, there is no authentication protecting a delete button, and
  a mistaken company costs one unused row.
  *Returns:* as `archivedAt`, with the accounts stage - hiding a row from a list
  without destroying answers. A hard delete does not return at all.

- **Steering the model.** No system prompt, no temperature or top_p, no length
  instruction. An instrument that influences its own reading is worse than no
  instrument, because its output looks better.
  *Why:* see the sentence above; it is the whole reason the product's numbers are
  worth anything.
  *Returns:* never. This is the one entry with no exit condition. A prompt that
  needs to change is a new measurement basis, which the `basisHash` already
  handles, not a setting to be added.

- **Multiple languages or countries.**
  *Why:* one language and one country is enough to prove the instrument, and each
  addition multiplies both the prompt library and the competitor sets that have to
  be curated by hand.
  *Returns:* with automatic prompt generation. A per-country, per-category prompt
  library is not something an operator writes by hand, so the generation stage is
  the precondition rather than a convenience.

- **White-label reporting, exports, dashboards, run-to-run comparison screens.**
  *Why:* each is a second presentation of figures that already exist, and none of
  them tests whether the figures are right, which is v1's only job.
  *Returns:* exports when a customer wants the numbers outside the app -
  everything they need is already derivable from stored rows. Comparison screens
  return on the same condition as trend charts.

- **Marking which cited domain belongs to the client.** C16 counts cited domains;
  it does not say which of them is the client's own site.
  *Why:* it needs a website field on `Company` that the data model does not have,
  and a data model change is a stop-and-ask under `CLAUDE.md` -> Stop points.
  *Returns:* with the presence-audit stage, which takes the customer's own site as
  an input anyway and therefore has to carry that field regardless.

- **Identity with the consumer products.** v1 measures the *APIs* of both
  providers with web search enabled. That approximates what a person sees in the
  ChatGPT or Claude apps; it is not the same thing. Those products run their own
  system prompt, their own retrieval and sometimes a different model version (as
  researched 2026-08-23; re-check, don't trust). The tool promises
  representativeness, not identity.
  *Why:* the consumer stacks are not exposed as an API, and imitating them by
  adding a system prompt would be steering the model.
  *Returns:* not as a feature. If a provider ever exposes its consumer stack
  through an API, that is one more entry in the target list, measured on the same
  terms as every other target.

The four entries below were added 2026-08-25. They were in neither the roadmap nor
this list, which made them undecided rather than deferred - recording them commits
us to nothing, and leaving them unrecorded would have lost the fact that they were
considered at all.

- **Alerting when a target stops naming a brand it previously named.** No
  notifications of any kind.
  *Why:* an alert asserts that something changed, and this system cannot yet tell a
  change from noise - establishing that is exactly what Phase 9's stability check
  is for. Alerting on run-to-run variation at an unproven N is the
  trend-line-through-noise criticism with a notification attached to it, and it is
  worse than the chart because it interrupts someone. It also has nothing to
  compare against until measurement repeats on a schedule.
  *Returns:* when scheduled re-measurement exists (`PLAN.md` product stage 3)
  **and** Phase 9's stability check has established an N at which run-to-run
  variation is smaller than the movement being alerted on - the same condition as
  trend charts, because it is the same claim made more urgently. C11 has to hold
  too: a brand "dropping out" across a changed measurement basis has not dropped
  out of anything.

- **More than one user per customer.** No teams, no roles, no per-seat
  permissions; the accounts stage is scoped to one login per customer.
  *Why:* v1 has no authentication at all, and the accounts stage is deliberately
  the smallest thing that lets someone other than the operator use the product.
  Roles are a second data model layered on one that does not exist yet, and a
  permission model designed before there is a customer to observe is a guess.
  *Returns:* after the accounts stage, when a customer actually needs it - which in
  this segment means a multi-branch business or an agency rather than a plumber.
  The single foreign-key chain to Company is the seam it would hang off, and it is
  already there.

- **A customer-facing API.** Runs are started and read through the application
  only.
  *Why:* an API is a published contract, and the shapes it would publish -
  coverage, mention rate, competitor frequency, cited domains - are still moving
  phase by phase. Publishing them now would freeze the least settled part of the
  measurement at the least settled moment. It also multiplies the surface the
  accounts stage has to authenticate, before that stage exists.
  *Returns:* when a customer has a use for the numbers outside the app that
  **exports do not serve**, and not before the figure shapes have stopped moving -
  the earliest honest point being after Phase 9 has re-verified every one of them
  against real output. Exports return earlier and on a weaker condition, because a
  file is not a contract.

- **Agency or reseller access.** One agency managing many client companies under
  one login, and white-labelled resale of the measurement.
  *Why:* it is the multi-tenant case one level above the accounts stage, and every
  part of it - seats, per-client quotas, branding, billing that rolls up - depends
  on accounts and quotas existing first. Designing a hierarchy over a
  single-operator instrument means designing it twice. The white-label half is
  already excluded above, on its own grounds.
  *Returns:* after the accounts and cost-reporting stages, **if** the segment turns
  out to buy this way. Local service businesses are reached through agencies more
  often than directly, so this is plausible rather than speculative - but that is a
  commercial finding to be made, not an engineering condition to be met, and
  nothing here authorises starting it.

## Success = done when

`npm run verify` exits 0 against the deployed configuration, all eighteen
capabilities pass their EARS criteria, and one real run of a real brand with at
least ten real prompts has completed with every target at coverage of 80 percent
or higher, producing at least one citation per successful answer.

## Open questions - each line names its owner

- ~~**[Owner: you]** Create an Anthropic Console account (console.anthropic.com)
  with prepaid credits and issue an API key.~~ **Resolved 2026-08-23.** A Claude
  Max subscription does not grant API access (as researched 2026-08-23; re-check,
  don't trust), which is why the account is a separate line.
- ~~**[Owner: you]** Create an OpenAI platform account (platform.openai.com) with
  prepaid credits and issue an API key.~~ **Resolved 2026-08-23.** A ChatGPT Plus
  subscription does not grant API access (as researched 2026-08-23; re-check,
  don't trust). The key alone was not enough - the first live gate run failed with
  `429 You have no credits remaining`.
- ~~**[Owner: you]** Create a Railway account and decide Hobby versus Pro.~~
  **Resolved 2026-08-23.** Three services (web, worker, Postgres) are not expected
  to fit inside the Hobby credit (as researched 2026-08-23; re-check, don't
  trust); expect Hobby plus usage.
- ~~**[Owner: you]** Create the GitHub repository and add both provider API keys
  as repository secrets.~~ **Resolved 2026-08-23.** `jve89/large`, private.
- **[Owner: Claude, before the dashboard phase]** Name and present the state this
  product now has but cannot describe: **cited but not named**. Since 2026-08-25 a
  brand inside a URL is not a mention, so an answer that cites `acme.nl` as a
  source while recommending someone else scores zero mentions and one citation.
  That is not a gap in the instrument, it is one of the more interesting things it
  can say - the model read your website and recommended a competitor anyway - and
  the pairing of C8 with C16 already holds the data for it. This line exists so
  that the phase presenting figures inherits the question rather than rediscovering
  it, and so nobody later reports a zero-mention-with-citations result as a parser
  bug and "fixes" it. Nothing is authorised by this line; see Vision -> "How to use
  this section". **Open.**
- ~~**[Owner: Claude, before Phase 9]** Decide how a reader tells apart two runs
  measured under different parser semantics.~~ **Resolved 2026-08-25.**
  `MEASUREMENT_SEMANTICS_VERSION` is the fifth input to `basisHash`, so C11 does
  the work unmodified and no schema change was needed - `basisHash` is already a
  `String` and nothing parses it. The legibility a column would have given is
  bought back by the Measurement semantics log in Definitions above; naming the
  version on the page is a display refinement the dashboard phase can add if it
  wants to say it there.
- ~~**[Owner: Claude, before Phase 9]** Give "the prompt library is not a secret"
  an owner.~~ **Resolved 2026-08-25 as C18.** Found by auditing Vision -> "What
  this has to be better at" -> point 2 against the capability list during Phase 7:
  every other promise in that paragraph had a capability behind it and this one had
  none, so removing the display would have broken no criterion. C18 gives it one,
  and the work already existed - Phase 7 renders each prompt's text in the
  per-prompt breakdown, so the capability is mapped onto that phase rather than
  given a new one. This was the third gap that check has found, after C16 and C17,
  which is why it is now run every phase against the Objective and the Vision
  rather than only across the documents.
- **[Owner: you]** Supply the first real brand: name, aliases, competitor list and
  at least ten buying-moment prompts. Without this the Success criterion above
  cannot be met. Blocks Phase 9. **Still open.**
- ~~**[Owner: Claude, Phase 0]** Confirm the exact per-token and per-search prices
  at both providers.~~ **Resolved in Phase 0.** Both providers charge **$10 per
  1,000 searches** (as researched 2026-08-23; re-check, don't trust) - the
  estimate used during the interview, $25-30 per thousand searches, was wrong and
  too high. The confirmed figures live in `src/core/providers/pricing.ts`, each
  row dated.
- ~~**[Owner: Claude, Phase 0]** Confirm the exact model id strings for **both**
  providers against their live models endpoints, and confirm the Anthropic web
  search tool version.~~ **Resolved in Phase 0**, recorded in `ARCHITECTURE.md` ->
  Measurement targets.
- ~~**[Owner: Claude]** Determine the `max_tokens` value that is high enough never
  to truncate an answer at either provider.~~ **Resolved in Phase 0: 128,000**,
  read from Anthropic's own models endpoint rather than from documentation, and
  recorded in `ARCHITECTURE.md`. A truncated answer can cut off a brand and would
  be counted as not mentioned.
- **[Owner: Claude]** Establish empirically, during `PLAN.md` Phase 9, whether N=3
  produces figures stable enough to be believed. Phase 0 runs one prompt at N=1 and
  cannot answer this. If two runs a day apart on an identical basis differ by more
  than one step of N, then N must rise, and this document and `ARCHITECTURE.md` are
  updated, before Phase 10 begins. **Still open**, and per Vision -> "What would
  falsify this" it is also the test of the product thesis, not only of a display
  detail.

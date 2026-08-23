# ARCHITECTURE - Large AI

## Shape

**Web app, with a measurement runner as a separate layer in the same repository.**

The web layers are: runtime, language, frontend, backend, database, ORM, auth,
host, test runner.

The runner is a data pipeline and carries its own three:

- **Source** - the Anthropic and OpenAI HTTP APIs, called with each provider's
  server-side web search tool enabled.
- **Sink** - PostgreSQL. Every attempt becomes a row, successful or not.
- **Trigger** - a database row. The web layer inserts a `Run` with status
  `queued`; the worker claims it. The web layer never calls the worker, and the
  worker never exposes a port.

**Thinnest slice (Phase 0):** one route inserts a queued run, the worker claims
it, makes one real call per provider with web search enabled, stores the raw
answers with their citations, the parser produces a mention result, and the run
page shows it. No fixture, no stub, no hard-coded answer anywhere in that path.

## Stack (pinned - do not substitute without asking)

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node, pinned by `.nvmrc` + `engines` | 22.23.1 |
| Language | TypeScript | 5.9.3 |
| Frontend | Next.js App Router + React | 16.3.2 / 19.2.8 |
| Styling | Tailwind CSS (CSS-first config, no JS config file) | 4.3.3 |
| Components | shadcn/ui | CLI-generated, vendored into the repo |
| Backend | Next.js Route Handlers - no separate API server | - |
| Database | PostgreSQL | 17 (local dev 17.6) |
| ORM | Prisma | 7.9.1 |
| Validation | zod | 4.4.3 |
| Auth | **none in v1** - `companyId` on every scoped row; middleware in v2 | - |
| Runner | separate Node process, same repo, same Prisma client | - |
| Provider SDK | `@anthropic-ai/sdk` / `openai` | 0.120.0 / 7.5.0 |
| Test runner | Vitest | 4.1.11 |
| Lint | ESLint, invoked directly (not via a framework wrapper) | 10.9.0 |
| CI | GitHub Actions - cheap gate per push, live gate on demand | - |
| Host | Railway - web service + worker service + Postgres, push-to-main | - |
| Package manager | npm | 10.9.8 |

### Measurement targets (v1 configuration - two entries in a list of N)

| Provider | Model id | Web search tool |
|---|---|---|
| Anthropic | `claude-sonnet-5` | `web_search_20260209` |
| OpenAI | `gpt-5.6-terra` | Responses API `web_search` |

The exact OpenAI model id string is confirmed against the live models endpoint
before it is written into the adapter - see the open question in `SPEC.md`.

### How a prompt is sent (this is a measurement decision, not a tuning knob)

The prompt text goes to the provider **unmodified**. No system prompt. No
`temperature`, `top_p` or any other sampling parameter. No length instruction. The
only parameter set beyond the tool declaration is `max_tokens`, and it exists
solely so that an answer is never truncated - a truncated answer can cut off a
brand that would then be counted as absent. The concrete value is determined in
Phase 0 and recorded here.

Steering the model would raise the measured numbers and make them meaningless. An
instrument that influences its own reading is worse than no instrument, because
its output looks better.

### Pinned environment (verified 2026-08-23 on the operator's machine)

macOS 26.6.2 arm64 - Node 22.23.1 (nvm present) - npm 10.9.8 - PostgreSQL 17.6
local - Docker 28.4.0 - git 2.50.1 - gh 2.95.0. Railway CLI and Vercel CLI are
not installed. bun 1.3.14 is present and is deliberately not used.

### Donor

`../complai` (Next.js + Prisma + Postgres + Tailwind, sibling directory) is the
donor for **patterns only** - Prisma setup, npm script chaining, the `CLAUDE.md`
shape, its `check:rls` script as a model for a schema guard. It is on Next 14,
Prisma 6 and Tailwind 3, so its code cannot be copied verbatim into this stack.
The `verify` script convention comes from `../drone-approval-support` and
`../lendav-hollandlane`, which already chain checks that way.

## File tree (complete)

```
large/
  package.json
  tsconfig.json
  next.config.ts
  postcss.config.mjs
  eslint.config.mjs
  vitest.config.ts
  components.json                    # shadcn/ui config
  .nvmrc
  .env.example
  .gitignore
  CLAUDE.md
  SPEC.md
  ARCHITECTURE.md
  PLAN.md
  .github/
    workflows/
      ci.yml                         # per push: typecheck, lint, test
      verify-live.yml                # workflow_dispatch: full verify
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    app/
      globals.css                    # Tailwind 4 CSS-first config lives here
      layout.tsx
      page.tsx                       # redirects to /companies
      companies/
        page.tsx                     # screen 1 - list + create
        [companyId]/
          page.tsx                   # screen 2 - prompts, runs, start button
      runs/
        [runId]/
          page.tsx                   # screen 3 - run detail
      api/
        companies/
          route.ts                   # GET list, POST create
          [companyId]/
            route.ts                 # GET one, PATCH update
            prompts/
              route.ts               # GET list, PUT replace whole list
        runs/
          route.ts                   # POST queue a run
          [runId]/
            route.ts                 # GET status + result (polled)
    components/
      ui/                            # shadcn/ui primitives, vendored
      company-form.tsx
      prompt-editor.tsx
      start-run-dialog.tsx
      run-progress.tsx               # polls every 2s until terminal
      coverage-badge.tsx             # coverage + N, per target
      answer-detail.tsx
      citation-list.tsx
    lib/
      db.ts                          # Prisma client singleton
      env.ts                         # zod schema - throws at startup
      aggregate.ts                   # derived figures, per target
      hash.ts                        # basisHash
      money.ts                       # integer micro-dollars, no floats
    core/
      providers/
        types.ts                     # ProviderAdapter interface
        anthropic.ts
        openai.ts
        index.ts                     # registry, configuration-driven
      parse/
        visible-text.ts              # strip link targets, images, code fences
        mentions.ts                  # alias match on visible text, position
        citations.ts                 # normalise + error-object detection
      run/
        plan.ts                      # which (prompt,target,repetition) remain
        execute.ts                   # per-provider semaphore, runs the plan
        retry.ts                     # exponential backoff, 3 attempts
    worker/
      index.ts                       # poll loop, heartbeat, graceful shutdown
      claim.ts                       # SELECT ... FOR UPDATE SKIP LOCKED
  scripts/
    verify-live.ts                   # the gate: one real end-to-end run
  tests/
    parse/
      visible-text.test.ts
      mentions.test.ts
      citations.test.ts
    aggregate.test.ts
    hash.test.ts
    worker/
      claim.test.ts                  # two claimers, exactly one winner
      resume.test.ts                 # stale run resumes, does not restart
    fixtures/                        # real stored provider responses
```

## Data model

All ids are `uuid` primary keys. All timestamps are `timestamptz`. Money is
stored as integer **micro-dollars** (`costMicros`); floating point currency is
never used anywhere in this codebase.

### Company

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| name | text | NOT NULL |
| aliases | text[] | NOT NULL, default `{}` |
| competitors | text[] | NOT NULL, default `{}` |
| createdAt | timestamptz | NOT NULL |
| updatedAt | timestamptz | NOT NULL |

An empty `competitors` array is valid; the run then measures presence and a
position of 1 of 1. Companies are never deleted through the application.

### Prompt

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| companyId | uuid | FK Company, ON DELETE CASCADE |
| text | text | NOT NULL |
| order | int | NOT NULL, UNIQUE (companyId, order) |

The list is replaced wholesale on save. Deleting a Prompt is safe because a run
references `RunPrompt`, a copy, and never this row.

### Run

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| companyId | uuid | FK Company |
| status | RunStatus | NOT NULL, default `queued` |
| repetitions | int | NOT NULL, default 3, CHECK >= 1 |
| brandName | text | NOT NULL - snapshot |
| brandAliases | text[] | NOT NULL - snapshot |
| brandCompetitors | text[] | NOT NULL - snapshot |
| basisHash | text | NOT NULL - see below |
| heartbeatAt | timestamptz | NULL - refreshed by the executing worker |
| reclaimCount | int | NOT NULL, default 0 |
| claimedAt | timestamptz | NULL |
| startedAt | timestamptz | NULL |
| finishedAt | timestamptz | NULL |
| failureReason | text | NULL |
| createdAt | timestamptz | NOT NULL |

`RunStatus` = `queued` | `running` | `completed` | `completed_with_errors` |
`failed`. Semantics are defined in `SPEC.md` -> Run status; in particular `failed`
means *no target reached the coverage threshold*, not *something went wrong*.

`basisHash` = sha256 over the ordered `RunPrompt` texts, the ordered
`(provider, modelId)` target list, the normalised `brandAliases` and the
normalised `brandCompetitors`. N is deliberately excluded: two runs at different N
ask the same question of the same models about the same brand, and N is displayed
next to every figure instead.

Index on `(status, heartbeatAt)` - this is the worker's claim query, which matches
`queued` rows and `running` rows whose heartbeat has gone stale.

A Run **is** the job row. There is no separate queue table.

Coverage, mention rate, average position and total cost are **not columns**. They
are computed from Answer rows at read time (SPEC C9).

### RunTarget

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| runId | uuid | FK Run, ON DELETE CASCADE |
| provider | Provider | NOT NULL |
| modelId | text | NOT NULL, UNIQUE (runId, provider, modelId) |

`Provider` = `anthropic` | `openai`. The enum grows by one value per new
provider; no other schema change is needed.

### RunPrompt

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| runId | uuid | FK Run, ON DELETE CASCADE |
| text | text | NOT NULL - immutable copy taken at queue time |
| order | int | NOT NULL, UNIQUE (runId, order) |

### Answer

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| runId | uuid | FK Run, ON DELETE CASCADE - denormalised for indexing |
| runPromptId | uuid | FK RunPrompt |
| runTargetId | uuid | FK RunTarget |
| repetition | int | NOT NULL, UNIQUE (runPromptId, runTargetId, repetition) |
| status | AnswerStatus | NOT NULL |
| rawText | text | NULL - present when status is `ok` |
| failureReason | text | NULL - present when status is `failed` |
| httpAttempts | int | NOT NULL, default 1 - how many tries were spent |
| inputTokens | int | NULL |
| outputTokens | int | NULL |
| searchCount | int | NULL - web searches performed by the tool |
| costMicros | bigint | NULL |
| latencyMs | int | NULL |
| createdAt | timestamptz | NOT NULL |

`AnswerStatus` = `ok` | `failed`. A `failed` row is never counted as an answer in
which the brand was absent (SPEC C5).

The unique constraint on `(runPromptId, runTargetId, repetition)` is what makes
resumption safe: a reclaimed run computes the missing combinations and inserts
only those, and a duplicate insert is rejected by the database rather than paid
for twice.

### Citation

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| answerId | uuid | FK Answer, ON DELETE CASCADE |
| url | text | NOT NULL |
| title | text | NULL |
| order | int | NOT NULL |

### Mention

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| answerId | uuid | FK Answer, ON DELETE CASCADE |
| brand | text | NOT NULL, UNIQUE (answerId, brand) |
| isSubject | boolean | NOT NULL - true for the measured brand |
| position | int | NOT NULL - 1-based rank of first occurrence |
| totalRecognised | int | NOT NULL - recognised brands in that answer |

Relations: Company 1-* Prompt · Company 1-* Run · Run 1-* RunTarget · Run 1-*
RunPrompt · Run 1-* Answer · Answer 1-* Citation · Answer 1-* Mention.

## Interfaces

### ProviderAdapter (`src/core/providers/types.ts`)

The only contract the runner knows. One file per provider; the registry is
configuration-driven, so a third provider is a new file and a list entry.

```ts
type ProviderResult =
  | { ok: true
      text: string
      citations: { url: string; title: string | null }[]
      usage: { inputTokens: number; outputTokens: number; searchCount: number }
      costMicros: bigint
      latencyMs: number }
  | { ok: false; reason: string; retryable: boolean }

interface ProviderAdapter {
  readonly provider: 'anthropic' | 'openai'
  readonly modelId: string
  ask(prompt: string, signal: AbortSignal): Promise<ProviderResult>
}
```

An adapter returns `ok: false` - it does not throw - when the provider replies
with a web search **error object** rather than a result list. Both providers
return that as HTTP 200, so an adapter that only catches exceptions would record
it as a successful answer with zero citations (SPEC C7).

### Matching (`src/core/parse/`)

`visible-text.ts` reduces raw answer text to what a reader sees: markdown link
targets and image targets are removed while their label text is kept, and fenced
code blocks are dropped. Every alias and competitor match in `mentions.ts` runs
against that reduced text and never against the raw string. The full matching rule
set is normative in `SPEC.md` C8.

### API contracts

```
GET    /api/companies
  res: { companies: { id, name, aliases, competitors, runCount }[] }

POST   /api/companies
  req: { name: string, aliases: string[], competitors: string[] }
  res: { id }
  errs: 400 name empty or payload fails schema

GET    /api/companies/:companyId
  res: { company, prompts, runs }
  errs: 404 unknown company

PATCH  /api/companies/:companyId
  req: { name?, aliases?, competitors? }
  res: { company }
  errs: 400 schema, 404 unknown company

PUT    /api/companies/:companyId/prompts
  req: { prompts: string[] }          # whole list replaced, order = index
  res: { count, warning?: string }    # warning when count > 50
  errs: 400 schema, 404 unknown company

POST   /api/runs
  req: { companyId, repetitions, targets: { provider, modelId }[] }
  res: { runId, status: 'queued' }
  errs: 400 schema or empty prompt list, 404 unknown company

GET    /api/runs/:runId
  res: { run,                          # incl. status, N, basisHash, snapshot
         targets,
         progress: { done, total },    # total = prompts x targets x N
         perTarget: [ { provider, modelId, coverage, reliable,
                        mentionRate, averagePosition, competitors } ],
         totals: { inputTokens, outputTokens, searchCount, costMicros },
         prompts: [ { text, cells: [ { target, state, answers } ] } ] }
        # every figure computed at read time; `state` is one of
        # 'ok' | 'no-data'; 'no-data' is never rendered as zero
  errs: 404 unknown run
```

Screen 3 polls `GET /api/runs/:runId` every 2 seconds while `run.status` is
`queued` or `running`, and stops polling once it is terminal.

## Deployment

Host: **Railway** - ships via push-to-main. Runtime pinned by `.nvmrc` and by
`engines` in `package.json`.

Three services, one repository:

| Service | Start command | Public |
|---|---|---|
| web | `next start` | yes |
| worker | `node --enable-source-maps dist/worker/index.js` | no |
| postgres | Railway Postgres plugin | no |

Railway containers have **no execution time limit** - a process runs until it
finishes, fails, or is stopped (as researched 2026-08-23; re-check, don't trust).
That property is the reason this project is not on a serverless host: a run of
120 calls takes minutes.

| Env var | Required | Guarded by |
|---|---|---|
| DATABASE_URL | yes | `lib/env.ts` zod schema, throws at startup |
| ANTHROPIC_API_KEY | yes | `lib/env.ts` + `scripts/verify-live.ts` |
| OPENAI_API_KEY | yes | `lib/env.ts` + `scripts/verify-live.ts` |
| PROVIDER_CONCURRENCY | no (default 4) | zod default, CHECK 1..16 |
| COVERAGE_THRESHOLD | no (default 0.8) | zod default, CHECK 0..1 |
| WORKER_POLL_MS | no (default 2000) | zod default |
| STALE_RUN_SECONDS | no (default 120) | zod default |
| MAX_RECLAIMS | no (default 3) | zod default |
| NODE_ENV | yes | zod enum |

`PROVIDER_CONCURRENCY` is **per provider, per worker process** - a separate
semaphore for each provider, because rate limits are charged per provider. With
two providers and one worker that is at most eight calls in flight. Known
limitation: with W workers the effective limit becomes W x 4, since each process
counts only itself. A shared limiter is a v2 item and is listed in `PLAN.md` ->
Deferred.

Secrets never enter the repository. `.env.example` lists every variable with an
empty value and a one-line comment.

**Dashboard settings that live outside the repo and silently change what users
get** - enumerate and check these when a deploy behaves unexpectedly:

- the start command per service (they differ; they are not in `package.json`)
- which service is publicly exposed (web only - the worker must have no domain)
- the Postgres plugin's injected `DATABASE_URL` and its connection limit
- health check path and restart policy per service
- the plan (Hobby vs Pro) and any per-service resource caps
- the API keys, set per service - the worker needs both; web needs neither

### CI

- `.github/workflows/ci.yml` runs on every push: `npm run typecheck`,
  `npm run lint`, `npm run test`, with a PostgreSQL service container. It needs no
  provider secrets and costs nothing per run.
- `.github/workflows/verify-live.yml` runs on `workflow_dispatch` only: the full
  `npm run verify`, including `verify:live`, against repository secrets. It spends
  two real provider calls each time it is invoked, so it is never automatic.

**External-fact convention:** every claim about a third-party service in this pack
carries a date - "as researched YYYY-MM-DD; re-check, don't trust." Pricing, free
tiers and limits rot.

**Cost of one run** - 20 prompts, 2 targets, N=3 gives 120 calls. Token cost at
the pinned targets is roughly $5-8 per run. Web search is billed **separately per
search** and may be a comparable amount again; that figure is an open question in
`SPEC.md` and is not pinned here.

**Remote:** GitHub, created and pushed when Phase 0 first deploys.

## Key decisions & trade-offs

- **N repetitions per (prompt, target), default 3, configurable per run.** LLM
  answers are non-deterministic; a single attempt is a sample of one. Cost: a run
  is three times the price of a naive implementation. Rejected: n=1 (produces
  anecdotes presented as measurements) and deferring repetition to v2 (pays every
  structural cost of N without the benefit).

- **The prompt is sent unmodified.** No system prompt, no sampling parameters, no
  length instruction. Cost: answers are longer, less structured and more expensive
  to parse. Benefit: the instrument does not influence its own reading.

- **Deterministic alias matching, not an LLM judge.** Reproducible to the
  character, free, and testable against stored fixtures without an API key. Cost:
  v1 cannot discover competitors the operator did not name. Mitigated by storing
  raw answer text, so a v2 judge reprocesses history with zero new provider calls.
  Rejected: judge-first, which has no deterministic baseline to check against.

- **Matching happens on visible text, not raw text.** A brand appearing only in a
  markdown link target or a citation is not a mention. Cost: one more parsing
  stage. Without it, position shifts whenever a model links its sources, and a
  brand mentioned only as a URL counts as recommended.

- **Position means textual order, not intended ranking.** Cheap and unambiguous.
  Cost: a model that says "X is popular, but I recommend Y" scores X ahead of Y.
  Documented in `SPEC.md` -> Definitions so no later session re-invents it.

- **Web search enabled on both providers.** Citations only exist if the model
  actually retrieves. Cost: slower and materially more expensive per call. Without
  it the citation data would be prose the model may have invented, and the gate
  would go green on fiction.

- **The trigger is a database row, not an HTTP call.** The web layer inserts and
  returns; the worker claims with `SELECT ... FOR UPDATE SKIP LOCKED`. Cost: the
  worker polls. Benefits: a run survives a worker restart, scaling to a worker
  pool is a replica-count change, an external cron in v2 writes the same row, and
  the web request never waits minutes.

- **Stalled runs are resumed, not restarted.** A heartbeat plus the unique
  constraint on (prompt, target, repetition) means a crash at 80 percent costs the
  remaining 20 percent, not another whole run. A reclaim counter stops a run that
  reliably crashes the process from burning money in a loop. Cost: two columns and
  two settings.

- **Aggregates are derived, never stored.** A better parser can be applied to the
  entire history by recomputing. Cost: the run page does more work per request,
  which is irrelevant at this data volume.

- **Coverage is per target, and travels with every figure alongside N.** A run
  where one provider degraded still yields a valid measurement from the other; a
  run-wide coverage number would discard it. A failed call and "not mentioned"
  must never collapse into the same number - it is the one error in this product
  that is invisible after the fact.

- **A run is self-describing, and one `basisHash` covers the whole basis.** It
  stores copies of its prompts, its targets and its brand definition. A differing
  hash breaks the series rather than extending it. Cost: the snapshot is duplicated
  per run - trivial. Benefit: adding an alias cannot silently inflate a trend.

- **`companyId` on every scoped row, with no auth in v1.** Adding authentication
  in v2 is a middleware layer plus row-level security, not a migration through
  every endpoint. Cost: a v1 discipline with no v1 payoff.

- **Nothing assumes two providers.** Targets are a list; the enum grows by one
  value. v1 configures two because `SPEC.md` scopes it to two, not because the
  code cannot hold more. Cost of more: strictly linear in run time and price.

- **Token usage, search counts and cost captured per answer.** This data is present
  in the provider response and is unrecoverable afterwards. It is what makes
  per-customer margin computable once the product is priced.

- **No delete affordance.** Stored answers are the asset and cannot be regenerated
  without paying again, and v1 has no authentication protecting a delete button.
  Cost: an unwanted company stays in the list. `archivedAt` is a v2 item.

- **Progress by polling, not by websockets or SSE.** A run takes minutes, so a
  two-second delay is invisible, and polling reuses the endpoint that already
  exists. Cost: a handful of cheap requests per minute while a run is active.

- **CI runs the cheap gate per push and the live gate on demand.** The expensive
  half needs both API keys and spends real money; making it automatic would tax
  every commit. Cost: a push can break the live path without CI noticing, which is
  why `npm run verify` is a per-phase obligation in `CLAUDE.md`.

- **TypeScript 5.9.3, not 7.0.2.** TypeScript 7 is the current `latest` and is the
  native compiler rewrite. It is faster and offers this project nothing else,
  while the surrounding tool ecosystem is younger on it. Cost: slower builds.
  Revisit as a version bump once Phase 0 is green - it is not a rewrite.

- **Prisma 7, though the donor is on Prisma 6.** New project, no migration debt.
  Cost: donor snippets need adapting rather than copying.

- **One `package.json`, two start commands - no workspaces.** Railway runs both
  services from the same repo with different commands, and web and worker share
  one Prisma client and one set of types, so a renamed column breaks both
  compilations at once instead of one silently. Revisit at the third deployable.

- **Everything on Railway; the existing Vercel account is not used.** Splitting web
  onto Vercel would buy edge caching and static generation, none of which a
  logged-out tool with dynamic data uses, and would cost two dashboards, two
  pipelines, two sets of variables, and a database reached across the internet
  instead of inside one network.

- **Money as integer micro-dollars.** Floating point currency accumulates error
  across 120 rows per run and is never correct at the point someone is invoiced.

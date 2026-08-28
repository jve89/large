# SHIP - Phase 10

Written 2026-08-28, at the close of Phase 10.

## 1. What Phase 10 asked for

`PLAN.md` -> Phase 10 is a **checklist phase, not a build phase**. It delivers
`SPEC.md`'s "Success = done when", and it is done when:

1. `npm run verify` exits 0 against the deployed configuration;
2. all nineteen capabilities pass their EARS criteria;
3. the real-brand run from Phase 9 is reachable at the deployed URL;
4. every environment variable is set on every service that needs it;
5. both provider integrations have been exercised live end to end;
6. the "Blocked on the operator" list is empty.

## 2. The checklist, walked

| # | Item | Verdict |
|---|---|---|
| 1 | `npm run verify` exits 0 | **PASS.** Run `a57df6ad`, 2026-08-28: typecheck, lint, 455 tests, then one real end-to-end run through the real queue, worker, adapters and parser. anthropic 10 citations / 3 mentions / 2 searches; openai 6 / 4 / 2. $0.15 |
| 2 | Nineteen capabilities pass their EARS criteria | **PASS.** C1-C19 all present in `SPEC.md` and all covered by the suite; C10, C11, C12, C16, C17 additionally re-verified against real client output in Phase 9 |
| 3 | The real-brand run is reachable at the deployed URL | **PASS.** Seven runs across three companies, all reachable, all rendering under aggregation rules v2 |
| 4 | Every environment variable set on every service | **PASS, and role-correctly.** `worker` carries `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, `NODE_ENV`; `web` carries `DATABASE_URL` and `NODE_ENV` and **deliberately no provider keys** - C13's role-aware validation, and the thing that would otherwise crash-loop the web service |
| 5 | Both providers exercised live end to end | **PASS, heavily.** 354 successful provider calls in Phase 9 plus the gate's two, across `claude-sonnet-5` and `gpt-5.6-terra` |
| 6 | "Blocked on the operator" empty | **PASS.** All five entries struck through; the last, a real brand with ten prompts, closed 2026-08-26 |

**Not required by `SPEC.md`, and therefore not blocking:** a custom domain. The
system is served from `web-production-15ff2.up.railway.app` with Railway's own
TLS. No DNS work has been done and none is specified. If a customer-facing domain
is wanted it is an operator task and a five-minute one, not a phase.

## 3. What a person can and cannot do with this, on the day it ships

**The honest sentence: this is a correct instrument, not a product.**

What a person can do: **one operator, on one URL, with no account and no password,
can type a company name, its aliases, its competitors and its website; paste a
list of prompts written by hand; press a button that says exactly how many
provider calls it will make and refuses if that is too many; and read a page that
says how often two named models named that business, in what position among the
competitors it was told about, which sources they drew on, what it cost, and -
where it does not know - that it does not know. Every figure on that page reaches
the answers it came from in one click, and the raw text of every answer is kept.**

What a person **cannot** do, and none of it is an oversight:

- **Sign in.** There are no accounts, no passwords and no permissions. Anyone with
  the URL can see and start runs, which is why the URL is not published.
- **Pay.** There is no billing, no plan, no invoice. Provider costs land on the
  operator's own two API keys.
- **Be told what to do about the result.** The instrument measures. It does not
  advise, and the advice engine is deliberately out of v1 scope.
- **Schedule anything.** Every run is started by hand. Nothing recurs.
- **See a trend.** Two runs on one basis are comparable and the page says so, but
  there is no chart, no history view and no alerting.
- **Export.** No CSV, no PDF, no API key for anyone else. A screenshot is the
  artefact.
- **Delete.** There is no delete button anywhere, on purpose: raw answer text is
  the substrate for everything v2 does and cannot be regenerated without paying
  for the calls again.
- **Have the prompts written for them.** The prompt list is the operator's
  judgement, typed by hand, and the quality of the measurement depends on it.
- **Be measured under a name the models confuse with somebody else's**, unless the
  operator lists the colliding names as competitors. See `SPEC.md` ->
  Definitions -> Name collision; Phase 9 measured a 71 percent false-positive rate
  on such a client before the remedy.

**Who it is for today:** the operator, running scans by hand for businesses he
has chosen, reading the results himself. Everything a customer would touch -
accounts, payment, scheduling, advice, export - is a later stage and is named as
such in the roadmap.

## 4. The register, in its final form

**Every behaviour this instrument has only ever performed against rows we wrote
ourselves.** Counts are from stored data on 2026-08-28: seven Phase 9 runs, **354
successful answers, 0 failed**, plus the gate runs.

This list exists because differentiator 2 - *the instrument says when it does not
know* - obliges the same honesty about itself. A gate that asserts health cannot
exercise the code that handles unhealth, so the paths below are proved against
fixtures and not against reality.

### 4.1 Closed by Phase 9 - reality has now produced these

| Clause | What produced it |
|---|---|
| **A successful answer carrying no citations** (C16's "cited nothing") | **11 of 354**, all anthropic, on questions answered from parametric knowledge - the Mercedes warranty question four times, the student-laptop question three. The predicted cause was right down to the mechanism |
| **Average position `not-applicable`** - measured, and named nowhere | The reduced-basis Blom run: 30 of 30 successful, mention rate a measured 0 percent, position not applicable, nothing unreliable, a full cited-domain list |
| **C11 firing at all** - two runs of one company differing in basis | The same run. Four runs, two bases, drawn as two series with the change stated in plain language |
| **The same host cited with and without `www.`** | **6 hosts**: `bmrtiel.nl`, `garageverhagen.nl`, `politiekeurmerk.nl`, `serviceproducts.mercedes-benz.nl`, `slotenspecialistfedi.nl`, `willemcornelissen.nl`. All grouped correctly as one domain each |
| **Two pages of one site inside one answer** | **87 of 354 answers**, up from the 12 recorded in Phase 7 |

### 4.2 Still never produced by reality

| Clause | Count in real data | Why no gate can produce it | What would |
|---|---|---|---|
| **A provider web-search error object** - HTTP 200 carrying an error instead of results (rule 8) | **Never.** 7 of 9 fixtures remain `documented`, not `observed` | It needs a provider's search subsystem to fail while the request succeeds. `verify:live` asserts the call succeeded | A real occurrence in production. `logFailureEvidence` writes the raw body of every response-shaped failure to the worker log for exactly this |
| **Coverage strictly between 0 and the threshold** - a partially degraded target (C10) | **Never.** All 14 Phase 9 target-runs at **100 percent**; only 0 and 100 have ever been seen | A bad credential fails everything, a healthy run fails nothing | A real rate limit or transient 5xx mid-run |
| **The retry path** - more than one HTTP attempt (C6) | **Never. `1 HTTP attempt` on all 354 answers**, and 0 answers have `httpAttempts` > 1 in the whole dataset | Nothing in the gate provokes a 408, 429 or 5xx | Concurrency against a provider limit |
| **A reclaim and resume** (C15) | **Never.** No run has been interrupted; Phase 9 deliberately deployed only between runs | No worker has died mid-run in production | A deploy during a long run |
| **`failed` as a terminal status** | **Never.** 7 of 7 Phase 9 runs `completed`; still 0 `failed` ever | Neither cause can be produced by a healthy gate | The rate-limit case above, or four interrupting deploys |
| **"Cited but not named"** - the client's own domain cited in an answer that named somebody else | **Never, and now measured rather than assumed: 0 in all 354 answers.** Every answer citing a client's own domain also named them in prose | Phase 9 was the first realistic chance and it did not happen | More answers, or a client whose site is cited as a directory entry rather than as a recommendation |
| **A series interrupted and resumed** - basis A, then B, then A again | **Never.** Phase 9 produced A×3 then B×1, which is two series and not three | It needs three runs across two bases in that order | An operator changing something and changing it back |
| **The long-context price tier** - over 272,000 input tokens at openai | **Never.** The largest Phase 9 average was ~21,000 input tokens per call | Nothing in v1's shape approaches it | Not v1 |
| **C3's prompt-maximum and C19's planned-call refusals** | **Never triggered by a real request.** The lowered Phase 9 ceiling of 100 was never hit either - the largest run planned 60 | Both refuse before a run exists | An operator pasting a long list, which is what they are for |

### 4.3 What this list is for

Five rows closed in one phase, and nine remain. **Nine of the fourteen behaviours
this instrument implements and tests have still never been performed by a real
provider**, and every one of them is a failure path. The honest reading is that
this system is well proved on the happy path against real data and proved only
against its own fixtures everywhere else.

That is not a reason to withhold it. It is the reason this list is published with
it.

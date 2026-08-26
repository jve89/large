# PHASE 9 - Presentation pass against a real brand

**This document is written before any Phase 9 run is queued, and is committed
before any Phase 9 run is queued.** That ordering is the whole point of it. Every
prediction below is checkable against the sha this file lands on; a prediction
that can be edited after the results arrive is not a prediction, it is a
description.

Nothing in this file authorises work. `PLAN.md` -> Phase 9 is the criterion and
`SPEC.md` is what a decision is checked against. This is the record of what was
configured, what was expected, and what it was expected to cost.

Written 2026-08-26.

---

## 1. What this phase measures, and why these three brands

`PLAN.md` -> Phase 9 asks for three brands in one pass, because three cases occur
in practice and only one of them has ever been on screen:

1. **A brand the models name readily** - the healthy render. Coolblue, already
   measured. Nothing new to collect.
2. **A brand that is genuinely absent** - the screen almost every first customer
   sees. Autobedrijf Blom. It must render as a **measurement of zero**, not as a
   degraded run: coverage 100 percent, every figure valid, mention rate a measured
   0 percent, average position `not-applicable` and never "no data", a full
   cited-domain list, nothing labelled unreliable.
3. **A brand whose name is an ordinary word** - the mirror image of the address
   defect fixed on 2026-08-25. Slotenmaker Nieuwegein is the extreme case: its
   name is its **trade plus its city**, both of which appear in any answer about
   locksmiths in Nieuwegein whether or not this business is being named.

The register in `PLAN.md` - "behaviour reality has never produced" - lists three
rows that this pass is the first realistic chance to close: average position
`not-applicable`, "cited but not named", and C11 firing on a real basis change.

---

## 2. Brand 1 - Autobedrijf Blom

| Field | Value |
|---|---|
| Name | Autobedrijf Blom |
| Website | autoblom.nl |

**Aliases**

    Autobedrijf Blom
    Autogarage Blom
    Garage Blom
    Auto Blom
    Blom Occasions
    autoblom.nl

**Bare "Blom" is deliberately not an alias.** It is a common Dutch surname, and as
an alias it would match text that says nothing about this business - a different
Blom, a person, a street. That is the ordinary-word failure this phase exists to
measure, and there is no reason to walk into it on the brand where we already know
better. The cost is accepted and stated: an answer that writes only "Blom" is a
false negative here.

`autoblom.nl` is kept as an alias because a bare domain standing in running prose
is counted (SPEC -> Definitions -> Visible text), and a model writing "try
autoblom.nl" is naming the business.

**Competitors**

    Vakgarage Van der Klij
    Vermeer Automotive
    Mike's Car Service
    Van Ooijen Automotive
    Autobedrijf De Linge
    Profile Car & Tire Service Geldermalsen
    Autobedrijf Ruud den Hartog
    Autobedrijf Koos Pellegrom
    Autobedrijf Rivierenland

Two entries carry a decision:

- **`Mike's Car Service` is listed once, with the straight apostrophe.** The
  operator's instruction said "both apostrophe forms until the fix lands". The fix
  landed first (section 6 below), so the two forms are now the same string for
  matching purposes and listing both would be de-duplicated to one candidate.
- **`Autobedrijf De Linge`, never `De Linge` alone.** De Linge is a river. Bare
  "De Linge" would match every answer that mentions the geography rather than the
  garage.

**Prompts** - ten, in Dutch, buying-moment.

    1.  Ik zoek een goede autogarage in de buurt van Enspijk. Welke kun je aanraden?
    2.  Wat is een goede en niet te dure garage in Geldermalsen?
    3.  Welke garages in de Betuwe zijn goed voor het onderhoud van mijn auto?
    4.  Er zit geen garage in mijn dorp. Waar kan ik het beste heen voor onderhoud als ik in Deil woon?
    5.  Ik heb pech gehad op de A2 bij Geldermalsen en mijn auto moet nagekeken worden. Welke garage in de buurt kan dat doen?
    6.  Mijn auto start niet meer en ik sta in Rumpt. Welke garage in de buurt kan me vandaag helpen?
    7.  Waar kan ik in de omgeving van Geldermalsen mijn auto laten APK-keuren?
    8.  Ik heb een Audi en zoek een garage in de Betuwe die geen dealer is maar wel verstand heeft van Audi.
    9.  Kan ik met mijn Mercedes ook naar een gewone garage in de buurt van Geldermalsen, of moet ik echt naar de dealer?
    10. Waar kan ik in de omgeving van Geldermalsen een goede tweedehands auto kopen bij een garage die ook garantie geeft?

### Context - recorded, not configured

None of this is entered into the system. It is written down because it is what the
results will be read against, and reading it in afterwards would be fitting the
explanation to the number.

- Enspijk is a rural village of a few hundred people.
- The business sits very close to the **A2**. That is a real commercial advantage
  for a passing motorist and it appears **nowhere on their website**.
- The homepage carries roughly 150-200 words: no address, no brands served, no
  opening hours, no reviews.
- The maintenance page carries roughly 450 words and does have the address, a
  Mercedes/VW/Audi specialism, opening hours and a KvK number. It has no prices, no
  mention of the A2, and an empty "Klantervaringen" heading.
- **Autobedrijf Koos Pellegrom is the control case.** Also rural, also near the A2,
  but chain-affiliated and with its own site. Geography is held nearly constant
  between the two, so a difference in outcome is attributable to the site or the
  chain rather than to where they are.
- **Autobedrijf Rivierenland has no website at all.** It is in the competitor list
  as the null case.

### Predictions

- **P1.** Mention rate at or near **0 percent** across all ten prompts.
- **P2.** `autoblom.nl` appears **rarely or never** in the cited-domain list.
- **P3.** **Prompt 8** (Audi, non-dealer, Betuwe) is Blom's best chance. The Audi
  specialism is the one thing properly stated on the site.
- **P4.** Cited domains **skew to chain and aggregator domains** over independent
  garages' own domains.
- **P5.** **Autobedrijf Rivierenland, which has no website, is not named.** If it
  **is** named, that weakens the premise that web presence drives visibility - and
  that is the more interesting result of the two.
- **P6.** **Koos Pellegrom is named more often than Blom.** If Pellegrom is also
  absent, geography dominates and rural businesses are structurally invisible - a
  more pessimistic finding, and one worth knowing before selling to any of them.

---

## 3. Brand 2 - Slotenmaker Nieuwegein

| Field | Value |
|---|---|
| Name | Slotenmaker Nieuwegein |
| Website | slotenmaker-nieuwegein.nl |

**Aliases**

    Slotenmaker Nieuwegein
    Slotenmaker-Nieuwegein
    slotenmaker-nieuwegein.nl

**Nothing else, and this is a decision that changes the numbers.** The operator
offered *sleutelboer*, *slotsmid*, *sleutelmaker* and *locksmith*. Those are
synonyms for the **trade**, not names of this business. In an alias list they
would make every answer that mentions any locksmith at all count as a mention of
this one, which would turn the headline figure into a measurement of the category.
The product's whole argument is that a number means what it says.

**Competitors**

    Slotenmaker LockTight
    MK Slotenmaker Utrecht
    Slotenmaker-Expert
    QuickBlue
    Slotenmaker van Dijk
    Slotenmaker Veenstra
    Slotenmakers Veenstra

Veenstra is listed in **both** the singular and plural forms: the trade name is
singular and the domain is plural, and there is no way to know in advance which
one a model will write. They are two aliases of one business and will therefore
appear as two rows in competitor frequency if both occur - a known limitation of
v1, which does not group competitor aliases, and it is recorded here rather than
discovered in the results.

**Prompts** - ten, in Dutch.

    1.  Ik heb met spoed een slotenmaker nodig. Ik ben mijn sleutel kwijt en kan mijn huis niet in. Ik woon in Nieuwegein.
    2.  Het is nu 's nachts en ik sta buitengesloten in Nieuwegein. Wie kan mij nu nog helpen en wat gaat dat ongeveer kosten?
    3.  Mijn sleutel is afgebroken in het slot van mijn voordeur. Ik woon in de buurt van IJsselstein. Wat moet ik doen en wie kan dit repareren?
    4.  Wij hebben vannacht een inbraak gehad en de voordeur is geforceerd. Ik zit in de regio Utrecht en de deur moet vandaag weer dicht kunnen. Wie kan dat doen?
    5.  Ik ga volgende maand verhuizen en wil de sloten laten vervangen. Ik kom in Nieuwegein te wonen. Wat kost dat en wie kan ik daarvoor bellen?
    6.  Wat kost het gemiddeld als een slotenmaker je deur moet openen, en hoe voorkom ik dat ik word afgezet?
    7.  Mijn verzekering wil beter hang- en sluitwerk. Welke slotenmaker in de omgeving van Utrecht kan dat plaatsen met het politiekeurmerk?
    8.  Het slot van mijn achterdeur draait niet meer goed. Kan een slotenmaker dat repareren of moet het hele slot eruit? En wie doet dat in Nieuwegein?
    9.  Ik sta buitengesloten en het is zondag. Zijn er slotenmakers in de buurt die in het weekend werken? Ik zit in Vianen.
    10. Welke slotenmaker in Nieuwegein is betrouwbaar en niet te duur?

The list is designed, not collected:

- **Prompt 1 is the operator's own wording, verbatim.** It is the anchor: this is
  the question that was asked of ChatGPT by hand, and this business - which ranks
  high on Google - was not named in the answer.
- **Prompt 6 names no place at all.**
- **Prompt 7 names the politiekeurmerk deliberately**, to see whether a stated
  certification is what gets a business named.
- **Prompts 3, 4 and 9 name IJsselstein, regio Utrecht and Vianen** instead of
  Nieuwegein.

### Context - recorded, not configured

- The business **ranks high on Google** and was **not named** when the operator
  asked ChatGPT the question in prompt 1 by hand.
- Its site carries roughly 2,500-3,000 words and claims **9.5/10 from 492+
  reviews**, arrival within 20 minutes, an SKG keurmerk, and "erkend &
  gecertificeerd".
- It states **no address, no KvK number, no prices, and no certification number,
  issuing body or link**.
- **LockTight, which was named, states a street address and a PKVW certification
  that the model checked at Kiwa.**

### Predictions

- **P7.** Mention rate is **low despite the strong Google ranking**.
- **P8.** **LockTight and MK Slotenmaker dominate** the named competitors.
- **P9.** **A material share of this brand's raw mentions are FALSE POSITIVES** -
  the words "slotenmaker" and "Nieuwegein" standing next to each other in a heading
  or a sentence, not a naming of the business. The name is its category plus its
  city, which is the extreme case of the ordinary-word problem.
  **This is not fixable by a parser change and must be measured.** After the run,
  hand-verify **every single mention** against the stored raw text via C17, and
  report the false-positive rate **as its own figure**. This is C17's first real
  use and its most important one: a traceability capability that cannot settle this
  question is decoration.
- **P10.** The prompts naming **IJsselstein, Vianen or regio Utrecht surface a
  different set of businesses** than the Nieuwegein prompts, because the models
  appear to select on **registered address** rather than on service radius.
- **P11.** **Prompt 6, with no place in it, names no local business at all.**
- **P12.** **Slotenmaker Veenstra is named at least once despite publishing no
  address**, on the strength of 1,080 Google reviews - even though the model's own
  answer warned against exactly that pattern.
  **Whether P12 holds is the sharpest single question in the run.** If a model
  verifies one certification claim and accepts another unverified one, the
  verifiability principle is exploitable, and a product built on "be verifiable"
  needs to know that.

---

## 4. Brand 3 - Coolblue

The **healthy-render control**: full coverage, a real average position, a
populated cited-domain list. Its purpose in this phase is comparative. Every
judgement about whether Blom's zero "reads as a measurement rather than a
failure" is a judgement about two screens side by side, and this is the other
screen.

*Revised 2026-08-26, before run one.* The original plan said "reuse the existing
company", which turned out not to be possible: the Coolblue company lives in the
local database and the deployed instance had never held it (section 8.2). It was
therefore created on the deployed instance - and given **four** prompts rather
than ten, on the operator's decision. The control has to render a healthy screen;
it does not have to be a complete analysis, and paying $4.34 for six invented
questions to prove a rendering that has already rendered many times locally is
not a good use of the budget. Four real consumer questions cost $1.74 and prove
the same thing on real output.

| Field | Value |
|---|---|
| Name | Coolblue |
| Website | coolblue.nl |

**Aliases**

    Coolblue
    coolblue.nl

**Competitors**

    MediaMarkt
    Bol
    Amazon.nl
    Expert
    BCC

**Prompts** - four, in Dutch, consumer buying-moment.

    1.  Waar kan ik het beste een nieuwe wasmachine kopen in Nederland?
    2.  Ik zoek een goede laptop voor mijn studie. Bij welke winkel kan ik die het beste kopen?
    3.  Welke webshop in Nederland heeft de beste klantenservice voor elektronica?
    4.  Ik wil een televisie kopen en wil hem morgen in huis hebben. Waar kan dat?

No predictions are recorded for Coolblue. It is a control, and the thing being
checked is the **rendering**, not the result.

---

## 5. Run design

| # | Company | Prompts | Targets | N | Calls | When |
|---|---|---|---|---|---|---|
| 1 | Autobedrijf Blom | 10 | 2 | 3 | 60 | day one |
| 2 | Autobedrijf Blom | 10 | 2 | 3 | 60 | day one, later |
| 3 | Autobedrijf Blom | 10 | 2 | 3 | 60 | **day two** |
| 4 | Slotenmaker Nieuwegein | 10 | 2 | 3 | 60 | once |
| 5 | Coolblue | 4 | 2 | 3 | 24 | once |
| | | | | | **264** | |

**Why the Blom basis is repeated in full rather than reduced.** The three runs are
the stability check and the presentation pass at the same time. Repeating the
whole basis means the variance measured is the variance of the **actual product
output**, not of a smaller experiment that happens to be cheaper.

**What is read out of the three is not primarily Blom's own figure.** He will most
likely sit at zero all three times, which is stable and uninformative. The
quantity that matters is whether **the set of named competitors is stable**. If
the models name a different three garages each time, then "visibility" is not a
measurable quantity - and that is the finding that decides whether this product
has a thesis at all. It is also, per `PLAN.md`, the separation of **citation churn
from mention churn**: the published volatility figures in this category measure
how fast cited *sources* change and are reported as though they measured
visibility. They are not the same quantity, and this instrument stores the two
separately on immutable hashed runs, so one pair of runs answers both.

**The three runs must be separated in time, and one of them must be on a
different day.** Three runs inside one minute measure how deterministic a model is
inside a minute, which is not the question being asked - but three runs inside one
*day* do not satisfy `PLAN.md` either, which requires the repeat to be "at least a
day later". Runs 1 and 2 on day one and run 3 on day two satisfies the criterion
and yields both the within-day and the across-day comparison from the same three
runs. *Settled 2026-08-26, before run one: PLAN wins over the original wording.*

**Runs 2 and 3 are triggered by the operator through the UI**, which exercises the
flow a customer would use.

**The basis must not change between runs 1, 2 and 3.** Editing Blom's prompts,
aliases or competitors between them changes `basisHash`, C11 correctly refuses to
draw them as one series, and the stability check is destroyed. If a change is
genuinely needed, it starts a new series and this document says so.

---

## 6. Pre-task record

### 6.1 Quote folding - measurement semantics version 5

Typographic apostrophes and quotation marks are folded to their ASCII equivalents
**in the matching step only**. Stored text is untouched.

The defect was certain rather than probable: the operator's keyboard produces
`'`, a model's renderer produces `’`, NFC maps neither onto the other, and an
alias written with one form could **never** match text written with the other. In
Dutch that is not an edge case - `'t Hoekje`, `'s-Hertogenbosch`,
`Jan's Autoservice` - so the miss would have fallen hardest on the most
Dutch-sounding businesses, and one of this run's own competitors
(`Mike's Car Service`) carries it.

It was done **before** Phase 9 rather than discovered during it, because Phase 9
is the run whose numbers are meant to be treated as evidence and measuring them
under a rule already known to be wrong would waste the spend.

- `MEASUREMENT_SEMANTICS_VERSION` 4 -> **5**, and a row added to
  `SPEC.md` -> Definitions -> Measurement semantics log.
- `SPEC.md` -> Definitions gains **Quote folding**; C8 gains the clause.
- Seven tests were added that go red if the fold is removed - six in
  `tests/parse/mentions.test.ts` and one at the seam in
  `tests/parse/mentions-seam.test.ts`, which is the half that proves an answer's
  stored `rawText` is **not** folded.

### 6.2 The ceiling, lowered for this phase

`MAX_PLANNED_CALLS` 300 -> **100**, temporarily. Every run above is 60 calls, so
nothing legitimate is refused, and a mis-click costing three times as much is
refused before a single provider call is made. **Raise it back to 300 after Phase
9** - at 100 it also refuses the ordinary 120-call, 20-prompt client run, which is
why it is a ceiling for one phase's spend and not a change of the bound.

---

## 7. The price, computed rather than assumed

Computed 2026-08-26 by `src/core/run/estimate.ts` against the **35 stored `ok`
answers carrying a cost**, every one of them a real provider call. Not from
`FALLBACK_MICROS_PER_CALL`, which is a constant and rots.

### Per call

| Sample | n | Mean | sd | Min | Median | Max | Searches | In / Out tokens |
|---|---|---|---|---|---|---|---|---|
| All | 35 | 72,402 | 17,434 | 42,212 | 75,894 | 110,288 | 1.86 | 18,923 / 1,462 |
| anthropic `claude-sonnet-5` | 16 | 69,455 | 13,289 | 48,376 | 76,148 | 82,198 | 1.69 | 17,746 / 1,709 |
| openai `gpt-5.6-terra` | 19 | 74,884 | 19,943 | 42,212 | 75,894 | 110,288 | 2.00 | 19,914 / 1,255 |

Figures are integer micro-dollars per call. Per-call coefficient of variation:
**24 percent**.

### Per run and in total

| | Calls | Central estimate |
|---|---|---|
| One run (10 prompts x 2 targets x N=3) | 60 | **$4.34** |
| Three Blom runs | 180 | **$13.03** |
| Slotenmaker Nieuwegein | 60 | **$4.34** |
| Coolblue | 60 | **$4.34** |
| **All five runs** | **300** | **$21.72** |

Taking each target's own mean rather than the pooled one gives $4.33 per run and
$21.65 in total - a difference of seven cents over the whole phase, because the
two providers' means are within 8 percent of each other.

The operator's arithmetic was 300 calls and "about $24". **$21.72** is the
measured figure; the difference is that $24 came from the 80,000 micro-dollar
constant in `lib/defaults.ts` and the stored answers now average 72,402.

### How far it can drift

Two different quantities, and only the second one is worth worrying about.

**Sampling noise is small and shrinks with the run.** Sixty calls average out: at
the observed sd, one 60-call run is $4.34 +/- $0.14 at one sigma (3.1 percent),
and the full 300 calls are $21.72 +/- $0.30 (1.4 percent). The 24 percent spread
between individual calls is not the spread of a run.

**The systematic driver is web searches, and it is nearly the whole story.**
Correlation between an answer's cost and its `searchCount` is **0.97** (and 0.97
with input tokens, which move with the searches, because search results are fed
back into the context). The observed distribution is 1 search on 9 answers, 2 on
22, 3 on 4. The regression slope is roughly **29,000 micro-dollars per additional
search** - about $0.01 of search fee and about $0.02 of the extra input tokens it
drags in. So:

| If these prompts average | Cost per call | Per run | All five runs |
|---|---|---|---|
| 1.0 searches | ~48,000 | ~$2.87 | ~$14 |
| 1.86 searches (observed) | 72,402 | $4.34 | **$21.72** |
| 3.0 searches | ~105,000 | ~$6.30 | ~$32 |
| 4.0 searches | ~133,000 | ~$8.00 | ~$40 |

**A realistic band for the whole phase is therefore about $14 to $32**, with $22
the central figure, and the thing that decides where in that band it lands is how
many searches a Dutch local-service question provokes - which nobody has measured
yet, and which this phase is the first sample of.

### One finding already, from the existing sample

`lib/defaults.ts` speculates that a buying-moment prompt provokes **more** searches
than a factual one, and that this is the uncharacterised driver of unit cost. The
stored data, split by run, points the other way:

| Run | Provider | n | Mean micros | Searches |
|---|---|---|---|---|
| Coolblue (real buying-moment prompts) | anthropic | 3 | 49,245 | 1.00 |
| Coolblue | openai | 3 | 51,367 | 1.33 |
| verify-live (one gate prompt) | anthropic | 13 | 74,118 | 1.85 |
| verify-live | openai | 13 | 83,660 | 2.23 |

The only real buying-moment run stored is the **cheapest** thing in the sample, at
about $0.05 per call against the gate prompt's $0.074-0.084. **n=6 settles
nothing** and it is recorded as a question rather than an answer: if the Phase 9
runs land near the Coolblue figure the phase costs about **$15**, and if they land
near the verify-live figure it costs about **$24**.

### One limitation of these figures, stated

They are computed against the **local** database, which holds every answer this
project's gate runs have produced. The deployed instance has its own database and
its own smaller history, so the dollar estimate printed inside a **refusal
message** on the deployed instance will be derived from that smaller sample and
may differ. The bound itself is on the call count, which is exact either way. The
production database is not reachable from a developer machine - Railway exposes
Postgres only on the internal network - so this was not verified against it.

---

## 8. Addendum, same day - what the deployed instance actually held

Written after the two new companies were created, and before anything was queued.
It corrects section 5 and section 7; **no prediction in sections 2 or 3 changes**,
which is why it is an addendum rather than an edit.

### 8.1 The companies now on the deployed instance

| Company | id | Prompts | Website |
|---|---|---|---|
| Autobedrijf Blom | `b56b1213-3620-4254-9cb6-ad5a9a20db24` | 10 | autoblom.nl |
| Slotenmaker Nieuwegein | `37249cc2-6cba-4476-8db9-eaaad0aa5536` | 10 | slotenmaker-nieuwegein.nl |
| Skeleton demo | `d760488c-9dda-4c86-a3cd-217f64e8df9c` | 1 | - |

Both were created through the operator UI at `web-production-15ff2.up.railway.app`,
and both report "Starting this run makes 60 provider calls - 10 prompts x 2
targets x N=3" on their own page before anything is pressed.

### 8.2 Coolblue is not on the deployed instance

**The deployed database holds no Coolblue company.** It has `Skeleton demo` and
the two created above, and one run in total. The Coolblue company - two aliases,
three competitors, `https://www.coolblue.nl`, and the six answers behind the
healthy render - is in the **local** database, which is where every gate run this
project has made has gone.

Two consequences, and the second is the one that moves money:

1. "Reuse the existing company" cannot be literal on the deployed instance. A
   Coolblue created there is a different row with no history, so its run is a
   fresh healthy-render control rather than a continuation of anything. That is
   still enough for what this phase needs Coolblue for - a healthy screen to hold
   beside Blom's zero - but it is not the same claim.
2. **Coolblue as it is configured has one prompt, not ten.** A run of it is
   **6 calls**, not 60. The 300-call arithmetic assumed 60.

This was left for the operator to decide rather than guessed at, because it
changes the spend and because this system deliberately has no delete button: a
company created in the wrong place stays there.
**Decided the same day:** create Coolblue on the deployed instance with **four**
prompts, not ten. Section 4 carries the configuration and the reasoning; its id is
`ec0a6f26-f8bd-4914-b911-c11886b6d2d0`.

### 8.3 The price, restated against what exists

**The approved plan, and what it costs.**

| Run | Calls | Cost at the measured mean |
|---|---|---|
| Blom, three times | 180 | $13.03 |
| Slotenmaker Nieuwegein | 60 | $4.34 |
| Coolblue, four prompts | 24 | $1.74 |
| **Total** | **264** | **$19.11** |

Exactly: 264 x 72,402 = 19,114,128 micro-dollars = **$19.114**. The operator
approved **$19.12**; the one-cent difference is rounding, and the approved figure
is the ceiling.

The drift band in section 7 applies unchanged and is proportional: at 1 search per
call the phase is about $12.70 and at 3 searches about $27.70.

`MAX_PLANNED_CALLS` at 100 permits every run in the plan, because the bound is per
run and the largest run is 60 calls.

### 8.5 Both pre-run gates, green

Recorded here because the point of a gate is that somebody can check it ran.

- **Linux.** GitHub Actions recovered from its outage and ran `ci` on **both**
  shas. On `acff121`, the commit carrying the apostrophe fold:
  run `32987629210`, runner `ubuntu-latest`, containerised `postgres:18`,
  every step success - `npm ci`, `prisma migrate deploy`, `typecheck`, `lint`,
  and `npm run test` with **441 passed (441)** on Linux. On `0bf2c1e`:
  run `32988743781`, also success. The container bisect was therefore not needed;
  the canonical Linux environment ran the suite against the exact sha.
- **`npm run verify`, including `verify:live`.** Passed 2026-08-26. One real
  end-to-end run, `de0e7c32-8e07-4247-9c7f-6b6ece37dc6f`, two targets at N=1: run
  reached `completed`, 2 of 2 successful answers, 0 answers without a citation, 8
  mentions parsed. `openai:gpt-5.6-terra` ok, 4 citations, 5 mentions, 2 searches,
  70,584 micro-dollars; `anthropic:claude-sonnet-5` ok, 10 citations, 3 mentions,
  2 searches, 87,332 micro-dollars. **Cost: $0.158**, against a $19.12 phase.
  This is what exercises the fold, the lowered ceiling and the version bump
  through the real queue, worker, adapters and parser rather than through
  fixtures.

### 8.4 CI has not run this commit

Recorded because rule 19 distinguishes it from a failure. The pre-task commit
`acff121` is on `origin/main` and **both Railway services are running it** -
`web` and `worker` both report `commitHash acff121`, status SUCCESS. GitHub
Actions created **no run at all** for that sha: `githubstatus.com` reports Actions
in **major outage** at the time of writing. So the honest statement is "CI has not
run this", not "CI failed" and not "CI is green". The full local suite - 441 tests
- typecheck and lint were all green before the push. `npm run verify:live` was not
run: this session spends nothing at a provider.

---

## 9. The churn metrics, defined before run one

`PLAN.md` -> Phase 9 requires citation churn and mention churn to be measured
**separately, on the same runs**. Until now that was a sentence rather than a
quantity, and a quantity defined after seeing the results is not a measurement of
anything. This section is committed **before run one is queued**, and it is what
the numbers will be computed by.

Everything below is computed over the three Blom runs, which share one
`basisHash`. If C11 says the basis changed, the comparison is void and is
reported as void rather than computed anyway.

### 9.1 The two similarity figures

For each **target** and each **pair** of runs (1-2, 1-3, 2-3), two Jaccard
similarities over sets:

- **Mention churn.** `J = |A ∩ B| / |A ∪ B|` where A and B are the sets of
  **recognised brands named in at least one successful answer** of that target in
  each run. The subject brand is included; a brand named in zero successful
  answers is absent from the set.
- **Citation churn.** The identical figure over the sets of **cited domains** of
  that target's successful answers, using the cited-domain rule already in
  `SPEC.md` -> Definitions (host, lower-cased, trailing dot and leading `www.`
  removed, a subdomain its own source).

They are deliberately the same statistic over two different sets, so that
"citations churn faster than mentions" is a comparison of two numbers on one
scale rather than an impression. Reported per target, never pooled: one degraded
provider must not contaminate the other's figure.

`J = 1` is identical sets; `J = 0` is disjoint. Where a target has **no**
successful answers in one of the two runs, the pair is reported as "no data" and
not as `J = 0` (CLAUDE.md rule 1).

### 9.2 The plain figures, reported alongside

Jaccard decides the thesis; it is not the sentence a customer understands. So for
each target, also report:

- **how many distinct competitors were named across all three runs**, and
- **how many of them were named in every one of the three.**

"The models named seven different garages across three runs and only two appeared
in all three" is what a report eventually prints, and it is worth having in the
same table as the coefficient that justifies it.

### 9.3 The alias trap, and the correction applied

`Slotenmaker Veenstra` and `Slotenmakers Veenstra` are **one business entered
under two names**, because the trade name is singular and the domain is plural
and there is no way to know in advance which a model will write. v1 does not
group competitor aliases, so they will produce two rows.

For **frequency** that is merely untidy - two rows a reader can add up. For a
**set-similarity** figure it is wrong: one business counted as two members of a
set inflates every union it appears in and distorts every comparison, in a
direction that depends on which form each run happened to use. Worst case, a
model that names the same business in both runs but spells it differently reads
as complete churn.

**So: the two Veenstra forms are merged by hand into one set member before any
Jaccard figure is computed, and the report says that this was done.** The same
correction is applied to any other pair discovered to be two spellings of one
business - the merge list is written into the results report, not applied
silently. Nothing about the stored rows changes; this is a correction made at
read time, on figures that are computed at read time anyway (C9).

This is a v1 limitation being worked around, not a defect being hidden. Grouping
competitor aliases is a data-model change and belongs to a later phase; it is
recorded as an engineering item rather than done here.

---

## 10. The read-back receipt

Taken 2026-08-26, after all three companies existed and **before run one was
queued**. Every alias, competitor and prompt was read back out of
`GET /api/companies/:id` on the deployed instance and compared
character-for-character, in order, against the lists in sections 2, 3 and 4 of
this document - not eyeballed against them.

The check exists because of a defect in the form rather than a doubt about the
data: the alias and competitor boxes are about five lines tall, do not grow,
de-duplicate silently and report no count, which is a way to lose a line without
noticing (`PLAN.md` -> Engineering items). That risk sits directly upstream of a
$19 spend.

**Result: no differences.**

| Company | id | Website | Aliases | Competitors | Prompts |
|---|---|---|---|---|---|
| Autobedrijf Blom | `b56b1213-3620-4254-9cb6-ad5a9a20db24` | match | 6/6 match | 9/9 match | 10/10 match |
| Slotenmaker Nieuwegein | `37249cc2-6cba-4476-8db9-eaaad0aa5536` | match | 3/3 match | 7/7 match | 10/10 match |
| Coolblue | `ec0a6f26-f8bd-4914-b911-c11886b6d2d0` | match | 2/2 match | 5/5 match | 4/4 match |

The comparison also listed every non-ASCII character in everything stored, because
an apostrophe form is invisible in a printed diff. **There are none**: every stored
string is pure ASCII, so `Mike's Car Service` and the `'s nachts` in the
locksmith's second prompt both carry U+0027 and not U+2019, which is what the
operator typed. Nothing was silently transformed on the way in.

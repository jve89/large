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

---

## 11. Run 1 - Autobedrijf Blom, 2026-08-26

Run `6177281c-3962-42f4-ae51-ea51647b6b03`, basis `7c3fec1e65c4`, queued through
the deployed UI at 16:45:54Z, `completed` at 16:48:35Z - two minutes forty-one
seconds for 60 calls.

**Coverage 100 percent on both targets, 30 of 30 planned, every answer `ok`, no
answer without a citation, nothing labelled unreliable.** The run is a clean
measurement, which is what makes everything below readable.

### 11.1 The headline: P1 is wrong, and it is wrong in the most interesting way

| | anthropic `claude-sonnet-5` | openai `gpt-5.6-terra` |
|---|---|---|
| Coverage | 100% (30/30) | 100% (30/30) |
| Mention rate | **measured 10%** (3 of 30) | **measured 16.7%** (5 of 30) |
| Average position | **measured 1** | **measured 1** |

**Autobedrijf Blom is named, and when he is named he is named first.** P1
predicted "at or near 0 percent across all ten prompts". That is falsified as
stated, and the shape of the miss is the finding:

| Prompt | anthropic | openai |
|---|---|---|
| 1. *"...in de buurt van **Enspijk**"* | **3 of 3** | **3 of 3** |
| 2-7, 10 (Geldermalsen, Betuwe, Deil, A2, Rumpt, APK, occasions) | 0 of 3 | 0 of 3 |
| 8. Audi, non-dealer, Betuwe | 0 of 3 | **1 of 3** |
| 9. Mercedes, gewone garage | 0 of 3 | **1 of 3** |

Every attempt on the prompt naming **his own village** found him, on both
providers, unanimously. Every attempt on a prompt naming the **town eight
kilometres away** missed him, on both providers, unanimously. The models are not
failing to know he exists - they name him as "mijn meest allround aanbeveling"
and "Mijn eerste keuze vlak bij Enspijk" - they are answering a *place* question
with the businesses registered in that place.

That is a sharper commercial finding than a flat zero would have been. A flat zero
says "you are invisible". This says **"you are visible in a village of a few
hundred people and invisible in the market town where your customers are"**, which
is a specific, arguable, and sellable statement.

**P3 is confirmed.** Prompt 8, the Audi specialism - the one thing properly stated
on the site - is one of only two non-Enspijk hits in the whole run, and the
Mercedes prompt is the other. Both are the pages that carry real content.

### 11.2 First reading of the other predictions - one run of three

| | Prediction | Run 1 |
|---|---|---|
| P1 | mention rate ~0% everywhere | **falsified**: 10% / 16.7%, and 3/3 on his own village |
| P2 | `autoblom.nl` rarely or never cited | **holds**: 0 answers on anthropic, 2 on openai, both marked `(yours)` |
| P3 | prompt 8 is his best chance | **confirmed**: one of two non-Enspijk hits |
| P4 | cited domains skew to chains and aggregators | **holds**: `123auto.nl`, `bovag.nl`, `anwb.nl`, `vakgarage.nl`, `viabovag.nl`, `goudengids.nl` are the top of both lists |
| P5 | Rivierenland (no website) not named | **holds**: 0 of 30 on both targets |
| P6 | Koos Pellegrom named more often than Blom | **falsified, and reversed**: Pellegrom 0 of 30 on both targets, Blom 3 and 5 |

P6 reversing matters. The control case was chosen because it holds geography
nearly constant - also rural, also near the A2, but chain-affiliated with its own
site. It was named **zero** times while Blom was named eight. So on this evidence
the chain affiliation did not buy visibility, and rural is not by itself
disqualifying. What decided it was whether the question named the village.

### 11.3 Criteria that must be reported whether or not they occur

Read per answer from the stored evidence (C17), not from an aggregate, and
cross-checked against the aggregate: 3 subject-named answers on anthropic and 5 on
openai, matching the 10% and 16.7% exactly, so the zeros below are real zeros and
not a failure to detect.

- **"Cited but not named": 0.** In both openai answers where `autoblom.nl` is
  cited, the answer also names him in prose. The register's row stays open.
- **The link-text-domain false negative: 0.** Not one recognised brand appears
  only as the visible text of a self-linking markdown link. The belief that a
  model naming a business names it in prose held on 60 real answers - and openai
  emitted exactly that construction, `([autoblom.nl](https://autoblom.nl/onderhoud))`,
  three times, always beside the name in prose.

### 11.4 The apostrophe fold earned its place in the first run

openai wrote **`Mike’s Car Service`** - U+2019 - and the stored mention reads
`Mike's Car Service`, the operator's straight apostrophe.

**Both** of that competitor's two mentions in this run exist *only* because of the
fold: matching the stored alias against the raw answer without folding finds
nothing in either answer. Without the pre-task, `Mike's Car Service` would have
read **0 of 30** instead of 2 of 30, and no figure on the page would have hinted
that anything was missing. This is the class of defect that the pre-task existed
for, occurring on the first prompt of the first run.

### 11.5 Cost - running under estimate

| | Value |
|---|---|
| Answers | 60 of 60 planned |
| Input tokens | 1,080,453 |
| Output tokens | 62,503 |
| Web searches | 97 (**1.62 per call**) |
| **Cost** | **$3.80** (3,800,800 micro-dollars) |

That is **63,347 micro-dollars per call** against the 72,402 estimated from the
stored sample - 12 percent under, and consistent with the search count coming in
at 1.62 rather than 1.86. Section 7 said the driver was searches and the
correlation was 0.97; the first real sample behaves that way.

Projected at the observed rate, the remaining 204 calls cost **$12.92** and the
phase lands at **$16.72** against the approved $19.12.

### 11.6 The finding against P1 - a mechanism, not a score

P1 said "mention rate at or near 0 percent across all ten prompts". **Falsified,
and the replacement is stronger.** Blom is named **8 of 60**, and the eight are
not scattered: they are unanimously concentrated on the one prompt that names his
own village, plus one attempt each on prompts 8 and 9.

Every prompt naming the market town eight kilometres away, the region, a
neighbouring village or the motorway: **zero, on both models, every attempt**.

The models are **not missing data about this business.** They name him with
address, founding year, brands served and review count. What they do is answer a
**place** question with the businesses **registered in that place**. His catchment
is roughly twenty-five villages; exactly one of them returns him, and it is the
one with a few hundred inhabitants rather than the town his customers drive to.

**The citations say the same thing from the other side.** The top of both cited
lists is `123auto.nl`, `bovag.nl`, `anwb.nl`, `vakgarage.nl`, `goudengids.nl` -
directories. So the model reads a directory and then **selects by place match**.
That is a far more precise mechanism than "web presence wins", and it points at a
cheap intervention rather than an expensive one: being listed under the places you
serve, rather than rebuilding a website.

### 11.7 The finding against P6 - the control removed the other explanations

P6 said Koos Pellegrom would be named more often than Blom. **Falsified and
reversed**: Pellegrom **0 of 30 on both targets**, Blom 8.

That is the more useful half of the run, because of what the control holds
constant. Pellegrom is also rural, also near the A2, chain-affiliated, and has his
own site. He scored zero.

- **Chain affiliation bought nothing.**
- **Site quality bought nothing.**
- The variable that moved the result was **whether the question named the
  village.**

A single control cannot prove a mechanism, but it can remove candidate
explanations, and it removed the two most expensive ones.

### 11.8 The diagnosis - he is not losing the comparison, he is not in it

**Average position is a measured 1.** On both providers.

> **Qualified 2026-08-26 by section 16.5, and the qualification is load-bearing.**
> Every subject mention in this phase is recorded as **"1 of 1"** - he was the only
> *recognised* brand in every answer that named him. So position 1 means "no
> competitor we were told to look for appeared beside him", **not** "he was
> recommended first". openai's run 1, prompt 1, repetition 3 ranked *Autobedrijf De
> Vos* first and Blom second, and the instrument still recorded 1 of 1, because De
> Vos is not on the competitor list. The sentence this section originally carried -
> "when he is named he is named first" - is **withdrawn**. The prose quoted below
> is real and he is genuinely recommended in it; what cannot be claimed from the
> figure is a rank against rivals.

He is recommended in prose when he appears: *"mijn meest allround aanbeveling"*,
*"Mijn eerste keuze vlak bij Enspijk"*.

So his problem is **not** that he comes third. It is that on nine questions out of
ten he is not a candidate at all. **That half rests on the mention rate, which is
sound, and it survives the qualification above unchanged.**

That is a different diagnosis from "improve your website", it follows from two
figures that this instrument already puts side by side - a mention rate of 10
percent and an average position of 1 - and it is the sentence that would open a
conversation with him. A product that reported only the mention rate could not
say it.

---

## 12. Three new predictions, committed before the locksmith runs

Run 1 turned a guess into a **mechanism**: the models read directories and then
select by **place match**, and neither chain affiliation nor site quality moved
the result. The locksmith is the **first independent test** of that mechanism -
different trade, different geography, a city instead of a village - and it is only
a test if the prediction is committed first. A mechanism written down *after* the
next result is not a finding, it is pattern-matching.

Committed 2026-08-26, before the Slotenmaker Nieuwegein run is queued.

- **P13. Place match, city edition.** The locksmith's mentions **concentrate on
  the prompts naming Nieuwegein** and are **near-absent on prompts 3, 4 and 9**,
  which name IJsselstein, regio Utrecht and Vianen. Same mechanism as Blom, with a
  city in place of a village.
- **P14. What selection keys on.** Which businesses get named tracks **directory
  presence carrying the queried place name** - not chain affiliation and not site
  quality. Concretely: **LockTight**, which has a Nieuwegein street address and
  roughly eight independent listings, is named **more often than QuickBlue**,
  which has a poor site, and **more often than Veenstra**, which publishes no
  address at all.
- **P15. Candidacy, not quality.** When the locksmith **is** named, he is named
  **at or near position 1**, repeating Blom's pattern - the problem being
  candidacy rather than ranking. **If instead he appears late in the list, the
  diagnosis for him is different from Blom's**, and that difference matters more
  than the confirmation would.

**P14 and P12 are not the same prediction and can both be true or both be false.**
P12 asks whether **review volume** overrides the model's own stated warning about
unverified claims. P14 asks what the **selection** actually keys on. One is about
what a model says it trusts; the other is about what it demonstrably retrieves.

---

## 13. The absent screen - decided after the locksmith, and not with a fourth brand

The register row is still open. Blom's average position is a measured **1**, not
`not-applicable`, so the run-level screen a **genuinely absent** business would see
has still never rendered from real data. Nine of ten prompts do read a measured
**0** per cell, which exercises "measured zero, never no-data" at cell level, but
that is not the screen a plumber sees.

**The locksmith may produce it for free.** Decide after that run, not now.

**If it does not, do not source a fourth brand.** There is a cheaper and more
honest option:

> Run **Blom again on a new basis that omits prompt 1** - five prompts, none of
> them naming Enspijk. **30 calls, under two dollars.**

That is guaranteed to produce the absent screen, on a **real** business, with
**real** data. And it is a finding in its own right rather than a test fixture:
*the same garage, measured on the questions his customers actually type, appearing
nowhere.* The screen and the sales argument in one run.

It is a **different basis**, so it does not touch the three-run series, and C11
will say so on the page - which incidentally is the first exercise of the
comparability guard against real data, another row of the register (`C11 firing at
all`) that nothing has ever produced.

**Do not do this before the locksmith run.** It is recorded here so that a later
session finds the cheap option rather than inventing a fourth company.

---

## 14. Run 2 - Autobedrijf Blom, same basis, same day

Run `76abbe79-0ce3-43a0-be0f-ab40f57e9f90`, basis **`7c3fec1e65c4`** - identical
to run 1, so C11 draws them as one series. **Coverage 100 percent on both targets,
60 of 60, every answer ok.**

> **Correction, 2026-08-26.** This section first said run 2 was queued "about three
> hours after run 1". **That was wrong.** Read from the stored rows rather than
> from memory: run 1 was created at `16:45:54Z` and run 2 at `17:10:15Z` - a gap of
> **24 minutes**, and 21 minutes between run 1 finishing and run 2 starting. Every
> claim below about the 1-2 pair is a claim about a **24-minute** separation, not a
> three-hour one, and that is a materially weaker interval. The error is corrected
> in place and recorded rather than quietly fixed, because a later design was built
> on it: the locksmith pair was to be separated by "the same interval as Blom runs
> 1 and 2", which is 24 minutes and not three hours.

### 14.1 The figures, beside run 1

| | anthropic run 1 | anthropic run 2 | openai run 1 | openai run 2 |
|---|---|---|---|---|
| Coverage | 100% (30/30) | 100% (30/30) | 100% (30/30) | 100% (30/30) |
| Mention rate | 10% (3) | **10% (3)** | 16.7% (5) | **13.3% (4)** |
| Average position | 1 | **1** | 1 | **1** |

Per prompt, mentions of the subject out of 3 attempts:

| Prompt | anth 1 | anth 2 | oai 1 | oai 2 |
|---|---|---|---|---|
| 1. Enspijk | 3 | **3** | 3 | **2** |
| 2-7, 10 | 0 | **0** | 0 | **0** |
| 8. Audi | 0 | **0** | 0 | **2** |
| 9. Mercedes | 0 | **0** | 1 | **0** |

**anthropic is bit-for-bit identical at cell level.** openai moved by one answer
in total, redistributed between prompts 8 and 9 - both of which are the
content-bearing pages, which is P3's territory rather than noise elsewhere.

**Against PLAN's stability criterion:** the largest movement in a mention rate is
16.7 to 13.3 percent, which is 5 answers to 4 - **exactly one step of N**, and the
criterion is "more than one step". **N=3 stands so far.** Run 3, tomorrow, is what
settles it, because two runs on one day cannot distinguish a stable quantity from
a quantity that is stable within a day.

### 14.2 The churn figures - and this is the finding PLAN said nobody has published

Computed by the definition committed in section 9, before either run existed.
Merge list applied: the two Veenstra spellings (not applicable to Blom's list).

| Target | Mention **J** | Citation **J** |
|---|---|---|
| anthropic `claude-sonnet-5` | **1.000** | **0.529** |
| openai `gpt-5.6-terra` | **1.000** | **0.525** |

The plainer pair (section 9.2), across the two runs:

| Target | Distinct brands named | Named in **every** run |
|---|---|---|
| anthropic | 3 | **3** |
| openai | 5 | **5** |

- anthropic: `Autobedrijf Blom`, `Vakgarage Van der Klij`, `Autobedrijf Ruud den Hartog`
- openai: `Autobedrijf Blom`, `Vakgarage Van der Klij`, `Vermeer Automotive`,
  `Mike's Car Service`, `Van Ooijen Automotive`

**Every brand named in run 1 was named again in run 2, on both providers, and no
new one appeared.** Meanwhile the cited domains turned over by roughly half: 47
against 60 with 37 shared on anthropic, 46 against 44 with 31 shared on openai.

That is the empirical claim `PLAN.md` -> Phase 9 asks for and says nobody has
published: **the published volatility figures in this category measure how fast
cited sources change, and they are not measuring visibility.** On this evidence
the two quantities move at completely different rates - one did not move at all
while the other churned about half - and a product that reports citation churn as
though it were visibility churn is reporting the wrong number.

**Owed after run 3, and not before:** if the third run holds, this belongs in
`SPEC.md` -> Vision under differentiator 3, per PLAN's instruction, rather than
only in a phase report. It is deliberately not written there on the strength of
one pair of runs measured **24 minutes** apart - see the correction at the head of
this section. Twenty-four minutes is long enough to be more than a determinism
check and far too short to support a claim about stability over time. Run 3, a day
later, is what would.

### 14.3 Cost

| | Calls | Searches / call | Cost | Per call |
|---|---|---|---|---|
| Run 1 | 60 | 1.62 | $3.80 | 63,347 |
| Run 2 | 60 | 1.77 | $4.04 | 67,332 |
| **So far** | **120** | **1.69** | **$7.84** | **65,340** |

Still under the 72,402 the estimator projected, and the difference still tracks
the search count exactly, which is what section 7 said the driver was. Remaining
144 calls project to **$9.41**, phase total **$17.25** against the approved
$19.12.

### 14.4 Where run 2's variance appeared, which is more informative than how much

anthropic was **identical at cell level** - not "close", the same three mentions on
the same prompt. openai moved by **exactly one answer**, and both halves of that
move landed on **prompts 8 and 9**: the Audi question and the Mercedes question.
Prompt 8 went 1 -> 2 and prompt 9 went 1 -> 0.

Variance appeared **nowhere else**. Not one of the eight other prompts moved on
either provider, in either direction.

Those two prompts are the **marginal candidates** - the only two questions where
Blom is neither an obvious local answer (prompt 1) nor absent from consideration
entirely (everything else), and the only two backed by the pages of his site that
carry real content. That is what **genuine hesitation at a boundary** looks like:
the model is undecided about the same two cases twice, rather than jittering
uniformly across the measurement.

A flat variance figure - "mention rate moved 3.3 points" - would have reported the
same magnitude and hidden all of that. The shape is the information, and it is
only visible because coverage is 100 percent and the cells are stored per prompt.

---

## 15. P16, committed before any locksmith run is queued

### 15.1 What the Blom result cannot separate

Mention Jaccard of 1.000 across the Blom pair is consistent with **two different
worlds**, and this evidence cannot tell them apart:

- **mention sets are stable**, or
- **thin markets are stable.**

Blom's measured market is thin: **3 brands on anthropic, 5 on openai**. A set of
three is far easier to reproduce exactly than a set of fifteen. The two readings
have opposite commercial consequences - one says visibility is a measurable
quantity worth selling, the other says it is measurable only where there was
barely anything to measure.

The locksmith is the **discriminating case**: urban, dense, many plausible
candidates, aggregators and national operators competing for the same slot. That
is why it runs twice, and the pair is to be separated by **the same interval as
the Blom 1-2 pair, which is 24 minutes** (see the correction in section 14) - so
that the two markets are compared on the same clock rather than on two different
ones. It is **not** meant to satisfy PLAN's across-a-day criterion; Blom run 3
does that.

### 15.2 The prediction

> **P16.** Mention Jaccard between the two locksmith runs is **materially below
> 1.000** - the operator's estimate is **0.6 to 0.8** - while citation Jaccard sits
> in the **same 0.4 to 0.6 band** as Blom's.

**If P16 holds:** mention sets are more stable than citation sets, **and stability
falls as the candidate pool grows**. Real, publishable, and qualified - and the
qualification is what makes it honest rather than a slogan.

**If P16 is falsified** and mention Jaccard stays near 1.000 in a dense urban
market too: mention stability is a property of **how these models answer local
questions**, not an artefact of Blom's small market. That is the version that
belongs in `SPEC.md` -> Vision.

### 15.3 What this session expects, and why - recorded so it can be wrong

**Directionally P16 holds: mention Jaccard below 1.000.** But **nearer 0.75-0.9
than 0.6-0.8**, for a reason that is a property of the instrument rather than of
the market, and which is worth stating before the number arrives:

**v1 does not discover unknown brands** (SPEC -> Definitions -> Recognised brand).
The measured set can only ever contain the subject plus the competitors on the
list. Blom's sets of 3 and 5 were drawn from a possible **10**; the locksmith's
will be drawn from a possible **7** - six businesses after the Veenstra merge, plus
the subject.

So a denser real market **does not** mechanically produce a larger measured set.
It produces more named businesses that are **invisible to this measurement**. The
dense-market effect that P16 is testing for reaches the Jaccard only through the
recognised subset, and that subset is *smaller* here than it was for Blom. If
LockTight and MK Slotenmaker are named in both runs - which P14 expects - two of
at most seven members are already fixed, and the coefficient starts high.

**This cuts both ways and that is the point.** If mention Jaccard does come back
at 0.6-0.8, it did so despite a *smaller* candidate ceiling, which makes the
pool-size reading **stronger** than the raw number suggests. If it comes back near
1.000, the recognised-set cap is a live alternative explanation and must be
reported as one rather than waved away - the honest conclusion would then be
"stable across two markets, measured against lists of ten and seven names", and
the way to break that tie is a run with a deliberately long competitor list, which
is a later phase and not this one.

---

## 16. Locksmith run 1 - Slotenmaker Nieuwegein, 2026-08-26

Run `8f076dc3-9d86-4447-9fe7-6f885207d972`, basis **`3121891056ea`** - a different
basis from Blom's, as it must be. Created `17:30:23Z`, completed `17:33:28Z`.
**Coverage 100 percent on both targets, 60 of 60, every answer ok.** $4.19.

Kept separate from the Blom narrative deliberately: the two answer different
questions and merging them would lose both.

### 16.1 The figures as the instrument reports them - before verification

| | anthropic | openai |
|---|---|---|
| Coverage | 100% (30/30) | 100% (30/30) |
| Mention rate **as reported** | 16.7% (5) | 6.7% (2) |
| Average position | 1 | 1 |
| Competitors named | QuickBlue 2, Slotenmaker Veenstra 1 | Slotenmaker LockTight 4 |

**Do not read the mention rates above.** They are the raw figures, and P9 exists
because for this brand the raw figure is not the measurement.

### 16.2 P9 - the false-positive rate, hand-verified against the stored raw text

All **7** subject mentions were read individually against the answer text via C17,
against the visible-text reduction rather than the raw string, and classified only
after reading. This is C17's first real use and its most important one.

| # | Target | Prompt | What the answer actually says | Verdict |
|---|---|---|---|---|
| 1 | anthropic | 2 | "De Slotenmaker Nieuwegein – 0318-240 299" | **false** |
| 2 | anthropic | 2 | "De Slotenmaker Nieuwegein – 0318-240299" | **false** |
| 3 | anthropic | 2 | "Slotenmaker Nieuwegein 24uur ... (030 7771264)" | **false** |
| 4 | anthropic | 10 | "Slotenmaker Nieuwegein (met Vincent/Luuk): 9,5 uit 492 ervaringen" | **TRUE** |
| 5 | anthropic | 8 | "Slotenmaker Nieuwegein 24 uur - biedt 24/7 slotenservice" | **false** |
| 6 | openai | 2 | "Slotenmaker Nieuwegein 24 uur - 030 777 1264" | **false** |
| 7 | openai | 1 | "Slotenmaker Nieuwegein: 085 760 25 17 ... binnen circa 20 minuten", cited to `slotenmaker-nieuwegein.nl` | **TRUE** |

The two true positives are identified by marks that belong to **this** business and
to no other: the **9,5 out of 492 reviews** its own site claims, and the phone
number **085 760 25 17** with the **20-minute** arrival claim, cited to its own
domain.

| | Raw | True | False | **False-positive rate** | **Corrected mention rate** |
|---|---|---|---|---|---|
| anthropic | 5 | 1 | 4 | **80.0%** | 16.7% -> **3.3%** (1 of 30) |
| openai | 2 | 1 | 1 | **50.0%** | 6.7% -> **3.3%** (1 of 30) |
| **Both** | **7** | **2** | **5** | **71.4%** | **3.3%** |

**P9 is confirmed, emphatically.** Nearly three quarters of this brand's mentions
are not this brand.

### 16.3 The false positives are not the failure P9 expected, and that is worse

P9 anticipated the ordinary-word failure: "slotenmaker" and "Nieuwegein" landing
next to each other in a heading or a sentence. **Not one of the five is that.**

Every false positive is a **different, real, competing business whose trade name
contains the client's name in full**:

- **De Slotenmaker Nieuwegein** - phone `0318-240299`, a Veenendaal number.
- **Slotenmaker Nieuwegein 24 uur** / **24uur** - phone `030 777 1264`, domain
  `slotenmakernieuwegein24uur.nl`.

The client's entire name is a **prefix or an infix of a rival's name**. Word
boundaries hold, longest-alias-first has nothing longer to prefer, and quote
folding is irrelevant. **No parser change fixes this**, exactly as P9 said, and the
reason is that nothing is being parsed wrongly: the string really is there and it
really is naming somebody else.

The commercial reading is sharper than the technical one. **A business that names
itself after its category and its city cannot be measured, because its competitors
can and do adopt the same name with a suffix.** That is a finding about the name,
not about the instrument, and it is the kind of thing a customer would want told
to them before they buy a report.

**There is a remedy inside v1, and it needs no code.** Add the colliding names to
the **competitor list**. `Slotenmaker Nieuwegein 24 uur` (29 characters) sorts
ahead of `Slotenmaker Nieuwegein` (22) under longest-alias-first, claims the
characters, and the subject then cannot match inside it - and the rival gets
counted as what it is. Same for `De Slotenmaker Nieuwegein`. **This is not applied
retrospectively**: run `8f076dc3` is immutable and its figures stand as measured,
with this document carrying the correction. Applying it would change the basis and
start a new series, which is a decision for the operator.

### 16.4 P13, P14, P15

Recognised brands per prompt, both targets, all 60 answers:

| Prompt | Place named | anthropic | openai |
|---|---|---|---|
| 1 | Nieuwegein | - | subject |
| 2 | Nieuwegein | subject x3 *(all false)* | subject *(false)* |
| 3 | IJsselstein | QuickBlue, Veenstra | - |
| 4 | regio Utrecht | QuickBlue | - |
| 5 | Nieuwegein | - | - |
| 6 | **no place at all** | **-** | **-** |
| 7 | omgeving Utrecht | - | LockTight |
| 8 | Nieuwegein | subject *(false)* | LockTight |
| 9 | Vianen | - | - |
| 10 | Nieuwegein | subject *(true)* | LockTight x2 |

- **P13 - holds, on both the raw and the verified reading.** Every subject mention,
  true or false, falls on a prompt naming **Nieuwegein**. Prompts 3, 4 and 9 -
  IJsselstein, regio Utrecht, Vianen - return the subject **zero** times on both
  providers. The verified sample is only 2 answers and cannot carry much weight by
  itself, but the raw distribution is 7 of 7 on Nieuwegein prompts, and the
  competitor distribution points the same way: anthropic surfaced QuickBlue and
  Veenstra **only** on the IJsselstein and Utrecht prompts, and the subject **only**
  on Nieuwegein ones. Different place, different businesses. The Blom mechanism
  reproduces in a city.
- **P14 - confirmed on openai, falsified on anthropic.** openai: LockTight **4**,
  QuickBlue **0**, Veenstra **0** - exactly as predicted. anthropic: LockTight
  **0**, QuickBlue **2**, Veenstra **1** - the reverse. The prediction is
  provider-dependent, which neither the prediction nor the mechanism behind it
  allowed for, and that is the more useful half of the result: **whatever the
  selection keys on, the two models do not key on the same thing.** A finding that
  held on one provider and reversed on the other cannot be sold as "how AI answers
  this question".
- **P12 gets its first data point, and it holds** - on anthropic. **Slotenmaker
  Veenstra, which publishes no address, was named once**, on the IJsselstein
  prompt. One occurrence is not a rate, but the sharpest question in the run now
  has a non-zero answer on one provider and a zero on the other.
- **P11 - confirmed.** Prompt 6, which names no place at all, returned **zero**
  recognised brands on **both** providers. It is the only prompt of which that is
  true on both.
- **P15 - technically holds and is uninformative.** See below.

### 16.5 The finding that qualifies every position figure in this phase

**Every subject mention in this entire phase - all 8 for Blom across two runs, all
7 for the locksmith, on both providers - is recorded as "1 of 1".**

The subject has been, in every single answer where he appeared, **the only
recognised brand in that answer**.

So "average position 1" does not mean "he was recommended first". It means **"he
was the only name on our list that the answer contained"**. In openai's Blom run 1,
prompt 1 repetition 3, the model wrote *"1. **Autobedrijf De Vos** - mijn eerste
keuze"* and put Blom second - and the instrument recorded position **1 of 1**,
because De Vos is not on the competitor list.

**This qualifies section 11.8.** "He is not losing the comparison, he is not in it"
survives - it rests on the mention rate, and the mention rate is sound. But the
supporting sentence "when he is named he is named first" **does not survive**, and
is withdrawn. What the data supports is only: *when he is named, no competitor we
were told to look for was named in the same answer.*

**And it is a presentation defect, which is what this phase is for.** The page
renders `Average position: 1 · coverage 100% · N=3`. A reader cannot tell "1 of 1"
from "1 of 8", and those are completely different claims - the first is nearly
vacuous, the second is a strong result. PLAN's criterion for this phase is that
**every figure on screens 1 to 3 is readable without ambiguity**, and this one is
not.

**Implemented 2026-08-26, the same day, while waiting for the interval.** A
read-time change that touches no basis and invalidates nothing:

- `aggregateRun` returns `AveragePosition` - `{ position, outOf }` - instead of a
  bare number, both means taken over the **same** answers so they cannot drift.
- The page renders `1 of 1 recognised` rather than `1`.
- C10 gains the clause; `SPEC.md` -> Definitions -> Position says a position is a
  rank among the brands the run was told to look for and not a rank against the
  field; `AGGREGATION_SEMANTICS_VERSION` goes **1 -> 2** with a log row, because
  the same stored rows now yield a different figure. The aggregation version is
  deliberately not an input to `basisHash`, so no series breaks.
- Rule 21's two halves are both present and both verified by deletion: strip the
  population from the renderer and **27 arithmetic tests stay green while the page
  test goes red**.

What this does **not** do is remove the blindness underneath it - it makes it
legible. See `PLAN.md` -> Engineering items -> "THE CAPABILITY GAP".

### 16.6 Cost

| Run | Calls | Searches / call | Cost | Per call |
|---|---|---|---|---|
| Blom 1 | 60 | 1.62 | $3.80 | 63,347 |
| Blom 2 | 60 | 1.77 | $4.04 | 67,332 |
| Locksmith 1 | 60 | 1.68 | $4.19 | 69,763 |
| **To date** | **180** | **1.69** | **$12.03** | **66,814** |

Remaining 144 calls - Blom run 3, locksmith run 2, Coolblue - project to **$9.62**,
phase total **$21.65** against the ~$21.17 the operator confirmed. Still tracking
the estimator: 66,814 observed against 72,402 projected, the gap still sitting on
the search count.

---

## 17. The interval, corrected - and a better design than either original

### 17.1 What was wrong

This session reported to the operator that Blom runs 1 and 2 were "about three
hours" apart. **They were 24 minutes apart** (`16:45:54Z` and `17:10:15Z`, read
from the stored rows). The operator's locksmith design was then written as "three
hours apart, matching Blom", so **that instruction was wrong on its own terms** -
not because the operator misjudged it, but because it was built on a number this
session reported incorrectly.

**The consequence for the headline result, stated plainly:** the mention Jaccard
of **1.000** in section 14.2 is a claim about a **24-minute** separation. When it
was first read it was described as a three-hour result and treated as a much
larger claim than it is. Twenty-four minutes is more than a determinism check and
far less than a statement about stability over time. It stands as measured; what
changes is how much weight it carries.

### 17.2 The replacement, which is better than both originals

Chasing 24 minutes for the locksmith was rejected - that window had passed - and
so was three hours, which would have confounded interval with market density, the
one thing P16 exists to isolate.

Instead: **locksmith run 2 runs tomorrow, roughly 24 hours after locksmith run 1,
alongside Blom run 3.** Locksmith run 1 completed `17:33Z`; Blom run 3 becomes
legitimate at `16:45:54Z`. Both fit in one session.

That yields **three comparisons instead of one confounded pair**:

| Comparison | Interval | What it isolates |
|---|---|---|
| Blom 1 ↔ 2 | ~24 minutes | *(already measured: mention J = 1.000)* |
| Blom 1 ↔ 3, 2 ↔ 3 | ~24 hours | **the interval effect**, within one market |
| Locksmith 1 ↔ 2 | ~24 hours | **the density effect**, at an interval matched to Blom's |

Blom-over-a-day against locksmith-over-a-day isolates **density**, because the
interval is held constant. Blom-over-24-minutes against Blom-over-a-day isolates
**the interval**, because the market is held constant. Neither was available under
the original design, and both matter to P16.

### 17.3 Tomorrow, in order

1. **Blom run 3** - not before `2026-08-27T16:45:54Z`, same basis `7c3fec1e65c4`,
   unchanged. Then all three Blom pairs plus the across-three figures, and the
   verdict against PLAN's stability criterion.
2. **Locksmith run 2** - same basis `3121891056ea`, unchanged. Then the locksmith
   pair, and P16.
3. **Coolblue** - the control, 24 calls, reported separately.

**The bases must not change before those runs.** In particular the name-collision
remedy in section 16.3 - adding the rival trade names as competitors - **is not
applied until after this phase closes**, because locksmith runs 1 and 2 must share
a basis or there is no churn comparison at all. When it is applied, the right way
to do it is to **measure the same brand before and after**: the size of the
correction is itself a demonstration worth having, and this run is the "before".

---

## 18. Blom run 3, and the three-run series

Run `06000d59-af7c-49f8-98c8-8578006571fd`, basis `7c3fec1e65c4`, queued
`2026-08-28T04:30:18Z` - **35 h 44 m** after run 1, not the 24 hours planned;
PLAN requires "at least a day later" and this exceeds it. Coverage 100 percent on
both targets, 60 of 60, $4.12.

| | anth 1 | anth 2 | anth 3 | oai 1 | oai 2 | oai 3 |
|---|---|---|---|---|---|---|
| Mention rate | 10% (3) | 10% (3) | **10% (3)** | 16.7% (5) | 13.3% (4) | **16.7% (5)** |
| Average position | 1 of 1 | 1 of 1 | **1 of 1** | 1 of 1 | 1 of 1 | **1 of 1.2** |

anthropic is identical across all three runs at cell level: 3 of 3 on the Enspijk
prompt, zero on the other nine, three times, a day and a half apart. openai's
prompt-1 cell went back to 3 of 3 and its second hit moved from prompt 8 to
prompts 9 and 10.

**The first `outOf` above 1 in the whole phase** is openai run 3's **1.2**: at
least one answer finally named a recognised competitor alongside the subject. The
figure added in section 16.5 is carrying information the day it shipped.

### 18.1 All three pairs

| Target | Pair | Interval | **Mention J** | **Citation J** |
|---|---|---|---|---|
| anthropic | 1 ↔ 2 | 24 min | **1.000** | 0.529 |
| anthropic | 1 ↔ 3 | 35.7 h | **1.000** | 0.508 |
| anthropic | 2 ↔ 3 | 35.3 h | **1.000** | 0.588 |
| openai | 1 ↔ 2 | 24 min | **1.000** | 0.525 |
| openai | 1 ↔ 3 | 35.7 h | **0.667** | 0.491 |
| openai | 2 ↔ 3 | 35.3 h | **0.667** | 0.566 |

Across all three runs:

| Target | Distinct brands named | Named in **every** run |
|---|---|---|
| anthropic | 3 | **3** |
| openai | **6** | **4** |

openai's change is one substitution: `Van Ooijen Automotive` present in runs 1 and
2, absent in run 3; `Autobedrijf De Linge` absent in 1 and 2, present in 3. Four
of six brands appear in all three.

**The interval effect, isolated** (market held constant): openai's mention set is
**perfectly stable within the hour and moves one member of five across a day and a
half**. anthropic's does not move at either interval. Citation churn is
**indifferent to the interval** - 0.49 to 0.59 at 24 minutes and at 35 hours
alike. So citations churn as fast over lunch as they do over two days, while
mentions only move over the longer gap.

### 18.2 PLAN's stability criterion: N=3 stands

The criterion is that the results must not differ by **more than one step of N**.
One step is one answer in thirty, 3.3 points.

- anthropic: 3, 3, 3 answers. **No movement at all.**
- openai: 5, 4, 5 answers. **Maximum movement one answer** - exactly one step, and
  the criterion is *more than* one step.

**N=3 stands. No change to `ARCHITECTURE.md` or `SPEC.md` is required**, which
resolves the open question in `SPEC.md` about whether N=3 is believable. Stated
with its limit: this establishes N=3 over two days in two markets, not over weeks.

---

## 19. Locksmith run 2, and P16

Run `fa7135cc-18ac-4adc-b0a1-7632e4c14c4d`, basis `3121891056ea`, queued
**35 h 4 m** after run 1 - matched to the Blom day-interval so that the two
markets are compared on one clock. Coverage 100 percent, 60 of 60, $4.47.

### 19.1 P16, and it splits

| Target | **Mention J** | **Citation J** | Distinct / in both |
|---|---|---|---|
| anthropic | **1.000** | 0.578 | 3 / 3 |
| openai | **0.667** | 0.500 | 3 / 2 |

**P16 is falsified on anthropic and confirmed on openai** - and the openai value
is *identical* to openai's own Blom day-pairs (0.667). Set against Blom:

| | Blom (thin) | Locksmith (dense) |
|---|---|---|
| anthropic, ~a day | 1.000 | **1.000** |
| openai, ~a day | 0.667 | **0.667** |

**The mention Jaccard did not move with market density at all. It moved with the
provider.** Both markets give 1.000 on one model and 0.667 on the other, at a
matched interval.

**So which of the two worlds are we in?** On this evidence, **neither cleanly, and
the honest answer is that the density experiment failed rather than returned a
result** - for exactly the reason recorded in section 15.3 before the run:
**v1 cannot see a business nobody typed in.** The locksmith's *measured* sets were
2 and 3 brands, **smaller** than Blom's 3 and 5, in a market that is unquestionably
denser - because U-Sloten, Locksmith.nl, Slotenmaker Holland, Albina Secure,
Slotenmakersnel and the rest are on no list and therefore do not exist to this
instrument. Density arrived as **invisibility**, not as a larger set.

What the evidence *does* support is the weaker and still useful claim:
**mention-set stability is a property of the provider, and citation churn is not.**
Anthropic reproduced its recognised set exactly in six of six comparisons across
two markets and two intervals. OpenAI reproduced it exactly within the hour and
swapped one member of a small set across a day, in both markets, identically.

### 19.2 P9 measured a second time, independently

All 8 subject mentions in run 2 read individually against the visible text.

| # | Target | What the answer says | Verdict |
|---|---|---|---|
| 1 | anth | "Slotenmaker Nieuwegein (24/7 Spoedservice) ... 9,5 op basis van 492 ervaringen" | **TRUE** |
| 2 | anth | "Slotenmaker Nieuwegein (slotenmaker-nieuwegein.nl) ... 9,5 ... 085 - 76…" | **TRUE** |
| 3 | anth | "Slotenmaker Nieuwegein 24 uur – 030 7771264" | false |
| 4 | anth | "Slotenmaker-nieuwegein.nl claimt gemiddeld een 9,5 ... 492 ervaringen" | **TRUE** |
| 5 | anth | "Slotenmaker Nieuwegein.com, **Slotenmaker-Nieuwegein.nl** en DeBesteSlotenmaker.nl" | **TRUE** |
| 6 | anth | a search suggestion, `"slotenmaker Nieuwegein 24 uur"`, plus `Slotenmaker-Nieuwegein.com` | false |
| 7 | anth | "Slotenmaker Nieuwegein (slotenmaker-nieuwegein.nl) De spoedservice is 24/7…" | **TRUE** |
| 8 | oai | "Slotenmaker Nieuwegein — 030 777 1264" | false |

| | Raw | True | False | **FP rate** | Reported | **Corrected** |
|---|---|---|---|---|---|---|
| anthropic | 7 | 5 | 2 | **28.6%** | 23.3% | **16.7%** |
| openai | 1 | 0 | 1 | **100%** | 3.3% | **0%** |
| **Run 2** | **8** | **5** | **3** | **37.5%** | | |
| *Run 1, for comparison* | *7* | *2* | *5* | *71.4%* | | |
| **Both runs** | **15** | **7** | **8** | **53.3%** | | |

**Two independent measurements: 71.4 percent and 37.5 percent.** They differ by a
factor of two, which is itself the finding: **the false-positive rate is not a
stable property of the brand, it is a property of which rival the model happened
to name that day.** A single measurement of it would have been reported with more
confidence than it deserves.

Its effect on the headline is not cosmetic. The instrument reports a mention rate
of **23.3 percent** for anthropic run 2 where the truth is **16.7**, and **3.3
percent** for openai where the truth is **0** - a client who is not named at all
in thirty answers would be shown a non-zero figure.

`Slotenmaker Nieuwegein.com` and `Slotenmaker-Nieuwegein.com` also appeared, so
the merge list of section 16.3 is longer than two names, and the `.com`/`.nl`
distinction now matters as well as the affix.

### 19.3 Cited but not named, both locksmith runs

| | own domain cited | subject named | **cited but NOT named** |
|---|---|---|---|
| Run 1 anthropic | 1 | 5 | **0** |
| Run 1 openai | 1 | 2 | **0** |
| Run 2 anthropic | 4 | 7 | **0** |
| Run 2 openai | 0 | 1 | **0** |

**Zero, reported as required.** Every answer that cited the client's own domain
also named the client in prose. The register row stays open across the whole
phase: **354 successful answers and not one instance.**

---

## 20. Coolblue - the healthy-render control

Run `b14c98d1-8465-4c47-adf6-479cb31745f3`, basis `5ebddccd3709`, 24 calls, **$1.38**.

| | anthropic | openai |
|---|---|---|
| Coverage | 100% (12/12) | 100% (12/12) |
| Mention rate | **100%** | 50% |
| Average position | **1.1 of 3.5 recognised** | **1 of 2.8 recognised** |
| Competitors | MediaMarkt 11, Bol 9, Expert 5, BCC 4, Amazon.nl 1 | Expert 5, MediaMarkt 4, Bol 2, Amazon.nl 0, BCC 0 |
| Cited domains | 25, `coolblue.nl` marked **(yours)** | 14, `coolblue.nl` marked **(yours)** |

This is the screen the product is meant to sell, and it is the **counterpart** to
section 21: a reader holding both can see that a 0 percent and a 100 percent are
the same kind of measurement, taken the same way, at the same coverage.

It is also where the new position figure finally earns itself: **1.1 of 3.5** is a
real ranking against real rivals, and it looks nothing like the "1 of 1" that Blom
and the locksmith produce. Under the old rendering both would have printed "1".

---

## 21. The absent screen - rendered, from real data, for the first time

Run `d96c4d73-1df8-453f-b4bf-ecf1bc7474ef`, basis **`df53c587c2b8`** - a new
basis. Five prompts, 30 calls, **$2.01**.

**Prompt selection rule, stated because it matters:** of the original ten, exclude
prompt 1 (names Enspijk, his own village) and prompts 8 and 9 (name a car brand
rather than a place), then take the five that name **the market town or the
region**. Prompts 4 and 6 were excluded because they name other villages.

**This is a demonstration of a rendering, not an independent discovery, and the
distinction is worth keeping.** All five prompts had already returned zero on both
providers in all three earlier runs, so a zero here was expected. What is real is
the underlying fact those runs established - on the questions naming the town he
serves, this garage is named nowhere - and what is new is that the instrument now
*shows* it.

**What the page renders:**

```
Status completed · N=3 · 5 prompts × 2 targets = 30 planned attempts
· basis df53c587c2b8 · figures computed under aggregation rules v2

anthropic · claude-sonnet-5
Coverage 100% (15 of 15 planned) · evidence
Mention rate: 0% · coverage 100% (15 of 15 planned) · N=3 · evidence
Average position: not applicable — the brand was not named in any successful
                  answer · coverage 100% (15 of 15 planned) · N=3 · evidence
Competitors: Vakgarage Van der Klij 11 · Autobedrijf Ruud den Hartog 1 · …
Cited sources: autofirst-rezo.nl 11 · vakgaragevanderklij.nl 7 · …
```

Both targets identical in shape. **Mention rate is a measured `0%` and not "no
data". Average position is `not applicable` with its reason, and never "no data".
Coverage is 100 percent. Every one of the ten cells reads `measured`, 0 of 3.
Nothing anywhere on the page is labelled unreliable. The cited-domain list is
full - 29 and 30 domains.**

That is the register row `PLAN.md` records as **never produced by reality**, and
it is now produced. It is the screen the first customer sees, and it says *"we
measured you and you are not there"* rather than *"we could not measure you"* -
the distinction the whole instrument exists to communicate.

### 21.1 C11 fired on real data, also for the first time

The company page now reads:

> **The measurement basis changed.** These 4 runs were measured on 2 different
> bases and are not one series: a figure from one group cannot be compared with a
> figure from another, because they did not ask the same questions of the same
> targets about the same names. Each group below is internally comparable.
>
> Series 1 of 2 · basis `7c3fec1e65c4` · 3 runs
> Series 2 of 2 · basis `df53c587c2b8` · 1 run

Two register rows closed by one $2 run.

**The ten-prompt list was restored immediately afterwards**, so the company's
stored basis matches section 2 of this document again. The reduced-basis run is
unaffected - it carries its own snapshot (C18, rule 10).

---

## 22. Phase 9 criteria, walked one by one

Seven runs, **354 successful answers, 0 failed**, $24.00.

| # | Criterion | Verdict |
|---|---|---|
| 1 | Every target at ≥80% coverage | **HOLDS.** 14 of 14 target-runs at **100%**, all `reliable` |
| 1b | A citation on every successful answer | **DOES NOT HOLD - 11 of 354 have none.** See 22.1 |
| 2 | Screens 1-3 readable without ambiguity | **HOLDS, after two fixes made during the phase.** See 22.2 |
| 3 | Every figure reaches its evidence in one step, on real answers | **HOLDS.** C17 was the working tool of this phase, not a checkbox |
| 4 | Link-text-domain false negative counted | **COUNTED, AND IT IS NOT ZERO: 1 in 354.** Comes back to the operator. See 22.3 |
| 5 | Reader-facing half of aggregation-semantics versioning | **NOW SETTLED.** See 22.4 |
| 6 | The absent-brand screen | **HOLDS.** Section 21 |
| 7 | "Cited but not named", reported even at zero | **HOLDS. Zero, in all 354 answers** |
| 8 | Citation churn and mention churn, separately | **HOLDS.** Sections 18.1, 19.1 |
| 9 | Per-call cost re-derived, with its spread, **per target** | **PARTLY. Run-level done, per-target impossible.** See 22.5 |
| 10 | Stability check; does N=3 stand | **HOLDS. N=3 stands.** Section 18.2 |
| 11 | Three brands: named, absent, ordinary word | **HOLDS.** Coolblue, Blom-reduced, Slotenmaker Nieuwegein |

### 22.1 The criterion that fails: 11 successful answers carry no citation

**All 11 are anthropic.** Every one is a real, complete, successful answer -
answered from the model's own knowledge without searching. They cluster on
questions that are **general knowledge rather than local recommendation**:

- *"Kan ik met mijn Mercedes ook naar een gewone garage…"* - **4 answers**, in all
  three Blom runs. The model explains EU block-exemption law and cites nothing.
- *"Ik zoek een goede laptop voor mijn studie…"* - **3 answers**, all of Coolblue's
  anthropic repetitions of that prompt.
- One each: the Betuwe maintenance question, the broken-key repair question, the
  next-day-television question.

**This closes a register row.** `PLAN.md` records "a successful answer carrying no
citations" as **never observed - 0 of the stored ok answers**, with the predicted
cause "a model answering from what it already knows without searching, plausible
on a question it considers settled". That is exactly what happened, and the
prediction was right down to the mechanism.

**It also means `verify:live` asserts something that is not always true.** The gate
fails if any successful answer lacks a citation. On a question the model considers
settled, a perfectly good answer has none - so the gate would fail for a reason
that is not a defect. It has not yet, because its single prompt happens to provoke
a search every time. **That is luck, not design**, and it is the same shape as the
defects CLAUDE.md rule 18 lists. Recommended, not done: the gate should assert
that citations are *stored when the provider returns them*, not that every answer
has one.

The criterion as written - "at least one citation on every successful answer" -
therefore **encoded an assumption about model behaviour rather than a requirement
of the system**, and real data has falsified it. The figures are unaffected: C16
counts domains per answer, and an answer that cited nothing contributes nothing.

### 22.2 Readability - two things were wrong and both were fixed inside the phase

- **Average position printed a bare number.** Every mention in the phase was "1 of
  1"; a reader could not tell that from "1 of 8". Fixed (section 16.5), C10 gained
  the clause, aggregation version 1 → 2. Coolblue's **1.1 of 3.5** is what the fix
  buys.
- **The aggregation version had no date.** Fixed in 22.4.

Everything else held on real screens: no percentage without coverage and N, no
failed cell reading as a zero, "no data" never confused with a measured zero, the
totals block present and legible on every run, and a changed basis saying so in
plain language (21.1).

### 22.3 The link-text-domain false negative is 1, not 0 - and it comes back to you

Counted per (answer, brand) over all 354 answers, at **brand** level: a brand
counts as missed only when **no** alias of it appears in the visible text and some
alias appears only as the visible text of a link to its own address.

**One occurrence.** Locksmith run 2, openai, the competitor `Slotenmaker-Expert`:

> `- **Slotenmaker Expert Nieuwegein:** **030 230 3078** — adverteert met 24/7`
> `spoedhulp. ([slotenmaker-expert.nl](https://slotenmaker-expert.nl/…))`

Two things are true at once and both matter:

1. **The link rule behaved as designed.** `slotenmaker-expert.nl` labels a link to
   itself, so it is an attribution and is dropped. The registered spelling
   `Slotenmaker-Expert` appears nowhere else.
2. **The business was named in prose anyway** - as *"Slotenmaker Expert
   Nieuwegein"*, with a **space instead of the hyphen**. The registered alias is
   hyphenated, and `patternSource` requires the literal hyphen, so the prose
   naming did not match either.

So the miss is **only partly** the link rule; the other half is spelling variance
between what the operator typed and what the model wrote. Both halves have the
same remedy as the name collision in section 16.3 - **register the variants** -
which makes this the second finding in one phase pointing at the same conclusion:
**for local-service brands, alias coverage is the operator's main lever on accuracy,
and the product should help rather than assume.**

Rate: **1 in 354 answers (0.28%)**, on a competitor rather than a subject. The
belief behind the rule - a model that recommends a business names it in prose -
survives as a good approximation and not as a certainty.

### 22.4 The reader-facing half of the aggregation version - settled

The criterion asked for the wording to be decided **against real figures**, and the
phase produced the real case: runs 1 and 2 were rendered under **v1** on
2026-08-26 and render under **v2** today, from identical stored rows.

**What was rejected:** a banner reading *"these figures were computed under a
different rule than the ones you saw before"*. **It cannot be made true** - nothing
records what any reader saw - and an unverifiable claim is precisely what this
product exists not to make.

**What shipped:** the version now travels with **the date it took effect**, on the
run page and the evidence page alike -

> `figures computed under aggregation rules v2, in effect since 2026-08-26`

A customer holding a September screenshot reads a different number and a different
date, and the Aggregation semantics log in `SPEC.md` says what changed between
them. It is the strongest statement the system can make **and check**.

### 22.5 The one criterion left open

**Per-call cost with its spread, per target.** The run-level half is done:

| Run | Per call | Searches/call |
|---|---|---|
| Coolblue | 57,614 | 1.42 |
| Blom 1 | 63,347 | 1.62 |
| Blom reduced | 66,840 | 1.67 |
| Blom 2 | 67,332 | 1.77 |
| Blom 3 | 68,647 | 1.78 |
| Locksmith 1 | 69,763 | 1.68 |
| Locksmith 2 | 74,483 | 1.82 |

**Weighted mean 67,803 micro-dollars per call** over 354 calls. Run-level spread
**57,614 to 74,483 - 29 percent**. **Correlation between a run's per-call cost and
its searches per call: 0.91**, confirming the driver `defaults.ts` hypothesised.
`FALLBACK_MICROS_PER_CALL` is updated 80,000 → **68,000** on this sample.

The **per-target** half **could not be computed**. `Answer.costMicros` is stored
per answer and `aggregateRun` totals it **per run**; nothing exposes a per-target
total, and the production database is not reachable from a developer machine.
*The fix is small and is not being done inside this phase:* give `TargetAggregate`
its own totals block beside the run-level one, which is one more `Figure`-shaped
field and an aggregation-version bump. **Recorded as open rather than quietly
substituted with the run-level number**, because per-target cost is what roadmap
stage 2 prices against and the two providers are not interchangeable.

---

## 23. Two judgements

### 23.1 Does the stability result belong in SPEC's Vision? **Yes - narrowly.**

**What the evidence supports.** In **all eight** target-pair comparisons made -
two markets, two providers, intervals of 24 minutes and ~35 hours - the set of
**businesses named** was at least as stable as the set of **sources cited**, and
usually far more so:

| | mention J | citation J |
|---|---|---|
| Every anthropic pair (5 of them) | **1.000** | 0.508 - 0.588 |
| openai, 24 minutes | **1.000** | 0.525 |
| openai, ~a day, both markets | **0.667** | 0.491 - 0.566 |

Citation churn sat in a **0.49-0.59 band in all eight**, indifferent to market,
provider and interval. Mention churn was 1.000 in six and 0.667 in two. **No
comparison had mentions churning faster than citations.**

That is the claim `PLAN.md` says the category has not published, and it is the
argument for differentiator 3: the published volatility figures measure how fast
**cited sources** change and are reported as though they measured visibility.
On this evidence they are **different quantities moving at different rates**.

**What it does not support, and must be written down beside it:**

- **Not a claim about weeks.** Two intervals, 24 minutes and ~35 hours. Nothing
  here says a set is stable over a month.
- **Not a claim about markets.** Two of them, and the density comparison
  **failed** (19.1) rather than returned a result.
- **Not independent of the instrument.** The measured sets were 2 to 5 brands
  drawn from lists of 7 to 10. A Jaccard over a small closed list is a much easier
  number to hold at 1.000 than one over an open field, and **v1 cannot see the
  open field** (`PLAN.md` -> capability gap). This caveat was committed in section
  15.3 *before* the runs and it is the one that most constrains the claim.
- **It is provider-shaped, not market-shaped.** Whatever this measures, one model
  did it perfectly and the other did not, identically in both markets.

*Proposed wording is in the SPEC edit accompanying this phase; the operator
approves or rejects it there.*

### 23.2 Is Phase 9 done? **Yes - with one criterion open and one finding referred.**

**Done**, because every capability the phase exists to re-verify has been
exercised against real output and three register rows that "reality had never
produced" were produced: the absent-brand screen, C11 firing on a real basis
change, and a successful answer with no citations. The instrument was also
**wrong twice and both were caught by using it** - the bare position figure and
the 71%/37.5% false-positive rate - which is the phase working as intended.

**Genuinely unfinished, and recorded rather than tidied away:**

1. **Per-target cost spread** (22.5) - needs a small aggregate change, named.
2. **The link-text-domain false negative is 1, not 0** (22.3) - PLAN says this
   comes back to the operator before Phase 10, and it does.
3. **`verify:live` asserts a citation on every successful answer** (22.1), which
   real data has now falsified. The gate is passing on luck.

None of the three blocks Ship. All three are worse if forgotten, which is why they
are here rather than in a paragraph that reads "phase complete".

/**
 * Every aggregate figure this product displays, computed at read time
 * (SPEC C9, C10, C12).
 *
 * **Nothing here is ever persisted.** Mention rate, average position, competitor
 * frequency, coverage and the run totals are derived from stored `Answer` rows on
 * every read. If you find yourself adding a column for one of them, stop
 * (CLAUDE.md rule 4).
 *
 * This module is pure. It takes rows and returns figures, so its fixtures are
 * literals rather than a database, and every rule below is checked against a shape
 * that can be written down exactly. What it deliberately does **not** do is
 * display anything - which is the other half of C10 and is checked at the
 * presentation seam instead (CLAUDE.md rule 18).
 *
 * ## The two denominators, which are not the same denominator
 *
 * **Coverage** is `successes / planned`, and `planned` is prompts x N for that one
 * target - the plan, never the number of stored rows (CLAUDE.md rule 3). Using
 * `ok / (ok + failed)` would drift with every interruption: a run abandoned after a
 * tenth of its work reports full coverage on the handful of calls it managed, the
 * most flattering possible reading of the worst possible run.
 *
 * **Mention rate** is `answers naming the subject / successful answers`. A failed
 * attempt is excluded from that numerator and that denominator both, because it is
 * not an answer in which the brand happened to be absent (CLAUDE.md rule 1).
 *
 * So the two figures answer different questions - "how much of the plan came
 * back?" and "of what came back, how often was the brand named?" - and that is
 * exactly why C10 requires them to be displayed together. Either alone is
 * misleading.
 */
import type { Provider } from '@prisma/client'
import { formatMicrosAsUsd } from './money.ts'

/**
 * The version of this system's **aggregation semantics** - how stored rows are
 * summarised into the figures a reader sees.
 *
 * ## The boundary this number governs
 *
 * **Everything `aggregateRun` in this file returns, and every rule that produces
 * it**: coverage's numerator and denominator, mention rate's denominator, the
 * population average position is taken over, the unit competitor frequency and
 * cited domains are counted in, the domain rule in `citedDomainOf`, and every
 * ordering and tie-break. If a change to this file can make the same stored rows
 * yield a different figure, it is a bump.
 *
 * **Outside the boundary:** how a figure is formatted for display - rounding, the
 * words around it, the layout in `figure.tsx`. Those change what a sentence looks
 * like, not what the number is.
 *
 * ## Why this is not a sixth input to `basisHash`
 *
 * Because folding it in would be **actively wrong**, not merely inelegant.
 * `basisHash` is computed when a run is created and never recomputed, so a bump
 * would give runs created before and after it different hashes - and C11 would
 * then refuse to draw as one series two runs that are both rendered under today's
 * aggregation rule today, and are therefore perfectly comparable. The guard would
 * break the comparison it exists to protect, on every historical run.
 *
 * The principle underneath: **stamp a version where the thing it governs is
 * frozen.** Parse semantics freeze when an answer is parsed, so
 * `MEASUREMENT_SEMANTICS_VERSION` lives on the run. Aggregation semantics never
 * freeze - every read re-applies them - so this one lives on the *rendering*, and
 * is stated once per rendered run rather than once per figure.
 *
 * The reader who needs it most is holding a screenshot from three months ago, and
 * a screenshot carries what was on screen. That is why it is printed on the page
 * and not only returned in the payload.
 *
 * Bumping it requires a row in `SPEC.md` -> Definitions -> Aggregation semantics
 * log. The number alone is uninterpretable.
 */
export const AGGREGATION_SEMANTICS_VERSION = 2

/** How much of one target's plan actually came back. */
export interface Coverage {
  /** Answers with status `ok` for this target. */
  readonly successes: number
  /** Prompts x N for this target. The plan, never the stored row count. */
  readonly planned: number
  /** `successes / planned`, or 0 when nothing was planned. */
  readonly ratio: number
  /** `ratio >= COVERAGE_THRESHOLD`. False means the figures are not a measurement. */
  readonly reliable: boolean
}

/**
 * Why a figure has no value. The distinction is the whole point: an absence of
 * data and a measured absence are different findings and must never render alike.
 */
export type FigureResult<T> =
  /** There is a value, and it came from answers that succeeded. */
  | { readonly kind: 'measured'; readonly value: T }
  /** Nothing succeeded here. "No data" - never a zero (SPEC C10). */
  | { readonly kind: 'no-data' }
  /**
   * Measured, but this particular figure has no value. Average position when the
   * brand was never named is the case: the measurement happened and the answer is
   * "nowhere", which is not the same as not knowing.
   */
  | { readonly kind: 'not-applicable'; readonly why: string }

/**
 * A figure that cannot be handled without its coverage and the run's N.
 *
 * The nesting is the enforcement. C10 says coverage and N travel with every
 * figure; making `value` reachable only through this wrapper means a renderer
 * physically cannot obtain the number without having both in hand. It does not
 * make a renderer *print* them - that is a presentation obligation and is checked
 * at the page, not here - but it removes the accident.
 */
export interface Figure<T> {
  readonly result: FigureResult<T>
  readonly coverage: Coverage
  /** The run's N. Displayed beside every figure, per C10. */
  readonly repetitions: number
}

/**
 * An average position **and the population it was taken over**.
 *
 * The two travel together for the same reason coverage and N travel with every
 * figure (C10, CLAUDE.md rule 21), and this pairing was added because the bare
 * number was actively misleading on real data rather than merely thin.
 *
 * **Phase 9, 2026-08-26.** Every subject mention in that phase - fifteen of them,
 * two brands, two providers - was position **1 of 1**: the subject was the only
 * *recognised* brand in every answer that named it. Rendered as "1", that reads as
 * "recommended first". It does not mean that. In one openai answer the model wrote
 * "1. Autobedrijf De Vos - mijn eerste keuze" and put the subject **second**, and
 * this figure still said 1, because De Vos was not on the competitor list.
 *
 * `position` alone is therefore not a rank against rivals; it is a rank among the
 * brands this run was told to look for. `outOf` is what lets a reader tell "1 of
 * 1", which is nearly vacuous, from "1 of 8", which is a strong result. Both are
 * means over the same answers - the ones that named the subject - so both can be
 * fractional.
 *
 * The deeper limitation this exposes is **not** fixed here and is not fixable at
 * read time: v1 cannot see a business that is on neither the target nor the
 * competitor list (`PLAN.md` -> Engineering items). `outOf` makes the blindness
 * legible rather than removing it.
 */
export interface AveragePosition {
  /** Mean 1-based position of the subject among the recognised brands. */
  readonly position: number
  /** Mean number of recognised brands in those same answers. Never less than `position`. */
  readonly outOf: number
}

export interface DomainCount {
  /** The cited domain, as `citedDomainOf` defines it. */
  readonly domain: string
  /** In how many successful answers this domain was cited. Never a citation count. */
  readonly answers: number
  /**
   * Whether this domain belongs to the client's own site (Phase 13).
   *
   * **An annotation over a stored measurement, not part of one.** It is computed
   * against the website recorded on the company **now**, not one snapshotted when
   * the questions were asked - there is no such snapshot, deliberately. So an old
   * run's marking moves if a client changes their domain, and the page has to say
   * what it is marked against or a customer reasonably concludes the measurement
   * moved. Nothing else about C16 changes: the counts and the ordering are
   * identical whether a website is recorded or not.
   *
   * `false` where no website is recorded, which the page must never render as
   * "none of these are yours" - the same rule as failed-is-not-absent, one level
   * up.
   */
  readonly isOwn: boolean
}

export interface CompetitorCount {
  readonly brand: string
  /** In how many successful answers this competitor appeared. */
  readonly answers: number
}

/** One prompt against one target: the cell a reader looks at. */
export interface PromptCell {
  readonly runPromptId: string
  /** Planned attempts for this cell, which is N. */
  readonly planned: number
  readonly succeeded: number
  /** Successful answers naming the subject brand. */
  readonly mentioned: number
  /**
   * `no-data` when every attempt for this prompt and target failed. C10 forbids
   * rendering that as "not mentioned", and the two are indistinguishable once this
   * is collapsed to a number, which is why it is a state and not a count.
   */
  readonly state: 'measured' | 'no-data'
}

export interface TargetAggregate {
  readonly targetId: string
  readonly provider: Provider
  readonly modelId: string
  readonly coverage: Coverage
  /** Successful answers naming the subject, over successful answers. 0..1. */
  readonly mentionRate: Figure<number>
  /** Mean 1-based position of the subject, with the population it was taken over. */
  readonly averagePosition: Figure<AveragePosition>
  /** Every competitor in the run's snapshot, with its answer count. */
  readonly competitors: Figure<readonly CompetitorCount[]>
  /** C16. Which sources this target drew on, and in how many answers. */
  readonly citedDomains: Figure<readonly DomainCount[]>
  readonly cells: readonly PromptCell[]
}

/**
 * C12. Totals over the run's successful answers.
 *
 * Failed answers carry no usage and no cost - `persistAttempt` stores neither - so
 * there is nothing of theirs to include or exclude. Recorded here so the next
 * reader does not have to work out whether rule 1 was applied: it does not arise.
 */
export interface RunTotals {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly searchCount: number
  /** Integer micro-dollars. Never a float, never a Number (CLAUDE.md rule 5). */
  readonly costMicros: bigint
  /** How many successful answers these came from. */
  readonly answers: number
  /**
   * Prompts x targets x N for the whole run.
   *
   * C10 requires coverage beside every figure, and a run total has no single
   * target whose coverage to name - which would have been a quiet way for the one
   * figure on the page without a qualifier to be a money figure. This is the
   * run-level equivalent, and it is the qualifier that matters: the cost of a run
   * that lost half its attempts is genuinely lower than a complete one's, so a
   * total presented bare invites exactly the wrong comparison between two runs.
   */
  readonly plannedAttempts: number
}

export interface RunAggregate {
  /** The aggregation rules these figures were computed under. */
  readonly aggregationVersion: number
  readonly repetitions: number
  readonly targets: readonly TargetAggregate[]
  readonly totals: RunTotals
}

/** The minimum an answer must carry to be aggregated. Raw text is not needed. */
export interface AggregatableAnswer {
  readonly runTargetId: string
  readonly runPromptId: string
  readonly status: 'ok' | 'failed'
  readonly inputTokens: number | null
  readonly outputTokens: number | null
  readonly searchCount: number | null
  readonly costMicros: bigint | null
  readonly mentions: readonly {
    readonly brand: string
    readonly isSubject: boolean
    readonly position: number
    /** How many recognised brands were found in that one answer. */
    readonly totalRecognised: number
  }[]
  /** Stored citation rows. Only the URL is needed; C16 counts answers, not rows. */
  readonly citations: readonly { readonly url: string }[]
}

export interface AggregateInput {
  readonly repetitions: number
  readonly coverageThreshold: number
  readonly targets: readonly { readonly id: string; readonly provider: Provider; readonly modelId: string }[]
  /** In run order. Their count is the coverage denominator's first factor. */
  readonly promptIds: readonly string[]
  /** The run's competitor snapshot, so a competitor that never appeared still shows. */
  readonly competitors: readonly string[]
  /**
   * The client's own website as recorded on the company **today**, or null.
   *
   * Not from the run snapshot, because there is none: marking is presentation over
   * a stored measurement rather than part of it. See `DomainCount.isOwn`.
   */
  readonly ownWebsite: string | null
  readonly answers: readonly AggregatableAnswer[]
}

/**
 * The cited domain of one stored citation URL (SPEC -> Definitions -> Cited
 * domain): the host, lower-cased, with a trailing dot and a leading `www.`
 * removed. Returns null for anything that is not an http(s) URL, which C7 already
 * guarantees cannot be stored.
 *
 * **A subdomain is its own source.** `www.acme.nl` groups with `acme.nl` and
 * `blog.acme.nl` does not, which is the same choice made in `visible-text.ts` for
 * the same reason: `www.` is a convention for addressing one site, while a
 * subdomain is a different host that may be a different publication entirely.
 * `en.wikipedia.org` and `nl.wikipedia.org` are two sources here, and that is the
 * intended reading.
 *
 * **This rule needs no public suffix list, and that is a consequence of the choice
 * above rather than luck.** Nothing here depends on where the registrable domain
 * begins: `acme.co.uk` and `blog.acme.co.uk` are simply two different hosts, so
 * the multi-label suffixes that defeat a naive last-two-labels rule never arise.
 * A public suffix list becomes necessary the moment some capability needs to know
 * that two hosts belong to the same **organisation** - which is what marking the
 * client's own site wants - and not when a new country is added. That trigger is
 * recorded in `PLAN.md` -> Engineering items.
 *
 * Where the stated rule is wrong and is accepted as wrong: one business serving
 * from `acme.nl` and `shop.acme.nl` is counted as two sources.
 */
export function citedDomainOf(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

  const host = parsed.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
  return host === '' ? null : host
}

/**
 * The host of the client's own website, normalised the same way a cited domain is,
 * or null when none is recorded or the value yields no host.
 */
export function ownHostOf(website: string | null | undefined): string | null {
  if (website === null || website === undefined) return null
  const trimmed = website.trim()
  if (trimmed === '') return null
  return citedDomainOf(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
}

/**
 * Whether a cited domain belongs to the client's own site.
 *
 * **No public suffix list, and none is needed here** - which is a property of the
 * question rather than luck. Grouping hosts by organisation in general requires
 * knowing where the registrable boundary sits; this capability does not have to
 * infer it, because **the operator supplies the answer**. The question is not
 * "what is the registrable domain of shop.acme.co.uk" but "does this cited host
 * equal, or end with a dot plus, the host the client gave us".
 *
 * Two further reasons the dependency was refused rather than merely unnecessary.
 * A public suffix list is data that ages, and this is a read-time rule - so a
 * routine dependency update would silently change what counts as one business,
 * which is exactly the drift `AGGREGATION_SEMANTICS_VERSION` exists to catch and
 * exactly the kind of change nobody thinks to version. And it would have arrived
 * without any capability needing its general case.
 *
 * **The limitation, stated rather than discovered:** a client who records
 * `blog.acme.nl` as their website will not have `acme.nl` marked. The comparison
 * is one-way by design - a subdomain of what they gave us is theirs, a parent of
 * it is a different host we were not told about. That is an input problem with an
 * obvious remedy: record the apex.
 *
 * **Scope:** only the client's own hosts are marked. Nothing here changes how C16
 * counts anybody else's - `mediamarkt.nl` and `shop.mediamarkt.nl` remain two
 * rows, because nothing has told us they are one business.
 */
export function isOwnDomain(domain: string, ownHost: string | null): boolean {
  if (ownHost === null) return false
  return domain === ownHost || domain.endsWith(`.${ownHost}`)
}

/**
 * Orders two strings by UTF-16 code unit.
 *
 * Deliberately **not** `localeCompare`, which depends on the runtime's ICU data
 * and default locale and can therefore order the same two strings differently on
 * a developer's machine and in the deployed container. A product whose argument is
 * reproducibility cannot have a table that reorders between reads, and a tie-break
 * that varies by host is exactly that. Corrected here for competitors too, which
 * used `localeCompare` from Phase 7 until 2026-08-25.
 */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function coverageFor(successes: number, planned: number, threshold: number): Coverage {
  const ratio = planned === 0 ? 0 : successes / planned
  return { successes, planned, ratio, reliable: planned > 0 && ratio >= threshold }
}

export function aggregateRun(input: AggregateInput): RunAggregate {
  const { repetitions, coverageThreshold, targets, promptIds, competitors, answers } = input
  const planned = promptIds.length * repetitions
  const ownHost = ownHostOf(input.ownWebsite)

  const targetAggregates = targets.map((target) => {
    const mine = answers.filter((answer) => answer.runTargetId === target.id)
    const ok = mine.filter((answer) => answer.status === 'ok')
    const coverage = coverageFor(ok.length, planned, coverageThreshold)

    const withSubject = ok.filter((answer) => answer.mentions.some((m) => m.isSubject))
    // Position and population are read from the **same** mention row, so the two
    // means are always taken over the same answers and cannot drift apart.
    const placings = withSubject
      .map((answer) => answer.mentions.find((m) => m.isSubject))
      .filter((mention): mention is NonNullable<typeof mention> => mention !== undefined)

    const wrap = <T>(result: FigureResult<T>): Figure<T> => ({ result, coverage, repetitions })

    // Order: most-cited first, ties by brand ascending, so the order is
    // reproducible between two reads of the same data.
    const counts: CompetitorCount[] = competitors
      .map((brand) => ({
        brand,
        answers: ok.filter((answer) =>
          answer.mentions.some((m) => !m.isSubject && m.brand === brand),
        ).length,
      }))
      .sort((a, b) => b.answers - a.answers || byCodeUnit(a.brand, b.brand))

    // C16. Counted per **answer**, never per citation row: an answer citing three
    // pages of one site has drawn on that site once, and counting rows would let a
    // heavily footnoting model inflate its favourite source. A `failed` answer
    // contributes nothing, because `ok` is what this iterates.
    const domainAnswerCounts = new Map<string, number>()
    for (const answer of ok) {
      const seen = new Set<string>()
      for (const citation of answer.citations) {
        const domain = citedDomainOf(citation.url)
        if (domain !== null) seen.add(domain)
      }
      for (const domain of seen) {
        domainAnswerCounts.set(domain, (domainAnswerCounts.get(domain) ?? 0) + 1)
      }
    }

    const domains: DomainCount[] = [...domainAnswerCounts.entries()]
      .map(([domain, answers]) => ({ domain, answers, isOwn: isOwnDomain(domain, ownHost) }))
      // The marking never touches the order: it is an annotation, and a client's
      // own site does not get promoted up a frequency table for being theirs.
      .sort((a, b) => b.answers - a.answers || byCodeUnit(a.domain, b.domain))

    return {
      targetId: target.id,
      provider: target.provider,
      modelId: target.modelId,
      coverage,
      mentionRate: wrap<number>(
        ok.length === 0
          ? { kind: 'no-data' }
          : { kind: 'measured', value: withSubject.length / ok.length },
      ),
      averagePosition: wrap<AveragePosition>(
        ok.length === 0
          ? { kind: 'no-data' }
          : placings.length === 0
            ? // Measured, and the answer is that it was never named. Reporting 0
              // here would read as "position zero", which is better than every
              // rival rather than absent from all of them.
              { kind: 'not-applicable', why: 'the brand was not named in any successful answer' }
            : {
                kind: 'measured',
                value: {
                  position:
                    placings.reduce((sum, m) => sum + m.position, 0) / placings.length,
                  outOf:
                    placings.reduce((sum, m) => sum + m.totalRecognised, 0) / placings.length,
                },
              },
      ),
      competitors: wrap<readonly CompetitorCount[]>(
        // An empty list here means "measured, and no competitor appeared", which is
        // an observation. It is not the same as no-data and must not render alike.
        ok.length === 0 ? { kind: 'no-data' } : { kind: 'measured', value: counts },
      ),
      citedDomains: wrap<readonly DomainCount[]>(
        // The same distinction, and C16 names it explicitly: with no successful
        // answer there is nothing to have cited, which is "no data"; with
        // successful answers that carry no citations the model genuinely cited
        // nothing, which is an observation and renders as an empty list.
        ok.length === 0 ? { kind: 'no-data' } : { kind: 'measured', value: domains },
      ),
      cells: promptIds.map((runPromptId) => {
        const cell = mine.filter((answer) => answer.runPromptId === runPromptId)
        const succeeded = cell.filter((answer) => answer.status === 'ok')
        return {
          runPromptId,
          planned: repetitions,
          succeeded: succeeded.length,
          mentioned: succeeded.filter((answer) => answer.mentions.some((m) => m.isSubject)).length,
          state: succeeded.length === 0 ? ('no-data' as const) : ('measured' as const),
        }
      }),
    }
  })

  const ok = answers.filter((answer) => answer.status === 'ok')
  const totals: RunTotals = {
    inputTokens: ok.reduce((sum, a) => sum + (a.inputTokens ?? 0), 0),
    outputTokens: ok.reduce((sum, a) => sum + (a.outputTokens ?? 0), 0),
    searchCount: ok.reduce((sum, a) => sum + (a.searchCount ?? 0), 0),
    costMicros: ok.reduce<bigint>((sum, a) => sum + (a.costMicros ?? 0n), 0n),
    answers: ok.length,
    plannedAttempts: planned * targets.length,
  }

  return {
    aggregationVersion: AGGREGATION_SEMANTICS_VERSION,
    repetitions,
    targets: targetAggregates,
    totals,
  }
}

/**
 * `RunTotals` as it crosses an HTTP boundary.
 *
 * **`JSON.stringify` throws on a BigInt** - `TypeError: Do not know how to
 * serialize a BigInt` - and TypeScript does not catch it, because `JSON.stringify`
 * accepts `unknown`. Phase 5 left a test watching for the day a route first
 * carried `costMicros`; on 2026-08-25 it went red the moment C12 added totals
 * here, which is the only reason this was a five-minute problem.
 *
 * **The wire representation is a decimal string**, and that is a deliberate choice
 * over the two alternatives:
 *
 *   - A `Number` would work today. A 300-call run totals about 24,000,000
 *     micro-dollars and `Number.MAX_SAFE_INTEGER` is 9,007,199,254,740,991, so
 *     nothing would go wrong for a very long time - and that is exactly the
 *     objection. It fails silently, at a size nobody is watching for, and the
 *     symptom is a wrong invoice rather than an error. CLAUDE.md rule 5 says money
 *     is integer micro-dollars with no float anywhere near it; a JSON number is a
 *     double.
 *   - A `{ hi, lo }` pair or a serialised BigInt marker is exact but invents a
 *     format every consumer must learn.
 *
 * A decimal string is exact at any magnitude, is JSON-native, and round-trips
 * through `BigInt(value)`. `costUsd` is supplied alongside it so that a client
 * displaying money never needs to compute anything - the one thing a string
 * representation makes easy to get wrong is arithmetic, and there is now no reason
 * for a client to attempt any.
 */
export interface RunTotalsWire {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly searchCount: number
  /** Exact integer micro-dollars, as a decimal string. Parse with `BigInt`. */
  readonly costMicros: string
  /** Display only - never parse this back into arithmetic. */
  readonly costUsd: string
  readonly answers: number
  readonly plannedAttempts: number
}

export function totalsForWire(totals: RunTotals): RunTotalsWire {
  return {
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    searchCount: totals.searchCount,
    costMicros: totals.costMicros.toString(),
    costUsd: formatMicrosAsUsd(totals.costMicros),
    answers: totals.answers,
    plannedAttempts: totals.plannedAttempts,
  }
}

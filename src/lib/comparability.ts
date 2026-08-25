/**
 * The comparability guard (SPEC C11).
 *
 * ## What this is observably guarding, today
 *
 * C11 says two runs that differ in `basisHash` must not be presented as one
 * series. It is worth being concrete about where a series exists at all, because a
 * capability whose behaviour nothing can observe is what C18 turned out to be a
 * week after it was written.
 *
 * There is no trend chart - that is deferred until Phase 9's stability check
 * establishes an N - and the run page shows one run at a time. **The surface is
 * the company's run list.** It shows every run of one company in time order with
 * its basis, and a reader looking at four rows descending by date is reading a
 * series whether or not anything calls it one. Without this module they are four
 * undifferentiated rows; with it they are grouped, and a list spanning more than
 * one basis says so.
 *
 * That is the smallest real thing, and it is real: a reader and an API client can
 * both observe something they could not observe before. When scheduled runs arrive
 * at product stage 3 and a chart is drawn over them, it is drawn over these
 * groups.
 *
 * ## Grouping, not adjacency
 *
 * Runs are grouped by `basisHash`, not by being next to each other. A company that
 * measured basis A, then B, then A again has **two** series, and the two A runs
 * are one of them - they are comparable to each other, and the B run in between
 * does not change what they measured. Ordering by adjacency would split them and
 * refuse a comparison that is valid.
 */

export interface ComparableRun {
  readonly id: string
  readonly basisHash: string
  readonly createdAt: Date
}

export interface Series<T extends ComparableRun> {
  readonly basisHash: string
  /** 1-based, by the series' earliest run. Stable between reads. */
  readonly ordinal: number
  /** Chronological, oldest first. */
  readonly runs: readonly T[]
}

export interface ComparabilityView<T extends ComparableRun> {
  readonly series: readonly Series<T>[]
  /**
   * True when this company's runs span more than one basis, and therefore cannot
   * be read as a single line. This is the flag C11's "SHALL state" hangs off.
   */
  readonly basisChanged: boolean
}

function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Groups a company's runs into the series they may legitimately be compared
 * within.
 *
 * Ordering is fully determined - series by their earliest run, runs within a
 * series by `createdAt`, ties broken by id - so that two reads of the same data
 * produce the same page. The same reason cited domains are ordered by code unit:
 * a product arguing for reproducibility cannot have a list that reshuffles.
 */
export function groupIntoSeries<T extends ComparableRun>(
  runs: readonly T[],
): ComparabilityView<T> {
  const byBasis = new Map<string, T[]>()
  for (const run of runs) {
    const existing = byBasis.get(run.basisHash)
    if (existing) existing.push(run)
    else byBasis.set(run.basisHash, [run])
  }

  const ordered = [...byBasis.entries()]
    .map(([basisHash, group]) => ({
      basisHash,
      runs: [...group].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || byCodeUnit(a.id, b.id),
      ),
    }))
    .sort(
      (a, b) =>
        a.runs[0]!.createdAt.getTime() - b.runs[0]!.createdAt.getTime() ||
        byCodeUnit(a.runs[0]!.id, b.runs[0]!.id),
    )
    .map((series, index) => ({ ...series, ordinal: index + 1 }))

  return { series: ordered, basisChanged: ordered.length > 1 }
}

/**
 * Whether two runs may be presented as one series.
 *
 * It compares `basisHash` and nothing else, and that is the whole point:
 *
 *   - the **brand name** is snapshotted but not hashed, so renaming a company does
 *     not break a series - renaming does not change what was measured;
 *   - **N** is not hashed either, and is displayed beside every figure instead;
 *   - the **aggregation semantics version** is not hashed, deliberately. Both runs
 *     are rendered under today's aggregation rule whenever they are read, so they
 *     remain comparable to each other; making this react to it would break the
 *     comparison C11 exists to protect. `tests/comparability.test.ts` holds that.
 */
export function comparable(a: ComparableRun, b: ComparableRun): boolean {
  return a.basisHash === b.basisHash
}

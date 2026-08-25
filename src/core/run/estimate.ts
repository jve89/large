/**
 * What one provider call currently costs, measured rather than assumed.
 *
 * This exists so that no dollar figure shown to an operator is a constant. The
 * per-call average moved from 71,540 to 80,343 micro-dollars between two
 * measurements - eleven percent, on samples of six and then fourteen answers - and
 * it will keep moving, because cost is driven by how many web searches a model
 * runs and that varies with the question. A hard-coded figure would go stale in
 * the direction that matters: a low one understates the exposure.
 *
 * The **bound** is on the call count, which is exact and can be refused before the
 * run row exists. This module only supplies the dollars beside it, and the caller
 * must say that they are an estimate.
 */
import type { PrismaClient } from '@prisma/client'
import { FALLBACK_MICROS_PER_CALL } from '../../lib/defaults.ts'

/** Enough rows to smooth a single unusual answer, few enough to stay a recent figure. */
export const ESTIMATE_SAMPLE_SIZE = 200

export interface CallCostEstimate {
  /** Mean cost of one call, in integer micro-dollars. */
  readonly micros: bigint
  /** How many stored answers it was computed from. Zero means the fallback. */
  readonly sampleSize: number
}

/** Just the `answer` delegate, so a transaction client satisfies this too. */
type AnswerReader = Pick<PrismaClient, 'answer'>

/**
 * The mean cost of the most recent successful answers.
 *
 * Only `ok` answers count. A `failed` row has no usage and no cost, and averaging
 * zeros into this would understate every estimate by however badly the last run
 * went (CLAUDE.md rule 1).
 *
 * With nothing stored - a fresh install, or a first run - it falls back to the
 * dated constant and says so through `sampleSize: 0`, so a caller can tell a
 * measurement from a guess.
 */
export async function estimateMicrosPerCall(client: AnswerReader): Promise<CallCostEstimate> {
  const rows = await client.answer.findMany({
    where: { status: 'ok', costMicros: { not: null } },
    select: { costMicros: true },
    orderBy: { createdAt: 'desc' },
    take: ESTIMATE_SAMPLE_SIZE,
  })

  const costs = rows.map((row) => row.costMicros).filter((cost): cost is bigint => cost !== null)
  if (costs.length === 0) {
    return { micros: FALLBACK_MICROS_PER_CALL, sampleSize: 0 }
  }

  const total = costs.reduce((sum, cost) => sum + cost, 0n)
  return { micros: total / BigInt(costs.length), sampleSize: costs.length }
}

/** How the estimate should be described wherever it is shown. Never "costs". */
export function describeEstimate(estimate: CallCostEstimate): string {
  return estimate.sampleSize === 0
    ? 'a provisional per-call figure, because no answer has been stored yet'
    : `the mean of the ${estimate.sampleSize} most recent stored answers`
}

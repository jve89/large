/**
 * The only place a per-token or per-search price appears in this codebase
 * (CLAUDE.md rule 12). Every row carries the date it was read, because pricing
 * rots.
 *
 * Adapters compute `costMicros` from their usage figures and this table;
 * lib/money.ts provides the integer arithmetic and nothing else. Never inline a
 * price in an adapter — it would then be scattered and silently rot in both.
 *
 * Money is integer micro-dollars. Prices are expressed as micro-dollars per
 * million tokens, and micro-dollars per web search. $1 = 1,000,000 micro-dollars,
 * so "$2 per million tokens" is 2,000,000 micro-dollars per million tokens.
 */
import type { Provider } from '@prisma/client'
import { costOfTokens, costOfUnits } from '../../lib/money.ts'
import type { ProviderUsage, Target } from './types.ts'

/**
 * Some providers charge a premium above a context threshold, for the **whole**
 * request rather than for the excess. Multipliers are integer percentages so that
 * no float ever enters a cost calculation.
 */
export interface LongContextTier {
  readonly thresholdInputTokens: number
  readonly inputMultiplierPercent: number
  readonly outputMultiplierPercent: number
}

export interface ModelPrice {
  readonly provider: Provider
  readonly modelId: string
  readonly inputMicrosPerMillionTokens: bigint
  readonly outputMicrosPerMillionTokens: bigint
  /**
   * Web search is billed separately per search at both providers and can be a
   * material share of run cost, so it is priced explicitly rather than folded into
   * the token rate.
   */
  readonly searchMicrosPerSearch: bigint
  readonly longContext?: LongContextTier
  /** ISO date the figures were read from the provider's own pricing page. */
  readonly readOn: string
  readonly source: string
}

/**
 * Read from each provider's own pricing documentation on 2026-08-23; re-check,
 * don't trust.
 *
 * Note for the record: the interview estimated web search at $25-30 per thousand
 * searches. Both providers actually charge **$10 per thousand**, so a run costs
 * materially less than ARCHITECTURE.md's original estimate assumed.
 */
export const PRICES: readonly ModelPrice[] = [
  {
    provider: 'anthropic',
    modelId: 'claude-sonnet-5',
    // $2 / MTok input, $10 / MTok output.
    inputMicrosPerMillionTokens: 2_000_000n,
    outputMicrosPerMillionTokens: 10_000_000n,
    // $10 per 1,000 searches. An errored search is not billed.
    searchMicrosPerSearch: 10_000n,
    // Claude 4.6 and later include the full 1M context window at standard pricing:
    // a 900k-token request is billed at the same rate as a 9k-token one.
    readOn: '2026-08-23',
    source: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  {
    provider: 'openai',
    modelId: 'gpt-5.6-terra',
    // $2 / MTok input, $12 / MTok output at short context.
    inputMicrosPerMillionTokens: 2_000_000n,
    outputMicrosPerMillionTokens: 12_000_000n,
    // $10 per 1,000 web search calls.
    searchMicrosPerSearch: 10_000n,
    // Prompts over 272k input tokens are priced at 2x input and 1.5x output for
    // the full request. Recording a single rate would under-report those runs.
    longContext: {
      thresholdInputTokens: 272_000,
      inputMultiplierPercent: 200,
      outputMultiplierPercent: 150,
    },
    readOn: '2026-08-23',
    source: 'https://developers.openai.com/api/docs/pricing',
  },
]

export function priceFor(target: Target): ModelPrice {
  const row = PRICES.find(
    (price) => price.provider === target.provider && price.modelId === target.modelId,
  )
  if (!row) {
    throw new Error(
      `No price row for ${target.provider}:${target.modelId}. Prices live only in ` +
        'src/core/providers/pricing.ts and each row carries the date it was read; ' +
        'add the row rather than inlining a price in an adapter.',
    )
  }
  return row
}

function applyPercent(micros: bigint, percent: number): bigint {
  return (micros * BigInt(percent)) / 100n
}

/** Total cost of one attempt, in integer micro-dollars. */
export function costMicrosFor(target: Target, usage: ProviderUsage): bigint {
  const price = priceFor(target)

  const tier = price.longContext
  const overThreshold = tier !== undefined && usage.inputTokens > tier.thresholdInputTokens

  const inputRate = overThreshold
    ? applyPercent(price.inputMicrosPerMillionTokens, tier.inputMultiplierPercent)
    : price.inputMicrosPerMillionTokens
  const outputRate = overThreshold
    ? applyPercent(price.outputMicrosPerMillionTokens, tier.outputMultiplierPercent)
    : price.outputMicrosPerMillionTokens

  return (
    costOfTokens(usage.inputTokens, inputRate) +
    costOfTokens(usage.outputTokens, outputRate) +
    costOfUnits(usage.searchCount, price.searchMicrosPerSearch)
  )
}

/**
 * Money is integer **micro-dollars** everywhere in this codebase. No float ever
 * goes near a cost: floating point currency accumulates error across the ~120
 * rows of a single run and is never correct at the point someone is invoiced.
 *
 * This module provides only the arithmetic. Prices live in
 * src/core/providers/pricing.ts and nowhere else.
 */

/** One US dollar, in micro-dollars. */
export const MICROS_PER_DOLLAR = 1_000_000n

/**
 * Cost of `count` units at `microsPerUnit` per unit, rounded half-up to the
 * nearest micro-dollar. Both arguments are integers, so nothing is lost.
 */
export function costOfUnits(count: number, microsPerUnit: bigint): bigint {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Unit count must be a non-negative integer, got ${count}`)
  }
  return BigInt(count) * microsPerUnit
}

/**
 * Cost of `tokens` tokens priced per million tokens. Rounds half-up, so a
 * fractional micro-dollar is never silently discarded.
 */
export function costOfTokens(tokens: number, microsPerMillionTokens: bigint): bigint {
  if (!Number.isInteger(tokens) || tokens < 0) {
    throw new Error(`Token count must be a non-negative integer, got ${tokens}`)
  }
  const numerator = BigInt(tokens) * microsPerMillionTokens
  const denominator = 1_000_000n
  return (numerator + denominator / 2n) / denominator
}

export function sumMicros(values: readonly bigint[]): bigint {
  return values.reduce<bigint>((total, value) => total + value, 0n)
}

/** Display only — never feed this back into arithmetic. */
export function formatMicrosAsUsd(micros: bigint): string {
  const negative = micros < 0n
  const absolute = negative ? -micros : micros
  const dollars = absolute / MICROS_PER_DOLLAR
  const remainder = absolute % MICROS_PER_DOLLAR
  const cents = (remainder + 5000n) / 10_000n
  const normalisedDollars = cents === 100n ? dollars + 1n : dollars
  const normalisedCents = cents === 100n ? 0n : cents
  return `${negative ? '-' : ''}$${normalisedDollars}.${normalisedCents.toString().padStart(2, '0')}`
}

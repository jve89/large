/**
 * `basisHash` — the measurement basis of a run (SPEC -> Definitions, C11).
 *
 * Hashed over exactly four inputs: the ordered prompt texts, the ordered
 * (provider, modelId) target list, the normalised aliases and the normalised
 * competitors.
 *
 * The brand **name** is deliberately excluded: renaming a company does not change
 * what was measured, while changing an alias does. N is excluded for a related
 * reason — two runs at different N ask the same question of the same models about
 * the same brand, and N is displayed beside every figure instead.
 */
import { createHash } from 'node:crypto'
import type { Target } from '../core/providers/types.ts'

export interface MeasurementBasis {
  readonly prompts: readonly string[]
  readonly targets: readonly Target[]
  readonly aliases: readonly string[]
  readonly competitors: readonly string[]
}

/**
 * Aliases and competitors are sets, not sequences: reordering them does not change
 * what was measured, so they are normalised and sorted before hashing. Prompts and
 * targets are ordered, and their order is part of the basis.
 */
function normaliseNames(names: readonly string[]): string[] {
  return [...new Set(names.map((n) => n.normalize('NFC').trim()).filter(Boolean))].sort()
}

export function basisHash(basis: MeasurementBasis): string {
  const payload = {
    prompts: basis.prompts.map((p) => p.normalize('NFC')),
    targets: basis.targets.map((t) => [t.provider, t.modelId]),
    aliases: normaliseNames(basis.aliases),
    competitors: normaliseNames(basis.competitors),
  }
  return createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex')
}

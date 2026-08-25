/**
 * `basisHash` — the measurement basis of a run (SPEC -> Definitions, C11).
 *
 * Hashed over exactly five inputs: the ordered prompt texts, the ordered
 * (provider, modelId) target list, the normalised aliases, the normalised
 * competitors, and the measurement semantics version.
 *
 * The fifth was added on 2026-08-25. The first four are what an operator can edit;
 * the fifth is what the *code* means by a mention. Without it a parser change
 * silently altered the meaning of a figure while every affected run kept its hash
 * and went on being presented as one series with runs measured differently — which
 * is the exact thing C11 exists to prevent, and the promise `SPEC.md` -> Vision
 * makes in "a run whose measurement basis changed says so rather than extending a
 * series".
 *
 * The brand **name** is deliberately excluded: renaming a company does not change
 * what was measured, while changing an alias does. N is excluded for a related
 * reason — two runs at different N ask the same question of the same models about
 * the same brand, and N is displayed beside every figure instead.
 *
 * This is computed **once**, in `queueRun`, and stored on the row. Nothing
 * recomputes it on read — verified before the fifth input was added, because
 * recomputing would have silently rewritten the comparability of every historical
 * run rather than distinguishing them.
 */
import { createHash } from 'node:crypto'
import { MEASUREMENT_SEMANTICS_VERSION } from '../core/parse/semantics.ts'
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
  return basisHashAt(basis, MEASUREMENT_SEMANTICS_VERSION)
}

/**
 * `basisHash` at an explicit semantics version.
 *
 * The production path never calls this — `basisHash` supplies the current version
 * and there is no way for a caller to pass the wrong one. It exists so a test can
 * prove the version actually participates in the hash, which is the only claim
 * that makes the fifth input worth anything.
 */
export function basisHashAt(basis: MeasurementBasis, semanticsVersion: number): string {
  const payload = {
    prompts: basis.prompts.map((p) => p.normalize('NFC')),
    targets: basis.targets.map((t) => [t.provider, t.modelId]),
    aliases: normaliseNames(basis.aliases),
    competitors: normaliseNames(basis.competitors),
    semanticsVersion,
  }
  return createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex')
}

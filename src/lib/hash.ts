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
 * ## Canonical form, per input
 *
 * **All four operator-editable inputs are sets, not sequences.** Reordering any of
 * them does not change what was measured, so none of them may change the hash.
 *
 *   - **prompts** - NFC-normalised, then sorted. Every (prompt, target,
 *     repetition) is an independent call with no shared state, so twenty prompts
 *     asked in a different order are the same twenty questions. They are *not*
 *     de-duplicated here: C2 already guarantees a stored list has no duplicates,
 *     and collapsing one silently would hide a C2 failure rather than survive it.
 *   - **targets** - `(provider, modelId)` pairs, sorted. Each target is measured
 *     independently; `queueRun` refuses a repeated one.
 *   - **aliases** and **competitors** - NFC-normalised, trimmed, de-duplicated,
 *     sorted. De-duplication is right here and wrong for prompts because nothing
 *     upstream guarantees an operator did not type a name twice.
 *
 * Sorting is by UTF-16 code unit, never `localeCompare`, for the reason recorded
 * in `lib/aggregate.ts`: a locale comparison depends on the runtime's ICU data, so
 * the same basis could hash differently on a laptop and in the container. For a
 * hash whose whole job is to be equal across time and machines, that would be
 * fatal rather than untidy.
 *
 * *Changed 2026-08-25.* Prompts and targets were previously hashed as ordered
 * lists, which meant re-pasting the same twenty prompts in a different order
 * refused a comparison between two runs that asked identical questions - a false
 * negative in the guard, the same class of error as folding the aggregation
 * version into this hash would have been. Hashes computed before that date are
 * therefore not comparable with ones after it; production held one run.
 */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function canonicalPrompts(prompts: readonly string[]): string[] {
  return prompts.map((prompt) => prompt.normalize('NFC')).sort(byCodeUnit)
}

function canonicalTargets(targets: readonly Target[]): [string, string][] {
  return targets
    .map((target): [string, string] => [target.provider, target.modelId])
    .sort((a, b) => byCodeUnit(a[0], b[0]) || byCodeUnit(a[1], b[1]))
}

function normaliseNames(names: readonly string[]): string[] {
  return [...new Set(names.map((n) => n.normalize('NFC').trim()).filter(Boolean))].sort(byCodeUnit)
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
    prompts: canonicalPrompts(basis.prompts),
    targets: canonicalTargets(basis.targets),
    aliases: normaliseNames(basis.aliases),
    competitors: normaliseNames(basis.competitors),
    semanticsVersion,
  }
  return createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex')
}

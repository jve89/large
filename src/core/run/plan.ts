/**
 * What a run is supposed to do, and what of it is still outstanding (SPEC C15).
 *
 * A run's plan is every (prompt, target, repetition) combination. The unique
 * constraint on Answer(runPromptId, runTargetId, repetition) is what makes this
 * safe: a reclaimed run computes the combinations that have no stored answer and
 * issues only those. Re-running a completed combination spends money for a row
 * that already exists (CLAUDE.md rule 14).
 */

export interface PlannedAttempt {
  readonly runPromptId: string
  readonly runTargetId: string
  readonly repetition: number
}

export interface StoredAttemptKey {
  readonly runPromptId: string
  readonly runTargetId: string
  readonly repetition: number
}

function key(attempt: StoredAttemptKey): string {
  return `${attempt.runPromptId}|${attempt.runTargetId}|${attempt.repetition}`
}

/**
 * Every combination the run is supposed to execute, in a stable order: prompt
 * order outermost, then target, then repetition.
 */
export function plannedAttempts(
  runPromptIds: readonly string[],
  runTargetIds: readonly string[],
  repetitions: number,
): PlannedAttempt[] {
  if (!Number.isInteger(repetitions) || repetitions < 1) {
    throw new Error(`repetitions must be an integer >= 1, got ${repetitions}`)
  }

  const attempts: PlannedAttempt[] = []
  for (const runPromptId of runPromptIds) {
    for (const runTargetId of runTargetIds) {
      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        attempts.push({ runPromptId, runTargetId, repetition })
      }
    }
  }
  return attempts
}

/**
 * The combinations that have no stored answer yet. Anything already stored — ok or
 * failed — has been paid for and is not attempted again.
 */
export function remainingAttempts(
  planned: readonly PlannedAttempt[],
  stored: readonly StoredAttemptKey[],
): PlannedAttempt[] {
  const done = new Set(stored.map(key))
  return planned.filter((attempt) => !done.has(key(attempt)))
}

/**
 * The denominator of coverage for **one target**: the planned attempts for that
 * target, which is the number of prompts times N.
 *
 * Never the number of stored rows. A run abandoned after a tenth of its work would
 * otherwise report full coverage on the handful of calls it managed to make — the
 * most flattering possible reading of the worst possible run (CLAUDE.md rule 3).
 */
export function plannedAttemptsPerTarget(promptCount: number, repetitions: number): number {
  if (!Number.isInteger(promptCount) || promptCount < 0) {
    throw new Error(`promptCount must be a non-negative integer, got ${promptCount}`)
  }
  if (!Number.isInteger(repetitions) || repetitions < 1) {
    throw new Error(`repetitions must be an integer >= 1, got ${repetitions}`)
  }
  return promptCount * repetitions
}

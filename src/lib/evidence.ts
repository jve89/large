/**
 * Which answers each figure was computed from (SPEC C17).
 *
 * C17 is the only capability that constrains what a *reader* can do rather than
 * how a number is produced: every other one says how a figure is computed, this
 * one says the figure must be checkable. `SPEC.md` -> Vision names it the second
 * differentiator, and it is the one the category cannot copy late, because a
 * competitor who has sold a confident single score cannot start qualifying it.
 *
 * ## Why the mapping is a table and not a comment
 *
 * Each figure reaches a **different shape** of evidence, and stating that loosely
 * is how a link comes to point at the answers for a neighbouring figure:
 *
 *   - mention rate is over the target's **successful** answers, so a failed one is
 *     reachable beside them and contributed to neither half of the fraction;
 *   - average position is over the narrower set of successful answers that
 *     **named the subject**, because an answer that did not name it has no
 *     position to average;
 *   - competitor frequency and cited domains are over the successful answers
 *     again - and the cited-domain count is a number of **answers**, never of
 *     citation rows, which is exactly what a reader checking the figure needs to
 *     be told before they count the URLs themselves and get a different number;
 *   - coverage is the odd one: its denominator is the **plan**, so its evidence
 *     includes attempts that were never made and therefore have no row at all.
 *     Nothing else on the page has evidence that does not exist.
 *
 * A reader following a link is owed the subset, not the pile.
 */

export type FigureName =
  | 'mention-rate'
  | 'average-position'
  | 'competitor-frequency'
  | 'cited-domains'
  | 'coverage'

export interface EvidenceScope {
  readonly figure: FigureName
  /** How the figure is labelled on the run page. */
  readonly label: string
  /** Stated to the reader before they check the figure themselves. */
  readonly explanation: string
}

const SCOPES: Readonly<Record<FigureName, EvidenceScope>> = {
  'mention-rate': {
    figure: 'mention-rate',
    label: 'Mention rate',
    explanation:
      'Computed from the successful answers below: those naming the brand, over ' +
      'all of them. A failed attempt is in neither half - it is not an answer in ' +
      'which the brand happened to be absent - and is shown here so that it can be ' +
      'seen not to be.',
  },
  'average-position': {
    figure: 'average-position',
    label: 'Average position',
    explanation:
      'Computed from the successful answers that named the brand, and only those. ' +
      'An answer that did not name it has no position to average, so it is shown ' +
      'below but did not contribute; that is a measured absence, not a gap.',
  },
  'competitor-frequency': {
    figure: 'competitor-frequency',
    label: 'Competitors',
    explanation:
      'Each competitor is counted in how many of the successful answers below it ' +
      'was named. A competitor from the run snapshot that appears in none of them ' +
      'is listed at zero rather than omitted.',
  },
  'cited-domains': {
    figure: 'cited-domains',
    label: 'Cited sources',
    explanation:
      'Each domain is counted in how many successful answers it appears in - ' +
      'answers, never citation rows. An answer citing three pages of one site adds ' +
      'one. Counting the URLs below by hand will give a larger number, and that ' +
      'difference is the rule rather than an error.',
  },
  coverage: {
    figure: 'coverage',
    label: 'Coverage',
    explanation:
      'Successful answers over the attempts this run planned for this target - ' +
      'prompts times N - and never over the rows that happen to be stored. Its ' +
      'evidence therefore includes attempts that were never made and have no row ' +
      'below at all; those are counted in the denominator.',
  },
}

export function scopeFor(figure: string | undefined): EvidenceScope | null {
  if (figure === undefined) return null
  return figure in SCOPES ? SCOPES[figure as FigureName] : null
}

export interface EvidenceAnswer {
  readonly status: 'ok' | 'failed'
  readonly mentions: readonly { readonly isSubject: boolean }[]
}

/**
 * Whether one answer contributed to the figure a reader followed a link from.
 *
 * Everything for the target is displayed either way - C17 requires a failed answer
 * to be reachable *alongside* the successful ones, so that a cell reading "no data"
 * can be explained rather than only labelled. This decides what is marked, not what
 * is shown.
 */
export function contributesTo(scope: EvidenceScope, answer: EvidenceAnswer): boolean {
  if (answer.status !== 'ok') return false
  if (scope.figure === 'average-position') {
    return answer.mentions.some((mention) => mention.isSubject)
  }
  return true
}

/** The evidence URL for one figure, or for one cell when a prompt is given. */
export function evidenceHref(
  runId: string,
  runTargetId: string,
  figure: FigureName,
  runPromptId?: string,
): string {
  const query = new URLSearchParams({ figure })
  if (runPromptId !== undefined) query.set('prompt', runPromptId)
  return `/runs/${runId}/evidence/${runTargetId}?${query.toString()}`
}

import Link from 'next/link'
import type { Figure } from '../lib/aggregate.ts'
import { evidenceHref, type FigureName } from '../lib/evidence.ts'

/**
 * The only way this application renders an aggregate figure.
 *
 * SPEC C10 says coverage and N travel with **every** figure. `Figure<T>` makes the
 * value unreachable without them; this component is what makes them appear. Both
 * halves are needed: the type stops a renderer from accidentally not having the
 * coverage, and this stops it from having it and not printing it.
 *
 * The `data-figure` attribute is not decoration. `tests/ui/run-page.test.ts` finds
 * every element carrying one and asserts that its text contains a coverage and an
 * N - so a new figure added anywhere on the page is covered by that test the
 * moment it is rendered through here, and a figure rendered *without* going
 * through here is the thing the test is designed to notice.
 */
export function FigureValue<T>({
  name,
  label,
  figure,
  render,
  evidence,
}: {
  name: FigureName
  label: string
  figure: Figure<T>
  render: (value: T) => string
  /** C17: where this figure's own evidence lives. */
  evidence?: { runId: string; runTargetId: string }
}) {
  const { coverage, repetitions, result } = figure

  const body =
    result.kind === 'measured'
      ? render(result.value)
      : result.kind === 'no-data'
        ? 'no data'
        : `not applicable — ${result.why}`

  return (
    <li data-figure={name} className="text-sm">
      <span className="text-neutral-600">{label}: </span>
      <span
        className={
          result.kind === 'measured' && coverage.reliable ? 'font-medium' : 'font-medium text-amber-700'
        }
      >
        {body}
      </span>
      <span className="text-neutral-500">
        {' '}
        · coverage {formatPercent(coverage.ratio)} ({coverage.successes} of {coverage.planned}{' '}
        planned) · N={repetitions}
        {coverage.reliable ? '' : ' · unreliable'}
      </span>
      {evidence ? (
        // C17. One step, and to *this* figure's evidence: the figure name travels
        // in the link so the destination can say which answers it was computed
        // from, rather than handing over the pile and leaving the reader to guess.
        <>
          {' '}
          <Link
            data-evidence-link={name}
            href={evidenceHref(evidence.runId, evidence.runTargetId, name)}
            className="underline underline-offset-4"
          >
            evidence
          </Link>
        </>
      ) : null}
    </li>
  )
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 1000) / 10}%`
}

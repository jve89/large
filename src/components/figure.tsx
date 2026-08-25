import type { Figure } from '../lib/aggregate.ts'

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
}: {
  name: string
  label: string
  figure: Figure<T>
  render: (value: T) => string
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
    </li>
  )
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 1000) / 10}%`
}

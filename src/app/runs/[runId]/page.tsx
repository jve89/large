import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FigureValue, formatPercent } from '../../../components/figure.tsx'
import { RunProgress } from '../../../components/run-progress.tsx'
import { plannedAttemptsPerTarget } from '../../../core/run/plan.ts'
import { aggregateRun } from '../../../lib/aggregate.ts'
import { prisma } from '../../../lib/db.ts'
import { validateEnv } from '../../../lib/env.ts'
import { formatMicrosAsUsd } from '../../../lib/money.ts'

export const dynamic = 'force-dynamic'

/**
 * Screen 3 — run detail.
 *
 * Every aggregate figure on this page is rendered through `FigureValue`, which
 * prints the coverage of the figure's own target and the run's N beside it. That
 * is SPEC C10, and it is the product's second differentiator: a number without its
 * coverage is the competitor's product, and a below-threshold target is labelled
 * rather than presented as a measurement.
 *
 * Nothing here is stored. `aggregateRun` recomputes from the answer rows on every
 * read (C9), and the answers it reads are the same ones listed below, so a reader
 * can check any figure against the evidence it came from - fully in Phase 12.
 */
export default async function RunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      company: true,
      targets: true,
      prompts: { orderBy: { order: 'asc' } },
      answers: {
        include: { citations: { orderBy: { order: 'asc' } }, mentions: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!run) notFound()

  const targetById = new Map(run.targets.map((t) => [t.id, t]))
  const promptById = new Map(run.prompts.map((p) => [p.id, p]))
  const plannedPerTarget = plannedAttemptsPerTarget(run.prompts.length, run.repetitions)

  // Read time, every time (C9). The answers are already loaded for the list below,
  // so this costs no extra query - and no column exists for any of it.
  const aggregate = aggregateRun({
    repetitions: run.repetitions,
    coverageThreshold: validateEnv('web').COVERAGE_THRESHOLD,
    targets: run.targets,
    promptIds: run.prompts.map((prompt) => prompt.id),
    competitors: run.brandCompetitors,
    answers: run.answers,
  })

  const isTerminal = run.status !== 'queued' && run.status !== 'running'

  return (
    <main>
      <Link
        href={`/companies/${run.companyId}`}
        className="text-sm underline underline-offset-4"
      >
        ← {run.company.name}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Run</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Status <span className="font-medium">{run.status}</span> · N={run.repetitions} ·{' '}
        {run.prompts.length} prompts × {run.targets.length} targets ={' '}
        {plannedPerTarget * run.targets.length} planned attempts · basis{' '}
        <code className="font-mono">{run.basisHash.slice(0, 12)}</code>
      </p>
      {run.failureReason ? (
        <p className="mt-2 text-sm text-red-700">Failure reason: {run.failureReason}</p>
      ) : null}

      <RunProgress runId={run.id} initialStatus={run.status} />

      {isTerminal ? (
        <p data-totals className="mt-4 text-sm text-neutral-700">
          Totals over {aggregate.totals.answers} successful answers of{' '}
          {aggregate.totals.plannedAttempts} planned · N={run.repetitions}:{' '}
          {aggregate.totals.inputTokens.toLocaleString('en-GB')} input tokens ·{' '}
          {aggregate.totals.outputTokens.toLocaleString('en-GB')} output tokens ·{' '}
          {aggregate.totals.searchCount.toLocaleString('en-GB')} web searches ·{' '}
          <span className="font-medium">{formatMicrosAsUsd(aggregate.totals.costMicros)}</span>
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Figures, per target</h2>
        <ul className="mt-4 space-y-6">
          {aggregate.targets.map((target) => (
            <li key={target.targetId} className="border-t border-neutral-200 pt-4">
              <p className="text-sm font-medium">
                {target.provider} · {target.modelId}
              </p>

              {target.coverage.reliable ? null : (
                <p className="mt-1 text-sm text-amber-700">
                  Unreliable — coverage {formatPercent(target.coverage.ratio)} is below the
                  threshold, so these figures are not presented as a measurement. The other
                  targets are unaffected.
                </p>
              )}

              <ul className="mt-2 space-y-1">
                <FigureValue
                  name="mention-rate"
                  label="Mention rate"
                  figure={target.mentionRate}
                  render={(value) => formatPercent(value)}
                />
                <FigureValue
                  name="average-position"
                  label="Average position"
                  figure={target.averagePosition}
                  render={(value) => (Math.round(value * 10) / 10).toString()}
                />
                <FigureValue
                  name="competitor-frequency"
                  label="Competitors"
                  figure={target.competitors}
                  render={(counts) =>
                    counts.length === 0
                      ? 'no competitors in this run’s snapshot'
                      : counts.map((c) => `${c.brand} ${c.answers}`).join(' · ')
                  }
                />
                <FigureValue
                  name="cited-domains"
                  label="Cited sources"
                  figure={target.citedDomains}
                  render={(domains) =>
                    // An empty list is a measurement: the model cited nothing. It
                    // is rendered as a sentence rather than as blank space so it
                    // cannot be misread as a missing figure - "no data" is what an
                    // absence of measurement looks like, and it is not this.
                    domains.length === 0
                      ? 'the model cited no sources in any successful answer'
                      : domains.map((d) => `${d.domain} ${d.answers}`).join(' · ')
                  }
                />
              </ul>

              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-neutral-600">
                  Per prompt ({target.cells.length})
                </summary>
                <ul className="mt-2 space-y-1 text-sm">
                  {target.cells.map((cell) => (
                    <li key={cell.runPromptId} data-cell={cell.state}>
                      <span className="text-neutral-600">
                        {promptById.get(cell.runPromptId)?.text ?? cell.runPromptId}
                      </span>{' '}
                      —{' '}
                      {cell.state === 'no-data' ? (
                        // Never "0 of 3 named the brand": every attempt failed, so
                        // there is nothing to have named it (SPEC C10).
                        <span className="text-amber-700">
                          no data — all {cell.planned} attempts failed
                        </span>
                      ) : (
                        <span>
                          named in {cell.mentioned} of {cell.succeeded} successful attempt
                          {cell.succeeded === 1 ? '' : 's'} ({cell.planned} planned)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Attempts</h2>

        {run.answers.length === 0 ? (
          <p className="mt-2 text-neutral-600">No attempts stored yet.</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {run.answers.map((answer) => {
              const target = targetById.get(answer.runTargetId)
              return (
                <li key={answer.id} className="border-t border-neutral-200 pt-4">
                  <p className="text-sm text-neutral-600">
                    {target ? `${target.provider} · ${target.modelId}` : 'unknown target'} ·
                    repetition {answer.repetition} · {answer.httpAttempts} HTTP attempt
                    {answer.httpAttempts === 1 ? '' : 's'} ·{' '}
                    <span
                      className={
                        answer.status === 'ok' ? 'font-medium' : 'font-medium text-red-700'
                      }
                    >
                      {answer.status}
                    </span>
                  </p>

                  {answer.status === 'failed' ? (
                    // A failed attempt is never rendered as an answer in which the
                    // brand was absent (CLAUDE.md rule 1).
                    <p className="mt-2 text-sm text-red-700">
                      No data — {answer.failureReason ?? 'no reason recorded'}
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm">
                        {answer.mentions.length === 0
                          ? 'No recognised brand found in the visible text.'
                          : answer.mentions
                              .slice()
                              .sort((a, b) => a.position - b.position)
                              .map(
                                (mention) =>
                                  `${mention.position}/${mention.totalRecognised} ${mention.brand}${
                                    mention.isSubject ? ' (subject)' : ''
                                  }`,
                              )
                              .join(' · ')}
                      </p>

                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-neutral-600">
                          {answer.citations.length} citation
                          {answer.citations.length === 1 ? '' : 's'} · raw answer
                        </summary>
                        <ul className="mt-2 space-y-1 text-sm">
                          {answer.citations.map((citation) => (
                            <li key={citation.id}>
                              <a
                                href={citation.url}
                                className="underline underline-offset-4"
                                rel="noreferrer noopener"
                                target="_blank"
                              >
                                {citation.title ?? citation.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-neutral-50 p-3 text-xs">
                          {answer.rawText}
                        </pre>
                      </details>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}

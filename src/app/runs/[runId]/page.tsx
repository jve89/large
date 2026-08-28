import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FigureValue, formatMean, formatPercent } from '../../../components/figure.tsx'
import { RunProgress } from '../../../components/run-progress.tsx'
import { plannedAttemptsPerTarget } from '../../../core/run/plan.ts'
import { AGGREGATION_SEMANTICS_SINCE, aggregateRun, ownHostOf } from '../../../lib/aggregate.ts'
import { evidenceHref } from '../../../lib/evidence.ts'
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
      // Only what the figures need. Raw text and citations are loaded by the
      // evidence page, for the one target a reader actually opened.
      answers: {
        select: {
          runTargetId: true,
          runPromptId: true,
          status: true,
          inputTokens: true,
          outputTokens: true,
          searchCount: true,
          costMicros: true,
          mentions: {
            select: { brand: true, isSubject: true, position: true, totalRecognised: true },
          },
          citations: { select: { url: true } },
        },
      },
    },
  })

  if (!run) notFound()

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
    // The company's website as it stands NOW, not a snapshot - marking is an
    // annotation over the measurement rather than part of it (Phase 13).
    ownWebsite: run.company.website,
    answers: run.answers,
  })

  const isTerminal = run.status !== 'queued' && run.status !== 'running'
  // Null when no website is recorded. Nothing is then marked, and the note below
  // is not shown either - an absent field must never read as "none of these are
  // yours", which is the failed-is-not-absent rule one level up.
  const ownHost = ownHostOf(run.company.website)

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
        <code className="font-mono">{run.basisHash.slice(0, 12)}</code> ·{' '}
        {/*
          The aggregation version belongs on the screen, not only in the payload:
          the reader who needs it is holding a screenshot from three months ago,
          and a screenshot carries what was on screen. Stated once per rendering
          rather than per figure, because it governs all of them equally.
        */}
        <span data-aggregation-version>
          figures computed under aggregation rules v{aggregate.aggregationVersion}, in
          effect since {AGGREGATION_SEMANTICS_SINCE}
        </span>
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
        {ownHost === null ? null : (
          // The caveat this marking cannot be shown without. Marking is computed
          // when the run is READ, against the website recorded on the company now -
          // there is no snapshot of it, deliberately, because it annotates a
          // measurement rather than forming part of one. Without this sentence a
          // customer who changes their domain sees an old run's marking move and
          // reasonably concludes the measurement moved.
          <p data-own-domain-note className="mt-2 text-sm text-neutral-600">
            Sources marked <span className="font-medium">(yours)</span> are matched
            against <span className="font-mono">{ownHost}</span>, the website recorded
            for this company <span className="font-medium">now</span> — not one stored
            when this run was measured. Changing it changes the marking on past runs;
            it changes no figure and breaks no series.
          </p>
        )}
        <ul className="mt-4 space-y-6">
          {aggregate.targets.map((target) => (
            <li
              key={target.targetId}
              data-target-block={target.targetId}
              className="border-t border-neutral-200 pt-4"
            >
              <p className="text-sm font-medium">
                {target.provider} · {target.modelId}
              </p>

              <p className="mt-1 text-sm text-neutral-600">
                Coverage {formatPercent(target.coverage.ratio)} ({target.coverage.successes} of{' '}
                {target.coverage.planned} planned) ·{' '}
                <Link
                  data-evidence-link="coverage"
                  href={evidenceHref(run.id, target.targetId, 'coverage')}
                  className="underline underline-offset-4"
                >
                  evidence
                </Link>
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
                  evidence={{ runId: run.id, runTargetId: target.targetId }}
                  render={(value) => formatPercent(value)}
                />
                <FigureValue
                  name="average-position"
                  label="Average position"
                  figure={target.averagePosition}
                  evidence={{ runId: run.id, runTargetId: target.targetId }}
                  // The population travels with the number, per C10's clause on
                  // average position. "1" reads as "recommended first" and does
                  // not mean that; "1 of 1 recognised" says what was actually
                  // measured, and "1 of 8 recognised" is the strong result a bare
                  // 1 was being mistaken for.
                  render={({ position, outOf }) =>
                    `${formatMean(position)} of ${formatMean(outOf)} recognised`
                  }
                />
                <FigureValue
                  name="competitor-frequency"
                  label="Competitors"
                  figure={target.competitors}
                  evidence={{ runId: run.id, runTargetId: target.targetId }}
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
                  evidence={{ runId: run.id, runTargetId: target.targetId }}
                  render={(domains) =>
                    // An empty list is a measurement: the model cited nothing. It
                    // is rendered as a sentence rather than as blank space so it
                    // cannot be misread as a missing figure - "no data" is what an
                    // absence of measurement looks like, and it is not this.
                    domains.length === 0
                      ? 'the model cited no sources in any successful answer'
                      : domains
                          .map((d) => `${d.domain} ${d.answers}${d.isOwn ? ' (yours)' : ''}`)
                          .join(' · ')
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
                      )}{' '}
                      {/*
                        A no-data cell needs this link more than any other figure on
                        the page: the reader most likely to follow it is the one who
                        disagrees, and what they disagree with is "I do not know".
                        Without the failed attempts and their reasons behind it, the
                        instrument says it does not know and cannot say why (C17).
                      */}
                      <Link
                        data-cell-evidence-link={cell.state}
                        href={evidenceHref(
                          run.id,
                          target.targetId,
                          'mention-rate',
                          cell.runPromptId,
                        )}
                        className="underline underline-offset-4"
                      >
                        evidence
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Evidence</h2>
        {/*
          Phase 12 moved the answers off this page. It used to inline every one -
          raw text and all - which at the 300-call ceiling was about 1.1 MB, of
          which roughly 900 KB was answer text. That is zero steps and unusable.
          C17 requires each answer to be *reachable*, not rendered all at once, and
          the reader's action is what "one step" is measured in.
        */}
        <p className="mt-2 text-sm text-neutral-600">
          Every figure above links to the answers it was computed from. By target:
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {aggregate.targets.map((target) => (
            <li key={target.targetId}>
              <Link
                data-target-evidence-link={target.targetId}
                href={evidenceHref(run.id, target.targetId, 'coverage')}
                className="underline underline-offset-4"
              >
                {target.provider} · {target.modelId}
              </Link>{' '}
              <span className="text-neutral-500">
                — {target.coverage.successes} successful of {target.coverage.planned} planned
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

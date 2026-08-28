import Link from 'next/link'
import { notFound } from 'next/navigation'
import { plannedAttemptsPerTarget } from '../../../../../core/run/plan.ts'
import { AGGREGATION_SEMANTICS_SINCE, AGGREGATION_SEMANTICS_VERSION } from '../../../../../lib/aggregate.ts'
import { prisma } from '../../../../../lib/db.ts'
import { contributesTo, scopeFor } from '../../../../../lib/evidence.ts'
import { formatPercent } from '../../../../../components/figure.tsx'

export const dynamic = 'force-dynamic'

/**
 * The evidence beneath one target's figures (SPEC C17).
 *
 * **This page is what "one step" means.** Before it existed, the run page inlined
 * every answer's raw text - about 1.1 MB at the 300-call ceiling, measured in
 * Phase 7 - which is zero steps and unusable. A link that opens the answers for
 * the figure a reader is looking at is one step and correct. The distinction is
 * the reader's action, not the transport.
 *
 * It loads only this target's answers, and only this prompt's when a cell was
 * followed, so the page a reader opens is the size of what they asked for.
 *
 * Everything for the scope is shown, successful and failed alike, because C17
 * requires a failed answer to be reachable *beside* the successful ones: a cell
 * reading "no data" has to be explainable, not merely labelled. What the figure
 * actually used is marked rather than filtered, so a reader can see what was
 * excluded and why.
 */
export default async function EvidencePage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string; runTargetId: string }>
  searchParams: Promise<{ figure?: string; prompt?: string }>
}) {
  const { runId, runTargetId } = await params
  const { figure, prompt: runPromptId } = await searchParams

  const target = await prisma.runTarget.findFirst({
    where: { id: runTargetId, runId },
    include: {
      run: { include: { company: true, prompts: { orderBy: { order: 'asc' } } } },
      answers: {
        where: runPromptId === undefined ? {} : { runPromptId },
        include: { citations: { orderBy: { order: 'asc' } }, mentions: true },
        orderBy: [{ runPromptId: 'asc' }, { repetition: 'asc' }],
      },
    },
  })

  // A target id that belongs to another run must not resolve here: the whole
  // point of this page is that a link reaches the evidence for *this* figure.
  if (!target) notFound()

  const run = target.run
  const promptById = new Map(run.prompts.map((p) => [p.id, p]))
  const scope = scopeFor(figure)

  const successes = target.answers.filter((a) => a.status === 'ok').length
  const planned =
    runPromptId === undefined
      ? plannedAttemptsPerTarget(run.prompts.length, run.repetitions)
      : run.repetitions
  const neverAttempted = Math.max(0, planned - target.answers.length)

  return (
    <main data-evidence data-run-target-id={target.id}>
      <Link href={`/runs/${run.id}`} className="text-sm underline underline-offset-4">
        ← Run
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Evidence</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {run.company.name} · <span className="font-medium">{target.provider}</span> ·{' '}
        {target.modelId} · N={run.repetitions} · coverage{' '}
        {formatPercent(planned === 0 ? 0 : successes / planned)} ({successes} of {planned}{' '}
        planned) · figures computed under aggregation rules v{AGGREGATION_SEMANTICS_VERSION},
        in effect since {AGGREGATION_SEMANTICS_SINCE}
      </p>

      {runPromptId !== undefined ? (
        <p className="mt-2 text-sm text-neutral-700">
          One prompt: “{promptById.get(runPromptId)?.text ?? runPromptId}”
        </p>
      ) : null}

      {scope ? (
        <p data-scope={scope.figure} className="mt-4 rounded border border-neutral-300 bg-neutral-50 p-3 text-sm">
          <span className="font-medium">{scope.label}.</span> {scope.explanation}
        </p>
      ) : null}

      {neverAttempted > 0 ? (
        <p data-never-attempted className="mt-2 text-sm text-amber-700">
          {neverAttempted} planned attempt{neverAttempted === 1 ? '' : 's'} of {planned}{' '}
          {neverAttempted === 1 ? 'was' : 'were'} never made, so {neverAttempted === 1 ? 'it has' : 'they have'}{' '}
          no row below. Coverage counts {neverAttempted === 1 ? 'it' : 'them'} in its denominator anyway.
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium">
          {target.answers.length} stored attempt{target.answers.length === 1 ? '' : 's'}
        </h2>

        {target.answers.length === 0 ? (
          <p className="mt-2 text-neutral-600">
            No attempt was stored for this target, so there is nothing beneath the figure to
            show. That is what “no data” means.
          </p>
        ) : (
          <ul className="mt-4 space-y-6">
            {target.answers.map((answer) => {
              const used = scope ? contributesTo(scope, answer) : null
              return (
                <li
                  key={answer.id}
                  data-answer={answer.status}
                  data-used={used === null ? undefined : String(used)}
                  className="border-t border-neutral-200 pt-4"
                >
                  <p className="text-sm text-neutral-600">
                    “{promptById.get(answer.runPromptId)?.text ?? answer.runPromptId}” ·
                    repetition {answer.repetition} · {answer.httpAttempts} HTTP attempt
                    {answer.httpAttempts === 1 ? '' : 's'} ·{' '}
                    <span
                      className={answer.status === 'ok' ? 'font-medium' : 'font-medium text-red-700'}
                    >
                      {answer.status}
                    </span>
                    {used === null ? null : used ? (
                      <span className="text-neutral-500"> · counted in this figure</span>
                    ) : (
                      <span className="text-amber-700"> · not counted in this figure</span>
                    )}
                  </p>

                  {answer.status === 'failed' ? (
                    // The clause that matters most here: a reader who disagrees with
                    // a cell reading "no data" is owed the reason, or the instrument
                    // says "I do not know" and then cannot say why.
                    <p data-failure-reason className="mt-2 text-sm text-red-700">
                      Failed — {answer.failureReason ?? 'no reason recorded'}
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

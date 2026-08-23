import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RunProgress } from '../../../components/run-progress.tsx'
import { plannedAttemptsPerTarget } from '../../../core/run/plan.ts'
import { prisma } from '../../../lib/db.ts'

export const dynamic = 'force-dynamic'

/**
 * Screen 3 — run detail.
 *
 * Phase 0 shows what the skeleton proves: the stored answers, their citations and
 * the parsed mention result, per target. It deliberately displays **no aggregate
 * figure at all**. Mention rate, average position, competitor frequency and cost
 * are Phase 7, and every one of them must arrive carrying the coverage of its own
 * target and the run's N (SPEC C10). Showing a bare percentage here and adding its
 * coverage later is exactly the error this product exists to prevent.
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
  const plannedPerTarget = plannedAttemptsPerTarget(run.prompts.length, run.repetitions)

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

      <p className="mt-6 rounded border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700">
        Phase 0 shows stored attempts only. Coverage, mention rate, average position
        and cost arrive in Phase 7, and each will be displayed with the coverage of
        its own target and this run&rsquo;s N beside it.
      </p>

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

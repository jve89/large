import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db.ts'
import { validateEnv } from '../../../../lib/env.ts'
import { plannedAttemptsPerTarget } from '../../../../core/run/plan.ts'
import { aggregateRun, totalsForWire } from '../../../../lib/aggregate.ts'

export const dynamic = 'force-dynamic'

/**
 * Run status and progress, polled by the run page every two seconds while the run
 * is `queued` or `running`.
 *
 * Phase 0 returns status and progress only. The per-target aggregates — coverage,
 * mention rate, average position, competitor frequency and totals — are Phase 7
 * and are computed at read time in lib/aggregate.ts when they arrive. Nothing here
 * invents a figure it cannot yet compute honestly.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
): Promise<NextResponse> {
  const { runId } = await context.params

  const env = validateEnv('web')

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      company: { select: { website: true } },
      targets: true,
      prompts: { orderBy: { order: 'asc' } },
      _count: { select: { answers: true } },
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
          // C16 needs only the URL: the figure counts answers, not citation rows.
          citations: { select: { url: true } },
        },
      },
    },
  })

  if (!run) {
    return NextResponse.json({ error: 'Unknown run' }, { status: 404 })
  }

  // total = prompts x targets x N. The denominator of progress, like the
  // denominator of coverage, is the plan and never the number of stored rows.
  const perTarget = plannedAttemptsPerTarget(run.prompts.length, run.repetitions)
  const total = perTarget * run.targets.length

  const aggregate = aggregateRun({
    repetitions: run.repetitions,
    coverageThreshold: env.COVERAGE_THRESHOLD,
    targets: run.targets,
    promptIds: run.prompts.map((prompt) => prompt.id),
    competitors: run.brandCompetitors,
    ownWebsite: run.company?.website ?? null,
    answers: run.answers,
  })

  return NextResponse.json({
    run: {
      id: run.id,
      status: run.status,
      repetitions: run.repetitions,
      basisHash: run.basisHash,
      brandName: run.brandName,
      failureReason: run.failureReason,
      createdAt: run.createdAt,
      finishedAt: run.finishedAt,
    },
    targets: run.targets.map((target) => ({
      id: target.id,
      provider: target.provider,
      modelId: target.modelId,
    })),
    // C18 - the prompt library is not a secret. This is the capability's statement
    // of itself at the API level, and it is here because ARCHITECTURE documented it
    // while the route did not return it: when a document and the code disagree, the
    // tiebreaker is whether a capability depends on it (CLAUDE.md rule 22). It is
    // the run's snapshot, never the company's current list, because the snapshot is
    // what was measured.
    prompts: run.prompts.map((prompt) => ({
      id: prompt.id,
      order: prompt.order,
      text: prompt.text,
    })),
    progress: { done: run._count.answers, total },
    // `totals.costMicros` is a BigInt and `JSON.stringify` throws on one, which
    // TypeScript does not catch. See RunTotalsWire for the representation and why.
    aggregate: { ...aggregate, totals: totalsForWire(aggregate.totals) },
  })
}

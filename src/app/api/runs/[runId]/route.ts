import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db.ts'
import { validateEnv } from '../../../../lib/env.ts'
import { plannedAttemptsPerTarget } from '../../../../core/run/plan.ts'

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
  validateEnv('web')

  const { runId } = await context.params

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      targets: true,
      prompts: { orderBy: { order: 'asc' } },
      _count: { select: { answers: true } },
    },
  })

  if (!run) {
    return NextResponse.json({ error: 'Unknown run' }, { status: 404 })
  }

  // total = prompts x targets x N. The denominator of progress, like the
  // denominator of coverage, is the plan and never the number of stored rows.
  const perTarget = plannedAttemptsPerTarget(run.prompts.length, run.repetitions)
  const total = perTarget * run.targets.length

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
    progress: { done: run._count.answers, total },
  })
}

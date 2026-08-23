/**
 * The measurement worker.
 *
 * Polls for a claimable run, executes its outstanding attempts and writes the
 * terminal status. It exposes no port: the web layer never calls the worker, and
 * the worker never calls the web layer. The only thing between them is a database
 * row.
 *
 * A run survives a worker restart, because a stalled run is reclaimed and
 * **resumed** rather than restarted (SPEC C15).
 */
import type { PrismaClient } from '@prisma/client'
import { adapterFor, type ProviderCredentials } from '../core/providers/index.ts'
import type { Target } from '../core/providers/types.ts'
import { executeRun, type RunnableRun } from '../core/run/execute.ts'
import { assertDatabaseMajorVersion, prisma as defaultPrisma } from '../lib/db.ts'
import { validateEnv } from '../lib/env.ts'
import { claimRun, exceededReclaimLimit, finishRun, heartbeat } from './claim.ts'

/**
 * The heartbeat must be refreshed at least every fifteen seconds while a worker
 * executes, or another worker will conclude it died. Ten leaves margin.
 */
const HEARTBEAT_INTERVAL_MS = 10_000

export interface WorkerDeps {
  readonly prisma: PrismaClient
  readonly credentials: ProviderCredentials
  readonly concurrencyPerProvider: number
  readonly coverageThreshold: number
  readonly staleRunSeconds: number
  readonly maxReclaims: number
  readonly signal?: AbortSignal
}

export interface ProcessedRun {
  readonly runId: string
  readonly status: string
}

/**
 * Claims one run and takes it to a terminal status, or returns null when there is
 * nothing to claim.
 */
export async function processNextRun(deps: WorkerDeps): Promise<ProcessedRun | null> {
  const claimed = await claimRun(deps.prisma, deps.staleRunSeconds)
  if (!claimed) return null

  // A run that reliably crashes its worker must not burn money in a loop.
  if (exceededReclaimLimit(claimed.reclaimCount, deps.maxReclaims)) {
    const reason = `reclaimed ${claimed.reclaimCount} times, above the limit of ${deps.maxReclaims}`
    await finishRun(deps.prisma, claimed.id, 'failed', reason)
    return { runId: claimed.id, status: 'failed' }
  }

  const record = await deps.prisma.run.findUnique({
    where: { id: claimed.id },
    include: { targets: true, prompts: { orderBy: { order: 'asc' } } },
  })

  if (!record) return null

  const run: RunnableRun = {
    id: record.id,
    repetitions: record.repetitions,
    brandAliases: record.brandAliases,
    brandCompetitors: record.brandCompetitors,
    prompts: record.prompts.map((p) => ({ id: p.id, text: p.text })),
    targets: record.targets.map((t) => ({
      id: t.id,
      provider: t.provider,
      modelId: t.modelId,
    })),
  }

  const beat = setInterval(() => {
    void heartbeat(deps.prisma, run.id).catch(() => {
      // A missed beat is recoverable: the run is reclaimed and resumed, never
      // restarted, so nothing is paid for twice.
    })
  }, HEARTBEAT_INTERVAL_MS)

  try {
    const status = await executeRun(run, {
      prisma: deps.prisma,
      adapterFor: (target: Target) => adapterFor(target, deps.credentials),
      concurrencyPerProvider: deps.concurrencyPerProvider,
      coverageThreshold: deps.coverageThreshold,
      heartbeat: () => heartbeat(deps.prisma, run.id),
      signal: deps.signal,
    })

    const reason =
      status === 'failed'
        ? `no target reached the coverage threshold of ${deps.coverageThreshold}`
        : undefined
    await finishRun(deps.prisma, run.id, status, reason)
    return { runId: run.id, status }
  } finally {
    clearInterval(beat)
  }
}

async function main(): Promise<void> {
  const env = validateEnv('worker')
  await assertDatabaseMajorVersion()

  const controller = new AbortController()
  let stopping = false

  const shutdown = (signal: string): void => {
    if (stopping) return
    stopping = true
    console.log(`[worker] ${signal} received; finishing the current run then exiting.`)
    controller.abort()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  const deps: WorkerDeps = {
    prisma: defaultPrisma,
    credentials: {
      // validateEnv('worker') has already proven both are present.
      anthropicApiKey: env.ANTHROPIC_API_KEY!,
      openaiApiKey: env.OPENAI_API_KEY!,
    },
    concurrencyPerProvider: env.PROVIDER_CONCURRENCY,
    coverageThreshold: env.COVERAGE_THRESHOLD,
    staleRunSeconds: env.STALE_RUN_SECONDS,
    maxReclaims: env.MAX_RECLAIMS,
    signal: controller.signal,
  }

  console.log('[worker] started; polling for runs.')

  while (!stopping) {
    try {
      const processed = await processNextRun(deps)
      if (processed) {
        console.log(`[worker] run ${processed.runId} finished as ${processed.status}`)
        continue
      }
    } catch (error) {
      console.error('[worker] error while processing a run:', error)
    }
    await new Promise((resolve) => setTimeout(resolve, env.WORKER_POLL_MS))
  }

  await defaultPrisma.$disconnect()
  console.log('[worker] stopped.')
}

// Runs the poll loop only when this file is the process entrypoint, so that
// importing processNextRun (as scripts/verify-live.ts does) does not start a
// second worker inside the same process.
const isEntrypoint =
  typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module

if (isEntrypoint) {
  void main().catch((error: unknown) => {
    console.error('[worker] fatal:', error)
    process.exitCode = 1
  })
}

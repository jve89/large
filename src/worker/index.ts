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
import path from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { adapterFor, type ProviderCredentials } from '../core/providers/index.ts'
import type { ProviderAdapter, Target } from '../core/providers/types.ts'
import { executeRun, type RunnableRun } from '../core/run/execute.ts'
import { validateEnv } from '../lib/env.ts'
import { claimRun, exceededReclaimLimit, finishRun, heartbeat } from './claim.ts'

/**
 * SPEC C15: a worker "SHALL refresh that run's heartbeat at least every fifteen
 * seconds" while it executes. Ten leaves margin.
 *
 * **This is wall-clock, not per-attempt, and that distinction is the whole
 * criterion.** The beat below is a `setInterval` started when the run is claimed
 * and cleared in a `finally`, so it fires while an attempt is still in flight. If
 * the only write happened between stored attempts, the real gap would be bounded
 * by how long one attempt takes - a provider timeout, times up to three attempts,
 * plus backoff - which can exceed `STALE_RUN_SECONDS`. A live worker would then be
 * declared dead, a second worker would claim a run that is actively spending
 * money, and both would execute it. Do not move this write onto the attempt path.
 */
export const HEARTBEAT_INTERVAL_MS = 10_000

export interface WorkerDeps {
  readonly prisma: PrismaClient
  readonly credentials: ProviderCredentials
  readonly concurrencyPerProvider: number
  readonly coverageThreshold: number
  readonly staleRunSeconds: number
  readonly maxReclaims: number
  readonly signal?: AbortSignal
  /**
   * Test seams. The production path uses the adapter registry and the constant
   * above; a test overrides them so that the heartbeat can be *observed* firing
   * during a single long attempt rather than merely asserted from the constant.
   */
  readonly adapterFor?: (target: Target) => ProviderAdapter
  readonly heartbeatIntervalMs?: number
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

  // Started here, at claim, and stopped before the terminal status is written -
  // never on the attempt path. See the note on HEARTBEAT_INTERVAL_MS.
  //
  // `pendingBeat` exists because a beat is fire-and-forget: without tracking it,
  // an update already in flight can land *after* `finishRun` has cleared
  // `heartbeatAt`, leaving a terminal run with a heartbeat. That is cosmetic today
  // - the claim query matches on `status = 'running'`, so a finished run is not
  // reclaimable whatever its heartbeat says - but it is an ordering hazard, and it
  // made this project's own test flake in CI before it was fixed.
  let pendingBeat: Promise<void> = Promise.resolve()
  const beat = setInterval(() => {
    pendingBeat = heartbeat(deps.prisma, run.id).catch(() => {
      // A missed beat is recoverable: the run is reclaimed and resumed, never
      // restarted, so nothing is paid for twice.
    })
  }, deps.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS)

  try {
    const status = await executeRun(run, {
      prisma: deps.prisma,
      adapterFor: deps.adapterFor ?? ((target: Target) => adapterFor(target, deps.credentials)),
      concurrencyPerProvider: deps.concurrencyPerProvider,
      coverageThreshold: deps.coverageThreshold,
      heartbeat: () => heartbeat(deps.prisma, run.id),
      signal: deps.signal,
    })

    // Stop beating and let any in-flight beat land before the terminal status is
    // written, so the two cannot race.
    clearInterval(beat)
    await pendingBeat

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
  // Load .env exactly the way scripts/verify-live.ts does, and for the same
  // reason: the worker is a plain Node process, so nothing loads it for us the
  // way Next does for the web service. An absent file is not an error - Railway
  // injects the environment directly and there is no .env there.
  //
  // The db module is imported **after** this, dynamically, because it builds its
  // client at module-evaluation time: a static import would read DATABASE_URL
  // before this line ran and throw at load. That is the same ordering
  // scripts/verify-live.ts uses, for the same reason.
  try {
    process.loadEnvFile(path.join(process.cwd(), '.env'))
  } catch {
    // No .env on disk; fall through to the ambient environment.
  }

  const { assertDatabaseMajorVersion, prisma: defaultPrisma } = await import('../lib/db.ts')

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

/**
 * Executes a run's outstanding attempts and writes its terminal status.
 *
 * Concurrency is limited **per provider, per process**, because rate limits are
 * charged per provider. Known limitation: with W workers the effective limit
 * becomes W times this, since each process counts only itself. A shared limiter is
 * a v2 item (PLAN.md -> Deferred).
 */
import type { PrismaClient, Provider, RunStatus } from '@prisma/client'
import { findMentions } from '../parse/mentions.ts'
import type { ProviderAdapter, Target } from '../providers/types.ts'
import { plannedAttempts, plannedAttemptsPerTarget, remainingAttempts } from './plan.ts'
import { withRetries } from './retry.ts'

export interface RunnablePrompt {
  readonly id: string
  readonly text: string
}

export interface RunnableTarget {
  readonly id: string
  readonly provider: Provider
  readonly modelId: string
}

export interface RunnableRun {
  readonly id: string
  readonly repetitions: number
  readonly brandAliases: readonly string[]
  readonly brandCompetitors: readonly string[]
  readonly prompts: readonly RunnablePrompt[]
  readonly targets: readonly RunnableTarget[]
}

export interface ExecuteDeps {
  readonly prisma: PrismaClient
  readonly adapterFor: (target: Target) => ProviderAdapter
  readonly concurrencyPerProvider: number
  readonly coverageThreshold: number
  /** Refreshes the run's heartbeat; called as attempts complete (SPEC C15). */
  readonly heartbeat?: () => Promise<void>
  readonly signal?: AbortSignal
}

/** Minimal counting semaphore. */
function createSemaphore(limit: number): (task: () => Promise<void>) => Promise<void> {
  let active = 0
  const queue: (() => void)[] = []

  const release = (): void => {
    active -= 1
    const next = queue.shift()
    if (next) next()
  }

  return async function run(task: () => Promise<void>): Promise<void> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve))
    }
    active += 1
    try {
      await task()
    } finally {
      release()
    }
  }
}

/**
 * The terminal status of a run (SPEC -> Run status).
 *
 * `failed` has exactly two causes: no target reached the coverage threshold, or
 * the reclaim limit was exceeded. An ordinary failed call is neither of those —
 * that is `completed_with_errors` (CLAUDE.md rule 3).
 */
export function terminalStatus(input: {
  readonly successesPerTarget: ReadonlyMap<string, number>
  readonly plannedPerTarget: number
  readonly coverageThreshold: number
}): RunStatus {
  const { successesPerTarget, plannedPerTarget, coverageThreshold } = input

  if (plannedPerTarget === 0 || successesPerTarget.size === 0) return 'failed'

  const coverages = [...successesPerTarget.values()].map((n) => n / plannedPerTarget)
  const everyAttemptSucceeded = coverages.every((c) => c === 1)
  if (everyAttemptSucceeded) return 'completed'

  const anyTargetReachesThreshold = coverages.some((c) => c >= coverageThreshold)
  return anyTargetReachesThreshold ? 'completed_with_errors' : 'failed'
}

async function persistAttempt(
  deps: ExecuteDeps,
  run: RunnableRun,
  attempt: { runPromptId: string; runTargetId: string; repetition: number },
  adapter: ProviderAdapter,
  promptText: string,
): Promise<void> {
  const outcome = await withRetries(
    () => adapter.ask(promptText, deps.signal ?? new AbortController().signal),
    { signal: deps.signal },
  )

  const base = {
    runId: run.id,
    runPromptId: attempt.runPromptId,
    runTargetId: attempt.runTargetId,
    repetition: attempt.repetition,
    httpAttempts: outcome.httpAttempts,
  }

  try {
    if (!outcome.result.ok) {
      // A failed attempt is stored as a `failed` row with a reason. It is never
      // stored as an answer in which the brand happened to be absent, and it is
      // excluded from every numerator and denominator (CLAUDE.md rule 1).
      await deps.prisma.answer.create({
        data: { ...base, status: 'failed', failureReason: outcome.result.reason },
      })
      return
    }

    const result = outcome.result
    const mentions = findMentions(result.text, {
      aliases: run.brandAliases,
      competitors: run.brandCompetitors,
    })

    await deps.prisma.answer.create({
      data: {
        ...base,
        status: 'ok',
        rawText: result.text,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        searchCount: result.usage.searchCount,
        costMicros: result.costMicros,
        latencyMs: result.latencyMs,
        citations: {
          create: result.citations.map((citation, index) => ({
            url: citation.url,
            title: citation.title,
            order: index,
          })),
        },
        mentions: {
          create: mentions.map((mention) => ({
            brand: mention.brand,
            isSubject: mention.isSubject,
            position: mention.position,
            totalRecognised: mention.totalRecognised,
          })),
        },
      },
    })
  } catch (error) {
    // A unique-constraint violation means another worker already stored this
    // combination. That is the resume path working, not an error.
    if (isUniqueViolation(error)) return
    throw error
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

/**
 * Runs every outstanding attempt of `run` and returns the terminal status. It does
 * not write that status — the caller owns the run's lifecycle.
 */
export async function executeRun(run: RunnableRun, deps: ExecuteDeps): Promise<RunStatus> {
  const promptText = new Map(run.prompts.map((p) => [p.id, p.text]))
  const targetById = new Map(run.targets.map((t) => [t.id, t]))

  const planned = plannedAttempts(
    run.prompts.map((p) => p.id),
    run.targets.map((t) => t.id),
    run.repetitions,
  )

  const stored = await deps.prisma.answer.findMany({
    where: { runId: run.id },
    select: { runPromptId: true, runTargetId: true, repetition: true },
  })

  const outstanding = remainingAttempts(planned, stored)

  // One semaphore per provider, created lazily so nothing assumes how many
  // providers there are.
  const semaphores = new Map<Provider, ReturnType<typeof createSemaphore>>()
  const semaphoreFor = (provider: Provider): ReturnType<typeof createSemaphore> => {
    const existing = semaphores.get(provider)
    if (existing) return existing
    const created = createSemaphore(deps.concurrencyPerProvider)
    semaphores.set(provider, created)
    return created
  }

  await Promise.all(
    outstanding.map(async (attempt) => {
      const target = targetById.get(attempt.runTargetId)
      const text = promptText.get(attempt.runPromptId)
      if (!target || text === undefined) return

      await semaphoreFor(target.provider)(async () => {
        if (deps.signal?.aborted) return
        const adapter = deps.adapterFor({ provider: target.provider, modelId: target.modelId })
        await persistAttempt(deps, run, attempt, adapter, text)
        await deps.heartbeat?.()
      })
    }),
  )

  const successes = await deps.prisma.answer.groupBy({
    by: ['runTargetId'],
    where: { runId: run.id, status: 'ok' },
    _count: { _all: true },
  })

  // Every target counts, including one that stored nothing at all — otherwise a
  // provider that failed outright would silently drop out of the calculation.
  const successesPerTarget = new Map<string, number>(run.targets.map((t) => [t.id, 0]))
  for (const row of successes) {
    successesPerTarget.set(row.runTargetId, row._count._all)
  }

  return terminalStatus({
    successesPerTarget,
    plannedPerTarget: plannedAttemptsPerTarget(run.prompts.length, run.repetitions),
    coverageThreshold: deps.coverageThreshold,
  })
}

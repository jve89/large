/**
 * SPEC C15 - a stalled run is resumed, never restarted.
 *
 * The rule is that a reclaimed run "SHALL execute only the (prompt, target,
 * repetition) combinations that have no stored answer". The unique constraint on
 * Answer(runPromptId, runTargetId, repetition) is the last line of defence, not
 * the thing under test: an implementation that re-issued every call and let the
 * database reject the duplicate inserts would satisfy the constraint and still
 * have spent the money twice (CLAUDE.md rule 14).
 *
 * So this is proved twice, and the first is the one that matters:
 *   1. at the plan - `remainingAttempts` never contains a stored combination;
 *   2. at the call - the stub adapter's log shows the call was never made.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { executeRun, type RunnableRun } from '../../src/core/run/execute.ts'
import { plannedAttempts, remainingAttempts } from '../../src/core/run/plan.ts'
import { prisma } from '../../src/lib/db.ts'
import { alwaysOk, createStubAdapters, okResult } from '../helpers/stub-adapter.ts'

const PREFIX = `test-c15-${process.pid}-`
let companyId: string

interface Built {
  readonly run: RunnableRun
  readonly runId: string
}

/** A `running` run with `promptCount` prompts, both default-ish targets and N. */
async function buildRun(promptCount: number, repetitions: number): Promise<Built> {
  const created = await prisma.run.create({
    data: {
      companyId,
      status: 'running',
      repetitions,
      brandName: `${PREFIX}brand`,
      brandAliases: ['Acme'],
      brandCompetitors: ['Globex'],
      basisHash: `resume-${Math.random().toString(36).slice(2)}`,
      heartbeatAt: new Date(),
      prompts: {
        create: Array.from({ length: promptCount }, (_, i) => ({
          text: `prompt ${i}`,
          order: i,
        })),
      },
      targets: {
        create: [
          { provider: 'anthropic', modelId: 'claude-sonnet-5' },
          { provider: 'openai', modelId: 'gpt-5.6-terra' },
        ],
      },
    },
    include: { prompts: { orderBy: { order: 'asc' } }, targets: true },
  })

  return {
    runId: created.id,
    run: {
      id: created.id,
      repetitions: created.repetitions,
      brandAliases: created.brandAliases,
      brandCompetitors: created.brandCompetitors,
      prompts: created.prompts.map((p) => ({ id: p.id, text: p.text })),
      targets: created.targets.map((t) => ({
        id: t.id,
        provider: t.provider,
        modelId: t.modelId,
      })),
    },
  }
}

async function storeAnswer(
  built: Built,
  promptIndex: number,
  targetIndex: number,
  repetition: number,
  status: 'ok' | 'failed' = 'ok',
): Promise<void> {
  await prisma.answer.create({
    data: {
      runId: built.runId,
      runPromptId: built.run.prompts[promptIndex]!.id,
      runTargetId: built.run.targets[targetIndex]!.id,
      repetition,
      status,
      rawText: status === 'ok' ? 'already stored' : null,
      failureReason: status === 'failed' ? 'stored failure' : null,
      httpAttempts: 1,
    },
  })
}

const deps = (adapterFor: ReturnType<typeof alwaysOk>['adapterFor']) => ({
  prisma,
  adapterFor,
  concurrencyPerProvider: 4,
  coverageThreshold: 0.8,
})

beforeAll(async () => {
  const company = await prisma.company.create({
    data: { name: `${PREFIX}resume`, aliases: ['Acme'], competitors: ['Globex'] },
    select: { id: true },
  })
  companyId = company.id
})

afterAll(async () => {
  if (companyId) {
    await prisma.run.deleteMany({ where: { companyId } })
    await prisma.company.deleteMany({ where: { id: companyId } })
  }
  await prisma.$disconnect()
})

describe('the plan never contains a combination that is already stored', () => {
  it('drops exactly the stored combinations and keeps the rest', () => {
    const planned = plannedAttempts(['p1', 'p2'], ['t1', 't2'], 3)
    expect(planned).toHaveLength(12)

    const stored = [
      { runPromptId: 'p1', runTargetId: 't1', repetition: 1 },
      { runPromptId: 'p1', runTargetId: 't1', repetition: 2 },
      { runPromptId: 'p2', runTargetId: 't2', repetition: 3 },
    ]

    const remaining = remainingAttempts(planned, stored)
    expect(remaining).toHaveLength(9)

    for (const done of stored) {
      expect(
        remaining.some(
          (a) =>
            a.runPromptId === done.runPromptId &&
            a.runTargetId === done.runTargetId &&
            a.repetition === done.repetition,
        ),
      ).toBe(false)
    }
  })

  it('returns nothing at all when every combination is stored', () => {
    const planned = plannedAttempts(['p1'], ['t1'], 2)
    expect(remainingAttempts(planned, planned)).toEqual([])
  })

  it('treats a repetition of one combination as distinct from another', () => {
    const planned = plannedAttempts(['p1'], ['t1'], 3)
    const remaining = remainingAttempts(planned, [
      { runPromptId: 'p1', runTargetId: 't1', repetition: 2 },
    ])
    expect(remaining.map((a) => a.repetition)).toEqual([1, 3])
  })
})

describe('executeRun resumes rather than restarting', () => {
  it('issues only the calls with no stored answer, and never re-buys one', async () => {
    // 2 prompts x 2 targets x N=2 = 8 planned. Store 3 of them.
    const built = await buildRun(2, 2)
    await storeAnswer(built, 0, 0, 1)
    await storeAnswer(built, 0, 0, 2)
    await storeAnswer(built, 1, 1, 1)

    const stub = alwaysOk()
    await executeRun(built.run, deps(stub.adapterFor))

    // Five calls, not eight: the three already paid for were not made again.
    expect(stub.calls).toHaveLength(5)

    // And specifically: nothing was asked for the combination that already had
    // two stored answers against the first target.
    const anthropicPrompt0 = stub.calls.filter(
      (c) => c.provider === 'anthropic' && c.prompt === 'prompt 0',
    )
    expect(anthropicPrompt0).toHaveLength(0)

    const total = await prisma.answer.count({ where: { runId: built.runId } })
    expect(total).toBe(8)
  })

  it('counts a stored FAILED answer as already paid for and does not retry it', async () => {
    const built = await buildRun(1, 2)
    // Both repetitions against the first target already failed. A failed call has
    // been billed just like a successful one (CLAUDE.md rule 14).
    await storeAnswer(built, 0, 0, 1, 'failed')
    await storeAnswer(built, 0, 0, 2, 'failed')

    const stub = alwaysOk()
    await executeRun(built.run, deps(stub.adapterFor))

    expect(stub.calls.filter((c) => c.provider === 'anthropic')).toHaveLength(0)
    expect(stub.calls.filter((c) => c.provider === 'openai')).toHaveLength(2)
  })

  it('makes no calls at all when the run is already complete', async () => {
    const built = await buildRun(1, 1)
    await storeAnswer(built, 0, 0, 1)
    await storeAnswer(built, 0, 1, 1)

    const stub = alwaysOk()
    await executeRun(built.run, deps(stub.adapterFor))

    expect(stub.calls).toEqual([])
  })

  it('executes every combination when nothing is stored yet', async () => {
    const built = await buildRun(2, 3)

    const stub = alwaysOk()
    await executeRun(built.run, deps(stub.adapterFor))

    // 2 prompts x 2 targets x N=3.
    expect(stub.calls).toHaveLength(12)
    expect(await prisma.answer.count({ where: { runId: built.runId } })).toBe(12)
  })

  it('sends the prompt text unmodified', async () => {
    const built = await buildRun(1, 1)
    const stub = alwaysOk()
    await executeRun(built.run, deps(stub.adapterFor))

    // No system prompt, no wrapper, no instruction appended (CLAUDE.md rule 6).
    expect(stub.calls.map((c) => c.prompt)).toEqual(['prompt 0', 'prompt 0'])
  })
})

describe('the heartbeat is refreshed as work completes (C15)', () => {
  it('calls the injected heartbeat at least once per stored attempt', async () => {
    const built = await buildRun(2, 1)
    let beats = 0

    const stub = alwaysOk()
    await executeRun(built.run, {
      ...deps(stub.adapterFor),
      heartbeat: async () => {
        beats += 1
      },
    })

    // 2 prompts x 2 targets x N=1 = 4 attempts.
    expect(stub.calls).toHaveLength(4)
    expect(beats).toBeGreaterThanOrEqual(4)
  })
})

describe('the per-provider concurrency limit', () => {
  it('never exceeds the limit for one provider', async () => {
    const built = await buildRun(6, 2)
    const LIMIT = 2

    let anthropicInFlight = 0
    let anthropicPeak = 0
    let openaiInFlight = 0
    let openaiPeak = 0

    const stub = createStubAdapters((call) => {
      if (call.provider === 'anthropic') {
        anthropicInFlight += 1
        anthropicPeak = Math.max(anthropicPeak, anthropicInFlight)
      } else {
        openaiInFlight += 1
        openaiPeak = Math.max(openaiPeak, openaiInFlight)
      }
      return okResult('an answer')
    })

    // The stub above increments synchronously and the adapter resolves
    // immediately, so decrement after the await inside a wrapper.
    const countingAdapterFor = (target: Parameters<typeof stub.adapterFor>[0]) => {
      const inner = stub.adapterFor(target)
      return {
        ...inner,
        ask: async (prompt: string, signal: AbortSignal) => {
          const result = await inner.ask(prompt, signal)
          await new Promise((resolve) => setTimeout(resolve, 5))
          if (target.provider === 'anthropic') anthropicInFlight -= 1
          else openaiInFlight -= 1
          return result
        },
      }
    }

    await executeRun(built.run, {
      ...deps(countingAdapterFor),
      concurrencyPerProvider: LIMIT,
    })

    expect(anthropicPeak).toBeLessThanOrEqual(LIMIT)
    expect(openaiPeak).toBeLessThanOrEqual(LIMIT)
    // ...and the limit is per provider, so both were allowed to run at once.
    expect(anthropicPeak).toBeGreaterThan(0)
    expect(openaiPeak).toBeGreaterThan(0)
  })
})

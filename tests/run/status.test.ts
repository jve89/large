/**
 * SPEC -> Run status, and CLAUDE.md rule 3.
 *
 * The boundaries here are where this phase would go wrong quietly, because every
 * wrong answer is still a valid status:
 *
 *   - `completed`              every attempt succeeded
 *   - `completed_with_errors`  some failed, but at least one target is at or above
 *                              the coverage threshold
 *   - `failed`                 no target reached the threshold, OR the reclaim
 *                              limit was exceeded - and nothing else
 *
 * An ordinary failed call is **not** a cause of `failed`. And coverage's
 * denominator is the *planned* attempts for a target - prompts x N - never the
 * number of stored rows, or a run abandoned early would report the most flattering
 * possible reading of the worst possible run.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { executeRun, terminalStatus, type RunnableRun } from '../../src/core/run/execute.ts'
import { processNextRun } from '../../src/worker/index.ts'
import { prisma } from '../../src/lib/db.ts'
import { sweepByPrefix } from '../helpers/cleanup.ts'
import { alwaysOk, createStubAdapters, failedResult, okResult } from '../helpers/stub-adapter.ts'

const PREFIX = `test-status-${process.pid}-`
let companyId: string

const CREDENTIALS = { anthropicApiKey: 'unused', openaiApiKey: 'unused' }

interface Built {
  readonly run: RunnableRun
  readonly runId: string
}

async function buildRun(
  promptCount: number,
  repetitions: number,
  overrides: { status?: 'queued' | 'running'; reclaimCount?: number; heartbeatAt?: Date } = {},
): Promise<Built> {
  const created = await prisma.run.create({
    data: {
      companyId,
      status: overrides.status ?? 'running',
      repetitions,
      reclaimCount: overrides.reclaimCount ?? 0,
      heartbeatAt: overrides.heartbeatAt ?? new Date(),
      brandName: `${PREFIX}brand`,
      brandAliases: ['Acme'],
      brandCompetitors: ['Globex'],
      basisHash: `status-${Math.random().toString(36).slice(2)}`,
      prompts: {
        create: Array.from({ length: promptCount }, (_, i) => ({ text: `prompt ${i}`, order: i })),
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
      targets: created.targets.map((t) => ({ id: t.id, provider: t.provider, modelId: t.modelId })),
    },
  }
}

const deps = (adapterFor: ReturnType<typeof alwaysOk>['adapterFor'], coverageThreshold = 0.8) => ({
  prisma,
  adapterFor,
  concurrencyPerProvider: 4,
  coverageThreshold,
})

beforeAll(async () => {
  const company = await prisma.company.create({
    data: { name: `${PREFIX}status`, aliases: ['Acme'], competitors: ['Globex'] },
    select: { id: true },
  })
  companyId = company.id
})

afterAll(async () => {
  if (companyId) {
  await sweepByPrefix(prisma, PREFIX)
  }
  await prisma.$disconnect()
})

/**
 * The case PLAN names explicitly, written first because it is the one that looks
 * most like `completed_with_errors` and is not.
 */
describe('a run killed by the reclaim limit', () => {
  it('is `failed` even at full coverage, and spends no further calls', async () => {
    // Every attempt already stored and successful: coverage is 100% on both
    // targets. Only the reclaim count is wrong.
    const built = await buildRun(1, 1, {
      status: 'running',
      reclaimCount: 99,
      heartbeatAt: new Date(Date.now() - 60 * 60 * 1000),
    })

    for (const target of built.run.targets) {
      await prisma.answer.create({
        data: {
          runId: built.runId,
          runPromptId: built.run.prompts[0]!.id,
          runTargetId: target.id,
          repetition: 1,
          status: 'ok',
          rawText: 'stored',
          httpAttempts: 1,
        },
      })
    }

    const answersBefore = await prisma.answer.count({ where: { runId: built.runId } })

    // `processNextRun` builds its adapters from the real registry, so there is no
    // stub to inject here. That is the point: the credentials below are junk, so
    // if this path reached a provider at all it would fail the call and store a
    // `failed` answer row. The row count is therefore the honest assertion that
    // no call was attempted - a stub that was never wired in would report zero
    // calls whether the code was right or wrong.
    const processed = await processNextRun({
      prisma,
      credentials: CREDENTIALS,
      concurrencyPerProvider: 4,
      coverageThreshold: 0.8,
      staleRunSeconds: 60,
      maxReclaims: 3,
    })

    expect(processed?.runId).toBe(built.runId)
    expect(processed?.status).toBe('failed')

    const run = await prisma.run.findUniqueOrThrow({ where: { id: built.runId } })
    expect(run.status).toBe('failed')
    expect(run.failureReason).toContain('reclaimed')
    expect(run.failureReason).toContain('limit')

    // No further provider calls were spent on it: not one new answer row.
    expect(await prisma.answer.count({ where: { runId: built.runId } })).toBe(answersBefore)
  })
})

describe('terminalStatus - the three outcomes', () => {
  const planned = 10

  it('is `completed` when every planned attempt succeeded', () => {
    expect(
      terminalStatus({
        successesPerTarget: new Map([
          ['a', 10],
          ['b', 10],
        ]),
        plannedPerTarget: planned,
        coverageThreshold: 0.8,
      }),
    ).toBe('completed')
  })

  it('is `completed_with_errors` when some failed but a target still reaches the threshold', () => {
    expect(
      terminalStatus({
        successesPerTarget: new Map([
          ['a', 10],
          ['b', 9],
        ]),
        plannedPerTarget: planned,
        coverageThreshold: 0.8,
      }),
    ).toBe('completed_with_errors')
  })

  it('is `completed_with_errors` when one provider degraded completely and the other did not', () => {
    // The whole reason coverage is per target: a run where one provider died
    // still yields a valid measurement from the other, and a run-wide coverage
    // number would discard it.
    expect(
      terminalStatus({
        successesPerTarget: new Map([
          ['a', 10],
          ['b', 0],
        ]),
        plannedPerTarget: planned,
        coverageThreshold: 0.8,
      }),
    ).toBe('completed_with_errors')
  })

  it('is `failed` when no target reaches the threshold', () => {
    expect(
      terminalStatus({
        successesPerTarget: new Map([
          ['a', 7],
          ['b', 5],
        ]),
        plannedPerTarget: planned,
        coverageThreshold: 0.8,
      }),
    ).toBe('failed')
  })

  it('treats exactly the threshold as reaching it - "at or above"', () => {
    expect(
      terminalStatus({
        successesPerTarget: new Map([['a', 8]]),
        plannedPerTarget: planned,
        coverageThreshold: 0.8,
      }),
    ).toBe('completed_with_errors')
  })

  it('treats one attempt below the threshold as failing it', () => {
    expect(
      terminalStatus({
        successesPerTarget: new Map([['a', 7]]),
        plannedPerTarget: planned,
        coverageThreshold: 0.8,
      }),
    ).toBe('failed')
  })

  it('is `failed` when a target stored nothing at all', () => {
    expect(
      terminalStatus({
        successesPerTarget: new Map([
          ['a', 0],
          ['b', 0],
        ]),
        plannedPerTarget: planned,
        coverageThreshold: 0.8,
      }),
    ).toBe('failed')
  })
})

/**
 * CLAUDE.md rule 3, the most-repeated rule in the pack: coverage's denominator is
 * the **planned** attempts for a target, never the number of stored rows.
 */
describe('coverage is measured against the plan, not against what was stored', () => {
  it('does not call a run `completed` because the few attempts it made succeeded', () => {
    // A run of 12 planned attempts per target that stored 2, both successful.
    // Against stored rows this is 100%; against the plan it is 17%.
    expect(
      terminalStatus({
        successesPerTarget: new Map([
          ['a', 2],
          ['b', 2],
        ]),
        plannedPerTarget: 12,
        coverageThreshold: 0.8,
      }),
    ).toBe('failed')
  })

  it('is `failed` when there was nothing to plan', () => {
    expect(
      terminalStatus({
        successesPerTarget: new Map([['a', 0]]),
        plannedPerTarget: 0,
        coverageThreshold: 0.8,
      }),
    ).toBe('failed')
  })
})

describe('executeRun end to end, against stubbed providers', () => {
  it('returns `completed` when every call succeeds', async () => {
    const built = await buildRun(2, 2)
    const status = await executeRun(built.run, deps(alwaysOk().adapterFor))
    expect(status).toBe('completed')
    expect(await prisma.answer.count({ where: { runId: built.runId, status: 'ok' } })).toBe(8)
  })

  it('returns `completed_with_errors` when one provider fails every call', async () => {
    const built = await buildRun(5, 1)
    const stub = createStubAdapters((call) =>
      call.provider === 'openai' ? failedResult('provider down') : okResult('fine'),
    )

    const status = await executeRun(built.run, deps(stub.adapterFor))
    expect(status).toBe('completed_with_errors')

    // A failed attempt is stored as a `failed` row with a reason - never as an
    // answer in which the brand happened to be absent (CLAUDE.md rule 1).
    const failed = await prisma.answer.findMany({
      where: { runId: built.runId, status: 'failed' },
    })
    expect(failed).toHaveLength(5)
    expect(failed.every((a) => a.failureReason === 'provider down')).toBe(true)
    expect(failed.every((a) => a.rawText === null)).toBe(true)
  })

  it('returns `failed` when every call fails, and stores a row for each', async () => {
    const built = await buildRun(2, 1)
    const stub = createStubAdapters(() => failedResult('everything is down'))

    const status = await executeRun(built.run, deps(stub.adapterFor))
    expect(status).toBe('failed')

    expect(await prisma.answer.count({ where: { runId: built.runId } })).toBe(4)
    expect(await prisma.answer.count({ where: { runId: built.runId, status: 'ok' } })).toBe(0)
  })

  it('an ordinary failed call alone does not make a run `failed`', async () => {
    // 10 attempts per target; one fails. Coverage 90% > 80%, so this is
    // `completed_with_errors` and emphatically not `failed`.
    const built = await buildRun(10, 1)
    let seen = 0
    const stub = createStubAdapters((call) => {
      if (call.provider === 'anthropic') {
        seen += 1
        if (seen === 1) return failedResult('one transient failure')
      }
      return okResult('fine')
    })

    const status = await executeRun(built.run, deps(stub.adapterFor))
    expect(status).toBe('completed_with_errors')
  })
})

/**
 * SPEC C6 / CLAUDE.md rule 11. `withRetries` is unit-tested in run/retry.test.ts;
 * what is checked here is the other half of the rule - that the attempts actually
 * spent are written to the row, so an off-by-one is visible in the data and in the
 * bill rather than only in the code.
 */
describe('httpAttempts is persisted on the answer row', () => {
  it('records one attempt when the first call succeeds', async () => {
    const built = await buildRun(1, 1)
    await executeRun(built.run, deps(alwaysOk().adapterFor))

    const answers = await prisma.answer.findMany({ where: { runId: built.runId } })
    expect(answers).toHaveLength(2)
    expect(answers.every((a) => a.httpAttempts === 1)).toBe(true)
  })

  it('records three attempts when every call is retryable, not four', async () => {
    const built = await buildRun(1, 1)
    const stub = createStubAdapters(() => failedResult('rate limited', true))

    await executeRun(built.run, deps(stub.adapterFor))

    // Three attempts in total - the initial call plus two retries.
    expect(stub.calls).toHaveLength(6) // 2 targets x 3 attempts
    const answers = await prisma.answer.findMany({ where: { runId: built.runId } })
    expect(answers.every((a) => a.httpAttempts === 3)).toBe(true)
  })

  it('does not retry a non-retryable failure, and records the single attempt', async () => {
    const built = await buildRun(1, 1)
    // A web search error object is HTTP 200: the call worked and the search did
    // not, so retrying buys nothing.
    const stub = createStubAdapters(() => failedResult('web search error object', false))

    await executeRun(built.run, deps(stub.adapterFor))

    expect(stub.calls).toHaveLength(2)
    const answers = await prisma.answer.findMany({ where: { runId: built.runId } })
    expect(answers.every((a) => a.httpAttempts === 1)).toBe(true)
  })
})

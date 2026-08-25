/**
 * SPEC C5 - record every attempt.
 *
 * One obligation seen three ways, and all three are the same rule: **never let a
 * failure look like a measurement.**
 *
 *   - every completed attempt becomes exactly one Answer row with its figures;
 *   - a failed attempt is a `failed` row with a reason, never an answer in which
 *     the brand happened to be absent;
 *   - a web-search error object is a failed attempt, never an answer carrying zero
 *     citations.
 *
 * The third is checked here against the database, and in parse/citations.test.ts
 * against stored provider responses. It needs both: one proves the adapter reads
 * the shape correctly, the other proves the row that results is right.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { interpretAnthropicMessage } from '../../src/core/providers/anthropic.ts'
import { executeRun, type RunnableRun } from '../../src/core/run/execute.ts'
import { GET as getRun } from '../../src/app/api/runs/[runId]/route.ts'
import { prisma } from '../../src/lib/db.ts'
import { createStubAdapters, failedResult, okResult } from '../helpers/stub-adapter.ts'
import { loadFixture } from '../helpers/fixtures.ts'

type AnthropicMessage = Anthropic.Messages.Message

const PREFIX = `test-c5-${process.pid}-`
let companyId: string

interface Built {
  readonly run: RunnableRun
  readonly runId: string
}

async function buildRun(promptCount = 1, repetitions = 1): Promise<Built> {
  const created = await prisma.run.create({
    data: {
      companyId,
      status: 'running',
      repetitions,
      heartbeatAt: new Date(),
      brandName: `${PREFIX}brand`,
      brandAliases: ['Slack'],
      brandCompetitors: ['Microsoft Teams'],
      basisHash: `c5-${Math.random().toString(36).slice(2)}`,
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

const deps = (adapterFor: ReturnType<typeof createStubAdapters>['adapterFor']) => ({
  prisma,
  adapterFor,
  concurrencyPerProvider: 4,
  coverageThreshold: 0.8,
})

beforeAll(async () => {
  const company = await prisma.company.create({
    data: { name: `${PREFIX}answers`, aliases: ['Slack'], competitors: ['Microsoft Teams'] },
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

describe('a successful attempt stores every figure C5 names', () => {
  it('stores status, raw text, repetition, tokens, searches, cost and latency', async () => {
    const built = await buildRun(1, 1)
    const stub = createStubAdapters(() =>
      okResult('Slack is a good option, as is Microsoft Teams.', {
        usage: { inputTokens: 1234, outputTokens: 567, searchCount: 3 },
        costMicros: 98_765n,
        latencyMs: 4321,
      }),
    )

    await executeRun(built.run, deps(stub.adapterFor))

    const answer = await prisma.answer.findFirstOrThrow({
      where: { runId: built.runId },
      include: { runTarget: true },
    })

    expect(answer.status).toBe('ok')
    expect(answer.rawText).toBe('Slack is a good option, as is Microsoft Teams.')
    expect(answer.failureReason).toBeNull()
    expect(answer.repetition).toBe(1)
    expect(answer.inputTokens).toBe(1234)
    expect(answer.outputTokens).toBe(567)
    expect(answer.searchCount).toBe(3)
    expect(answer.costMicros).toBe(98_765n)
    expect(answer.latencyMs).toBe(4321)
    expect(answer.httpAttempts).toBe(1)
    expect(answer.createdAt).toBeInstanceOf(Date)
  })

  /**
   * C5 says the row carries "the provider, the model id". `Answer` has neither
   * column: both live on `RunTarget`, and the row **reaches** them through
   * `runTargetId`. That is deliberate - ARCHITECTURE.md -> Key decisions keeps one
   * foreign-key chain to Company and explicitly rejected denormalising columns the
   * v1 read path does not need. This test pins the reading, so "carries" is never
   * quietly implemented as two new columns.
   */
  it('reaches the provider and model id through RunTarget rather than storing them', async () => {
    const built = await buildRun(1, 1)
    await executeRun(built.run, deps(createStubAdapters(() => okResult('answer')).adapterFor))

    const answers = await prisma.answer.findMany({
      where: { runId: built.runId },
      include: { runTarget: true },
    })

    expect(answers.map((a) => a.runTarget.provider).sort()).toEqual(['anthropic', 'openai'])
    expect(answers.map((a) => a.runTarget.modelId).sort()).toEqual([
      'claude-sonnet-5',
      'gpt-5.6-terra',
    ])

    // ...and they are genuinely not columns on Answer.
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'Answer'
    `
    const names = columns.map((c) => c.column_name)
    expect(names).not.toContain('provider')
    expect(names).not.toContain('modelId')
    expect(names).toContain('runTargetId')
  })

  it('stores exactly one row per (prompt, target, repetition)', async () => {
    const built = await buildRun(2, 3)
    await executeRun(built.run, deps(createStubAdapters(() => okResult('answer')).adapterFor))

    // 2 prompts x 2 targets x N=3.
    expect(await prisma.answer.count({ where: { runId: built.runId } })).toBe(12)

    const rows = await prisma.answer.findMany({
      where: { runId: built.runId },
      select: { runPromptId: true, runTargetId: true, repetition: true },
    })
    const keys = rows.map((r) => `${r.runPromptId}|${r.runTargetId}|${r.repetition}`)
    expect(new Set(keys).size).toBe(12)
  })
})

describe('a failed attempt is a failure, not an absent brand', () => {
  it('stores status failed with a reason, no raw text and no mentions', async () => {
    const built = await buildRun(1, 1)
    const stub = createStubAdapters(() => failedResult('provider exploded'))

    await executeRun(built.run, deps(stub.adapterFor))

    const answers = await prisma.answer.findMany({
      where: { runId: built.runId },
      include: { mentions: true, citations: true },
    })
    expect(answers).toHaveLength(2)

    for (const answer of answers) {
      expect(answer.status).toBe('failed')
      expect(answer.failureReason).toBe('provider exploded')
      expect(answer.rawText).toBeNull()
      // The row must not read as "the brand was not mentioned": there is nothing
      // to have mentioned it in.
      expect(answer.mentions).toEqual([])
      expect(answer.citations).toEqual([])
      // Figures a failed call has no honest value for stay null rather than zero.
      expect(answer.inputTokens).toBeNull()
      expect(answer.outputTokens).toBeNull()
      expect(answer.searchCount).toBeNull()
      expect(answer.costMicros).toBeNull()
    }
  })

  it('records a failed attempt for every planned combination, not none', async () => {
    const built = await buildRun(2, 2)
    await executeRun(built.run, deps(createStubAdapters(() => failedResult('down')).adapterFor))

    // Failures are recorded, not skipped: coverage needs to know they happened.
    expect(await prisma.answer.count({ where: { runId: built.runId } })).toBe(8)
    expect(await prisma.answer.count({ where: { runId: built.runId, status: 'ok' } })).toBe(0)
  })
})

/**
 * Rule 8 at the row level. The pair of tests below is the whole point: an error
 * object and a genuinely uncited answer must produce *different rows*, because
 * once they collapse the difference is unrecoverable.
 */
describe('a search error and an answer that cited nothing are different rows', () => {
  it('an error-object response becomes a failed row with zero citations', async () => {
    const built = await buildRun(1, 1)
    const fixture = loadFixture<AnthropicMessage>('anthropic-search-error')
    const interpreted = interpretAnthropicMessage(fixture.response, fixture.meta.modelId, 10)
    expect(interpreted.ok).toBe(false)

    await executeRun(built.run, deps(createStubAdapters(() => interpreted).adapterFor))

    const answers = await prisma.answer.findMany({
      where: { runId: built.runId },
      include: { citations: true },
    })
    for (const answer of answers) {
      expect(answer.status).toBe('failed')
      expect(answer.failureReason).toContain('web search failed')
      expect(answer.citations).toEqual([])
      expect(answer.rawText).toBeNull()
    }
  })

  it('an answer that searched and cited nothing becomes an ok row with zero citations', async () => {
    const built = await buildRun(1, 1)
    const fixture = loadFixture<AnthropicMessage>('anthropic-no-citations')
    const interpreted = interpretAnthropicMessage(fixture.response, fixture.meta.modelId, 10)
    expect(interpreted.ok).toBe(true)

    await executeRun(built.run, deps(createStubAdapters(() => interpreted).adapterFor))

    const answers = await prisma.answer.findMany({
      where: { runId: built.runId },
      include: { citations: true },
    })
    for (const answer of answers) {
      expect(answer.status).toBe('ok')
      expect(answer.failureReason).toBeNull()
      expect(answer.citations).toEqual([])
      // The difference that must survive: there IS an answer here.
      expect(answer.rawText).not.toBeNull()
      expect((answer.rawText ?? '').length).toBeGreaterThan(0)
    }
  })
})

describe('citations are stored per answer, in the provider order', () => {
  it('stores url, title and a contiguous 0-based order', async () => {
    const built = await buildRun(1, 1)
    const stub = createStubAdapters(() =>
      okResult('an answer', {
        citations: [
          { url: 'https://first.example/a', title: 'First' },
          { url: 'https://second.example/b', title: null },
          { url: 'https://third.example/c', title: 'Third' },
        ],
      }),
    )

    await executeRun(built.run, deps(stub.adapterFor))

    const answer = await prisma.answer.findFirstOrThrow({
      where: { runId: built.runId },
      include: { citations: { orderBy: { order: 'asc' } } },
    })

    expect(answer.citations.map((c) => c.url)).toEqual([
      'https://first.example/a',
      'https://second.example/b',
      'https://third.example/c',
    ])
    expect(answer.citations.map((c) => c.order)).toEqual([0, 1, 2])
    expect(answer.citations[1]?.title).toBeNull()
  })

  it('stores citations from a real captured response', async () => {
    const built = await buildRun(1, 1)
    const fixture = loadFixture<AnthropicMessage>('anthropic-ok')
    const interpreted = interpretAnthropicMessage(fixture.response, fixture.meta.modelId, 10)
    expect(interpreted.ok).toBe(true)

    await executeRun(built.run, deps(createStubAdapters(() => interpreted).adapterFor))

    const answer = await prisma.answer.findFirstOrThrow({
      where: { runId: built.runId },
      include: { citations: { orderBy: { order: 'asc' } } },
    })
    expect(answer.citations.length).toBeGreaterThan(0)
    expect(answer.citations.map((c) => c.order)).toEqual(
      answer.citations.map((_, index) => index),
    )
    expect(new Set(answer.citations.map((c) => c.url)).size).toBe(answer.citations.length)
  })
})

/**
 * Money is integer micro-dollars, and `costMicros` is a `BigInt` all the way
 * through. That is right, and it has one sharp edge: **`JSON.stringify` throws on
 * a BigInt.** A value that round-trips perfectly through Prisma and asserts
 * cleanly in a test will throw inside a route handler the moment it is serialised.
 *
 * Today no API route returns `costMicros` - `GET /api/runs/:runId` returns status
 * and progress only, and the run page renders server-side without JSON. So the
 * crossing does not exist yet; C12 in Phase 7 is what creates it. These tests pin
 * both halves: that the hazard is real, and that the endpoint which will carry the
 * figure is currently clean.
 */
describe('BigInt at the API boundary', () => {
  it('demonstrates the hazard: JSON.stringify throws on a BigInt', () => {
    expect(() => JSON.stringify({ costMicros: 1n })).toThrow(TypeError)
  })

  it('survives a database round-trip as an exact integer', async () => {
    const built = await buildRun(1, 1)
    // Larger than Number.MAX_SAFE_INTEGER, so a float would lose precision.
    const huge = 9_007_199_254_740_993n
    await executeRun(
      built.run,
      deps(createStubAdapters(() => okResult('answer', { costMicros: huge })).adapterFor),
    )

    const answer = await prisma.answer.findFirstOrThrow({ where: { runId: built.runId } })
    expect(answer.costMicros).toBe(huge)
    expect(typeof answer.costMicros).toBe('bigint')
  })

  it('the run endpoint serialises without throwing while answers carry costMicros', async () => {
    const built = await buildRun(1, 1)
    await executeRun(
      built.run,
      deps(createStubAdapters(() => okResult('answer', { costMicros: 123_456n })).adapterFor),
    )

    const response = await getRun(new Request('http://localhost'), {
      params: Promise.resolve({ runId: built.runId }),
    })
    expect(response.status).toBe(200)

    // Reading the body is what would throw if a BigInt had leaked into it.
    const body = (await response.json()) as { progress: { done: number; total: number } }
    expect(body.progress.done).toBe(2)

    // Phase 7 adds totals here (C12). When it does, it must convert - a raw
    // BigInt in this payload turns a working endpoint into a 500.
    expect(JSON.stringify(body)).toBeTypeOf('string')
  })
})

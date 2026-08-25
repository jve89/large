/**
 * SPEC C15 - "WHILE a worker is executing a run, it SHALL refresh that run's
 * heartbeat at least every fifteen seconds."
 *
 * Phase 4 reported this clause as holding on the strength of the constant being
 * 10s. That was the wrong justification even though the answer was right, so the
 * clause is re-proved here by **observation**: the heartbeat must advance while a
 * single attempt is still in flight and no answer row has been written.
 *
 * The distinction is the whole criterion. There are two ways to write a heartbeat:
 *
 *   (a) a timer started at claim and cleared at finish, independent of progress -
 *       then the gap between writes is the interval, and the clause holds;
 *   (b) a write between stored attempts - then the gap is bounded by how long one
 *       attempt takes, which is a provider timeout times up to three attempts plus
 *       backoff, and can exceed STALE_RUN_SECONDS.
 *
 * Under (b) a live worker gets declared dead, a second worker claims a run that is
 * actively spending money, both execute it, and `finishRun` races a reclaim - one
 * bug wearing four hats. The implementation is (a); this test is what stops a
 * later refactor from quietly turning it into (b), because under (b) the
 * observation below fails while every constant still looks correct.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { HEARTBEAT_INTERVAL_MS, processNextRun } from '../../src/worker/index.ts'
import { createStubAdapters, okResult } from '../helpers/stub-adapter.ts'
import { prisma } from '../../src/lib/db.ts'

const PREFIX = `test-hb-${process.pid}-`
let companyId: string

const CREDENTIALS = { anthropicApiKey: 'unused', openaiApiKey: 'unused' }

async function makeQueuedRun(): Promise<string> {
  const run = await prisma.run.create({
    data: {
      companyId,
      status: 'queued',
      repetitions: 1,
      brandName: `${PREFIX}brand`,
      brandAliases: ['Acme'],
      brandCompetitors: [],
      basisHash: `hb-${Math.random().toString(36).slice(2)}`,
      prompts: { create: [{ text: 'a prompt', order: 0 }] },
      targets: { create: [{ provider: 'anthropic', modelId: 'claude-sonnet-5' }] },
    },
    select: { id: true },
  })
  return run.id
}

beforeAll(async () => {
  const company = await prisma.company.create({
    data: { name: `${PREFIX}heartbeat`, aliases: ['Acme'], competitors: [] },
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

describe('the heartbeat is driven by wall-clock, not by attempt progress', () => {
  it('advances repeatedly while one attempt is still in flight', async () => {
    await prisma.run.deleteMany({ where: { companyId } })
    const runId = await makeQueuedRun()

    const BEAT_MS = 40
    const ATTEMPT_MS = 500

    const observed: number[] = []

    // One attempt that takes far longer than several beats, and writes nothing
    // until it resolves. Under mechanism (b) the heartbeat would not move at all
    // for the whole of ATTEMPT_MS.
    const stub = createStubAdapters(() => okResult('an answer'))
    const slowAdapterFor = (target: Parameters<typeof stub.adapterFor>[0]) => {
      const inner = stub.adapterFor(target)
      return {
        ...inner,
        ask: async (prompt: string, signal: AbortSignal) => {
          const started = Date.now()
          while (Date.now() - started < ATTEMPT_MS) {
            await new Promise((resolve) => setTimeout(resolve, 20))
            const row = await prisma.run.findUnique({
              where: { id: runId },
              select: { heartbeatAt: true },
            })
            const beat = row?.heartbeatAt?.getTime()
            if (beat !== undefined && !observed.includes(beat)) observed.push(beat)
            // No answer row exists yet: nothing has completed.
            expect(await prisma.answer.count({ where: { runId } })).toBe(0)
          }
          return inner.ask(prompt, signal)
        },
      }
    }

    const processed = await processNextRun({
      prisma,
      credentials: CREDENTIALS,
      concurrencyPerProvider: 4,
      coverageThreshold: 0.8,
      staleRunSeconds: 120,
      maxReclaims: 3,
      adapterFor: slowAdapterFor,
      heartbeatIntervalMs: BEAT_MS,
    })

    expect(processed?.runId).toBe(runId)

    // The claim writes one heartbeat; the timer must have written several more
    // during the single in-flight attempt.
    expect(
      observed.length,
      `heartbeat advanced ${observed.length} time(s) during a ${ATTEMPT_MS}ms attempt ` +
        `at a ${BEAT_MS}ms interval - a per-attempt heartbeat would give 1`,
    ).toBeGreaterThan(3)

    // And no gap between consecutive writes exceeded a generous multiple of the
    // interval, so the beat is regular rather than bunched at the end.
    for (let i = 1; i < observed.length; i += 1) {
      expect(observed[i]! - observed[i - 1]!).toBeLessThan(BEAT_MS * 10)
    }
  })

  it('stops beating once the run is finished', async () => {
    await prisma.run.deleteMany({ where: { companyId } })
    const runId = await makeQueuedRun()

    const stub = createStubAdapters(() => okResult('an answer'))
    await processNextRun({
      prisma,
      credentials: CREDENTIALS,
      concurrencyPerProvider: 4,
      coverageThreshold: 0.8,
      staleRunSeconds: 120,
      maxReclaims: 3,
      adapterFor: stub.adapterFor,
      heartbeatIntervalMs: 20,
    })

    // finishRun clears the beat; the interval is cleared in a `finally`, so a
    // leaked timer would re-populate this within a few milliseconds.
    const after = await prisma.run.findUniqueOrThrow({ where: { id: runId } })
    expect(after.heartbeatAt).toBeNull()

    await new Promise((resolve) => setTimeout(resolve, 150))
    const later = await prisma.run.findUniqueOrThrow({ where: { id: runId } })
    expect(later.heartbeatAt, 'the beat timer outlived the run').toBeNull()
  })
})

/**
 * The inequality that has to hold between the three constants. Asserting the
 * interval alone against the threshold would say nothing about the real gap
 * between writes; it is meaningful *because* the test above establishes that the
 * gap is the interval and not the attempt duration.
 */
describe('the heartbeat interval against its deadlines', () => {
  it('is at or under the fifteen seconds C15 names', () => {
    expect(HEARTBEAT_INTERVAL_MS).toBeLessThanOrEqual(15_000)
  })

  it('leaves several beats inside the default staleness window', () => {
    const DEFAULT_STALE_RUN_SECONDS = 120
    expect(HEARTBEAT_INTERVAL_MS).toBeLessThan(DEFAULT_STALE_RUN_SECONDS * 1000)
    // A single missed beat must not be enough to have the run declared dead.
    expect(HEARTBEAT_INTERVAL_MS * 3).toBeLessThan(DEFAULT_STALE_RUN_SECONDS * 1000)
  })
})

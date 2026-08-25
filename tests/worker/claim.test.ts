/**
 * SPEC C4 - claim, and C15 - reclaim a stalled run.
 *
 * "IF two workers claim concurrently, THEN exactly one SHALL obtain the run and
 * the other SHALL receive none." That is a statement about contention, so it is
 * tested under contention: separate connections, started together, repeated - see
 * tests/helpers/concurrency.ts for why each of those three matters. Two sequential
 * calls to `claimRun` would pass against an implementation with no locking at all.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { claimRun, exceededReclaimLimit, finishRun, heartbeat } from '../../src/worker/claim.ts'
import { fulfilled, repeatRace } from '../helpers/concurrency.ts'
import { prisma } from '../../src/lib/db.ts'

const PREFIX = `test-c4-${process.pid}-`
let companyId: string

async function makeCompany(): Promise<string> {
  const company = await prisma.company.create({
    data: { name: `${PREFIX}claim`, aliases: ['Acme'], competitors: [] },
    select: { id: true },
  })
  return company.id
}

/** A queued run with one prompt and one target. */
async function makeQueuedRun(): Promise<string> {
  const run = await prisma.run.create({
    data: {
      companyId,
      status: 'queued',
      repetitions: 1,
      brandName: `${PREFIX}claim`,
      brandAliases: ['Acme'],
      brandCompetitors: [],
      basisHash: `hash-${Math.random().toString(36).slice(2)}`,
      prompts: { create: [{ text: 'a prompt', order: 0 }] },
      targets: { create: [{ provider: 'anthropic', modelId: 'claude-sonnet-5' }] },
    },
    select: { id: true },
  })
  return run.id
}

/** Removes every run of the fixture company, so each round contends over one row. */
async function clearRuns(): Promise<void> {
  await prisma.run.deleteMany({ where: { companyId } })
}

beforeEach(async () => {
  if (!companyId) companyId = await makeCompany()
})

afterAll(async () => {
  if (companyId) {
    await prisma.run.deleteMany({ where: { companyId } })
    await prisma.company.deleteMany({ where: { id: companyId } })
  }
  await prisma.$disconnect()
})

describe('claimRun - exactly one winner', () => {
  it('gives the run to exactly one of two concurrent claimers, every round', async () => {
    const ROUNDS = 20

    const rounds = await repeatRace(
      ROUNDS,
      2,
      async (client) => claimRun(client, 120),
      async (client) => {
        await client.run.deleteMany({ where: { companyId } })
        await client.run.create({
          data: {
            companyId,
            status: 'queued',
            repetitions: 1,
            brandName: `${PREFIX}claim`,
            brandAliases: ['Acme'],
            brandCompetitors: [],
            basisHash: 'race-hash',
            prompts: { create: [{ text: 'a prompt', order: 0 }] },
            targets: { create: [{ provider: 'anthropic', modelId: 'claude-sonnet-5' }] },
          },
        })
      },
    )

    expect(rounds).toHaveLength(ROUNDS)

    rounds.forEach((results, index) => {
      const claims = fulfilled(results)
      // Neither claimer may error: the loser gets null, not an exception.
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true)

      const winners = claims.filter((c) => c !== null)
      expect(
        winners.length,
        `round ${index}: expected exactly one winner, got ${winners.length}`,
      ).toBe(1)

      const losers = claims.filter((c) => c === null)
      expect(losers).toHaveLength(1)
    })
  })

  it('leaves the claimed run in `running` with a fresh heartbeat', async () => {
    await clearRuns()
    const runId = await makeQueuedRun()

    const claimed = await claimRun(prisma, 120)
    expect(claimed?.id).toBe(runId)
    expect(claimed?.wasReclaimed).toBe(false)
    expect(claimed?.reclaimCount).toBe(0)

    const run = await prisma.run.findUniqueOrThrow({ where: { id: runId } })
    expect(run.status).toBe('running')
    expect(run.claimedAt).not.toBeNull()
    expect(run.startedAt).not.toBeNull()
    expect(run.heartbeatAt).not.toBeNull()
  })

  it('returns null when there is nothing claimable', async () => {
    await clearRuns()
    // Other test files may leave runs behind, so this asserts the weaker but true
    // statement: no run of *this* company is claimed.
    const claimed = await claimRun(prisma, 120)
    expect(claimed === null || (await runBelongsToFixture(claimed.id)) === false).toBe(true)
  })

  it('does not claim a run that is already running with a live heartbeat', async () => {
    await clearRuns()
    const runId = await makeQueuedRun()

    const first = await claimRun(prisma, 120)
    expect(first?.id).toBe(runId)

    // Still beating, so it is not stale and must not be taken.
    await heartbeat(prisma, runId)
    const second = await claimRun(prisma, 120)
    expect(second?.id).not.toBe(runId)
  })

  it('does not claim a run that has reached a terminal status', async () => {
    await clearRuns()
    const runId = await makeQueuedRun()
    await finishRun(prisma, runId, 'completed')

    const claimed = await claimRun(prisma, 120)
    expect(claimed?.id).not.toBe(runId)
  })
})

describe('claimRun - reclaiming a stalled run (C15)', () => {
  it('reclaims a running run whose heartbeat has gone stale, and counts it', async () => {
    await clearRuns()
    const runId = await makeQueuedRun()

    const first = await claimRun(prisma, 120)
    expect(first?.id).toBe(runId)
    expect(first?.reclaimCount).toBe(0)

    // Age the heartbeat past the staleness window rather than waiting for it.
    await prisma.run.update({
      where: { id: runId },
      data: { heartbeatAt: new Date(Date.now() - 10 * 60 * 1000) },
    })

    const second = await claimRun(prisma, 120)
    expect(second?.id).toBe(runId)
    expect(second?.wasReclaimed).toBe(true)
    expect(second?.reclaimCount).toBe(1)

    // startedAt records when the run first began and must not be reset by a
    // reclaim - a resumed run is the same run.
    const run = await prisma.run.findUniqueOrThrow({ where: { id: runId } })
    expect(run.status).toBe('running')
    expect(run.startedAt).not.toBeNull()
  })

  it('gives a stale run to exactly one of two concurrent reclaimers', async () => {
    const rounds = await repeatRace(
      10,
      2,
      async (client) => claimRun(client, 60),
      async (client) => {
        await client.run.deleteMany({ where: { companyId } })
        await client.run.create({
          data: {
            companyId,
            status: 'running',
            repetitions: 1,
            brandName: `${PREFIX}claim`,
            brandAliases: ['Acme'],
            brandCompetitors: [],
            basisHash: 'stale-race-hash',
            // Already stale when the round begins.
            heartbeatAt: new Date(Date.now() - 10 * 60 * 1000),
            startedAt: new Date(Date.now() - 11 * 60 * 1000),
            prompts: { create: [{ text: 'a prompt', order: 0 }] },
            targets: { create: [{ provider: 'anthropic', modelId: 'claude-sonnet-5' }] },
          },
        })
      },
    )

    rounds.forEach((results, index) => {
      const claims = fulfilled(results)
      const winners = claims.filter((c) => c !== null)
      expect(
        winners.length,
        `round ${index}: expected exactly one reclaimer, got ${winners.length}`,
      ).toBe(1)
      expect(winners[0]?.wasReclaimed).toBe(true)
    })
  })

  it('does not reclaim a run whose heartbeat is still inside the window', async () => {
    await clearRuns()
    const runId = await makeQueuedRun()
    await claimRun(prisma, 120)

    await prisma.run.update({
      where: { id: runId },
      data: { heartbeatAt: new Date(Date.now() - 30 * 1000) },
    })

    const again = await claimRun(prisma, 120)
    expect(again?.id).not.toBe(runId)
  })

  it('claims the oldest claimable run first', async () => {
    await clearRuns()
    const older = await makeQueuedRun()
    await new Promise((resolve) => setTimeout(resolve, 10))
    await makeQueuedRun()

    const claimed = await claimRun(prisma, 120)
    expect(claimed?.id).toBe(older)
  })
})

/**
 * The reclaim limit (C15). `exceededReclaimLimit` is the boundary itself; the
 * behaviour that follows from it - `failed`, and no further provider calls - is in
 * tests/run/status.test.ts, where a stub adapter can prove the calls were never
 * made.
 */
describe('exceededReclaimLimit', () => {
  it('allows exactly MAX_RECLAIMS reclaims and refuses the next', () => {
    expect(exceededReclaimLimit(0, 3)).toBe(false)
    expect(exceededReclaimLimit(3, 3)).toBe(false)
    expect(exceededReclaimLimit(4, 3)).toBe(true)
  })

  it('refuses every reclaim when the limit is zero', () => {
    expect(exceededReclaimLimit(0, 0)).toBe(false)
    expect(exceededReclaimLimit(1, 0)).toBe(true)
  })
})

async function runBelongsToFixture(runId: string): Promise<boolean> {
  const run = await prisma.run.findUnique({ where: { id: runId }, select: { companyId: true } })
  return run?.companyId === companyId
}

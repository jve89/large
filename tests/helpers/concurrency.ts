/**
 * The concurrency harness.
 *
 * Several rules in this project are only true under contention - "exactly one
 * worker obtains the run" (SPEC C4), and the two `FOR UPDATE` locks that make a
 * prompt-list replacement and a run snapshot atomic (Phases 2 and 3). None of them
 * can be tested by calling the code twice in a row: two sequential calls pass
 * against an implementation with no locking at all.
 *
 * Two properties make the difference, and both are easy to get wrong in a way that
 * still goes green:
 *
 * 1. **Separate connections.** Actors sharing one `PrismaClient` share its pool
 *    and may be served by the same connection, in which case the second actor
 *    never contends for the row - `FOR UPDATE SKIP LOCKED` has nothing to skip and
 *    a broken claim passes. Every actor here gets its own client, from
 *    `createPrismaClient()` in src/lib/db.ts, so the connection config is not
 *    restated.
 *
 * 2. **Started together.** `Promise.all` over N async functions starts them in
 *    sequence inside one tick, and the first can finish its contended statement
 *    before the last has begun. So every actor connects, signals that it is ready,
 *    and then blocks on one barrier promise that resolves only once the last actor
 *    has signalled. The contended statement is the first thing each actor does
 *    after the barrier releases.
 *
 * Even so, a single race can be won by luck rather than by correctness. Use
 * `repeatRace` for invariants - a broken implementation that survives one round
 * rarely survives twenty.
 */
import type { PrismaClient } from '@prisma/client'
import { createPrismaClient } from '../../src/lib/db.ts'

export type Actor<T> = (prisma: PrismaClient, index: number) => Promise<T>

/**
 * Runs `actorCount` actors against the database at the same moment, each on its
 * own connection pool, and returns their results in actor order.
 *
 * An actor that throws does not cancel the others: results come back as a settled
 * list so a test can assert on "one succeeded and one failed" rather than losing
 * the run to the first rejection.
 */
export async function raceWithSeparateConnections<T>(
  actorCount: number,
  actor: Actor<T>,
): Promise<PromiseSettledResult<T>[]> {
  const clients = Array.from({ length: actorCount }, () => createPrismaClient())

  let release: () => void = () => {}
  const barrier = new Promise<void>((resolve) => {
    release = resolve
  })

  let ready = 0
  let readyResolve: () => void = () => {}
  const allReady = new Promise<void>((resolve) => {
    readyResolve = resolve
  })

  const signalReady = (): void => {
    ready += 1
    if (ready === actorCount) readyResolve()
  }

  try {
    const running = clients.map(async (client, index) => {
      // Connect before the barrier: establishing a pool connection takes long
      // enough that doing it after would re-serialise the actors.
      await client.$connect()
      signalReady()
      await barrier
      return actor(client, index)
    })

    await allReady
    release()

    return await Promise.allSettled(running)
  } finally {
    // A leaked pool makes a later test file hang rather than fail, which is a much
    // worse failure to diagnose than the one it hides.
    await Promise.all(clients.map((client) => client.$disconnect().catch(() => {})))
  }
}

/**
 * Runs the same race `times` over, returning every round's results.
 *
 * `setup` runs before each round on a throwaway connection, for tests that need a
 * fresh row to contend over.
 */
export async function repeatRace<T>(
  times: number,
  actorCount: number,
  actor: Actor<T>,
  setup?: (prisma: PrismaClient, round: number) => Promise<void>,
): Promise<PromiseSettledResult<T>[][]> {
  const rounds: PromiseSettledResult<T>[][] = []

  for (let round = 0; round < times; round += 1) {
    if (setup) {
      const client = createPrismaClient()
      try {
        await setup(client, round)
      } finally {
        await client.$disconnect().catch(() => {})
      }
    }
    rounds.push(await raceWithSeparateConnections(actorCount, actor))
  }

  return rounds
}

/** The fulfilled values of a settled list, in order, dropping rejections. */
export function fulfilled<T>(results: readonly PromiseSettledResult<T>[]): T[] {
  return results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map((r) => r.value)
}

/** The rejection reasons of a settled list, in order. */
export function rejected<T>(results: readonly PromiseSettledResult<T>[]): unknown[] {
  return results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason)
}

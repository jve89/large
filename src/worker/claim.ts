/**
 * Claiming a run (SPEC C4, C15).
 *
 * The trigger is a database row, not an HTTP call: the web layer inserts a Run
 * with status `queued` and returns; the worker claims it. A Run **is** the job
 * row — there is no separate queue table.
 *
 * `FOR UPDATE SKIP LOCKED` is what makes "exactly one worker wins" true under
 * concurrency: a row another transaction already holds is skipped rather than
 * waited for.
 */
import type { PrismaClient, RunStatus } from '@prisma/client'

export interface ClaimedRun {
  readonly id: string
  readonly reclaimCount: number
  /** True when this claim took over a run whose heartbeat had gone stale. */
  readonly wasReclaimed: boolean
}

interface ClaimRow {
  id: string
  reclaimCount: number
  wasReclaimed: boolean
}

/**
 * Claims one claimable run and sets it to `running`, or returns null when there is
 * nothing to claim.
 *
 * Claimable means: `queued`, or `running` with a heartbeat older than
 * `staleRunSeconds` — a run whose worker died. A reclaimed run is resumed, never
 * restarted: the caller executes only the combinations that have no stored answer
 * (CLAUDE.md rule 14).
 */
export async function claimRun(
  prisma: PrismaClient,
  staleRunSeconds: number,
): Promise<ClaimedRun | null> {
  const rows = await prisma.$queryRaw<ClaimRow[]>`
    UPDATE "Run" AS r
       SET status         = 'running',
           "claimedAt"    = now(),
           "startedAt"    = COALESCE(r."startedAt", now()),
           "heartbeatAt"  = now(),
           "reclaimCount" = r."reclaimCount" + CASE WHEN r.status = 'running' THEN 1 ELSE 0 END
      FROM (
        SELECT id, (status = 'running') AS was_reclaimed
          FROM "Run"
         WHERE status = 'queued'
            OR (status = 'running'
                AND "heartbeatAt" < now() - make_interval(secs => ${staleRunSeconds}::double precision))
         ORDER BY "createdAt"
         FOR UPDATE SKIP LOCKED
         LIMIT 1
      ) AS candidate
     WHERE r.id = candidate.id
    RETURNING r.id AS "id",
              r."reclaimCount" AS "reclaimCount",
              candidate.was_reclaimed AS "wasReclaimed"
  `

  const row = rows[0]
  return row ? { id: row.id, reclaimCount: row.reclaimCount, wasReclaimed: row.wasReclaimed } : null
}

/**
 * Refreshes a run's heartbeat. A worker must do this at least every fifteen
 * seconds while it executes, or another worker will conclude it died.
 *
 * The timestamp comes from the **database's** clock, not the worker's, and that
 * matters: `claimRun` above decides staleness by comparing `heartbeatAt` against
 * PostgreSQL's `now()`. Writing `new Date()` here would put the two sides of that
 * comparison on two different clocks, and every worker process is a separate
 * container from the database. A worker whose clock runs ahead writes heartbeats
 * from the future and its dead runs stay unreclaimable for the length of the skew;
 * one running behind is reclaimed early, while it is still spending money. The
 * skew is usually milliseconds and was found as an intermittent test failure
 * rather than an outage, which is the only reason it is cheap to fix.
 */
export async function heartbeat(prisma: PrismaClient, runId: string): Promise<void> {
  await prisma.$executeRaw`UPDATE "Run" SET "heartbeatAt" = now() WHERE id = ${runId}::uuid`
}

/** Writes a run's terminal status and stops its heartbeat. */
export async function finishRun(
  prisma: PrismaClient,
  runId: string,
  status: RunStatus,
  failureReason?: string,
): Promise<void> {
  await prisma.run.update({
    where: { id: runId },
    data: {
      status,
      failureReason: failureReason ?? null,
      finishedAt: new Date(),
      heartbeatAt: null,
    },
  })
}

/**
 * True when a run has been reclaimed more times than allowed. Such a run is failed
 * with that reason and no further provider calls are made for it — a run that
 * reliably crashes its worker must not burn money in a loop (SPEC C15).
 */
export function exceededReclaimLimit(reclaimCount: number, maxReclaims: number): boolean {
  return reclaimCount > maxReclaims
}

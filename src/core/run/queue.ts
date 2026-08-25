/**
 * Queue a run (SPEC C3).
 *
 * This is the capability itself, not an HTTP handler. It lives here rather than in
 * the route because it has two callers: `POST /api/runs`, and
 * `scripts/verify-live.ts`, which cannot import a route handler at all - route
 * handlers pull in `next/server`, which does not resolve under plain `node`.
 *
 * Before this module existed the two callers were two implementations, and they
 * had already drifted: the gate hard-coded N=1 and validated nothing while the
 * route validated. That mattered more than ordinary duplication, because C14 says
 * `verify:live` runs one real end-to-end run "through the real queue" - a gate
 * that inserts its own row is imitating the queue rather than exercising it, and
 * imitation passing is the failure mode the gate exists to catch.
 */
import type { PrismaClient, RunStatus } from '@prisma/client'
import {
  ESTIMATED_MICROS_PER_CALL,
  MAX_PLANNED_CALLS,
  MAX_PROMPTS,
} from '../../lib/defaults.ts'
import { basisHash } from '../../lib/hash.ts'
import { formatMicrosAsUsd } from '../../lib/money.ts'
import { priceFor } from '../providers/pricing.ts'
import { targetKey, type Target } from '../providers/types.ts'

export interface QueueRunInput {
  readonly prisma: PrismaClient
  readonly companyId: string
  /** N - already validated by the caller. */
  readonly repetitions: number
  /** The target list - already validated by the caller. */
  readonly targets: readonly Target[]
}

export type QueueRunFailure =
  | 'unknown-company'
  | 'no-prompts'
  | 'duplicate-target'
  | 'unpriceable-target'
  | 'too-many-prompts'
  | 'too-many-calls'

export type QueueRunResult =
  | {
      readonly ok: true
      readonly runId: string
      readonly status: RunStatus
      /**
       * Prompts x targets x N - the number of provider calls this run will make,
       * and therefore the number it will be billed for. Stated because this is
       * the endpoint that actually spends the money: C2's warning is computed
       * from defaults it admits are hypothetical, while this figure is exact.
       */
      readonly plannedCalls: number
    }
  | { readonly ok: false; readonly reason: QueueRunFailure; readonly message: string }

/**
 * Creates the `queued` run row carrying an immutable snapshot of the prompt texts,
 * the target list, the brand name, the aliases and the competitors, plus N and the
 * `basisHash` - and returns without waiting for any measurement. The trigger is the
 * row; the worker claims it.
 *
 * `basisHash` covers exactly four inputs: prompts, targets, aliases, competitors.
 * The brand **name** is snapshotted but deliberately not hashed - renaming a
 * company does not change what was measured, while changing an alias does. N is
 * excluded for a related reason and is displayed beside every figure instead.
 */
export async function queueRun(input: QueueRunInput): Promise<QueueRunResult> {
  const { prisma, companyId, repetitions, targets } = input

  // `RunTarget` carries UNIQUE (runId, provider, modelId), so a repeated target is
  // unstorable and reaches the client as a unique violation unless it is caught
  // here. It is rejected rather than quietly de-duplicated: a target list is a
  // short, explicit choice, and silently dropping an entry would change what the
  // operator believes they are paying for. (A duplicate *prompt* is de-duplicated
  // under C2 - a prompt list is long enough that a tolerant path earns its keep,
  // and the removal is reported there too.)
  const duplicate = firstDuplicateTarget(targets)
  if (duplicate) {
    return {
      ok: false,
      reason: 'duplicate-target',
      message:
        `The target list contains '${duplicate}' more than once. ` +
        'A target is one (provider, model id) pair and a run measures each once.',
    }
  }

  // A target with no row in the price table is one this system structurally
  // cannot measure: `costMicros` cannot be computed for it, and rule 12 forbids
  // inventing a price anywhere else. A run that cannot cost itself is not a
  // measurement, so it is refused before it is queued rather than discovered
  // after every call in it has failed. `priceFor` throws on an unknown id; it is
  // called here rather than duplicated as a second lookup.
  const unpriceable = firstUnpriceableTarget(targets)
  if (unpriceable) {
    return {
      ok: false,
      reason: 'unpriceable-target',
      message:
        `No price is on record for '${unpriceable}', so a run against it could ` +
        'not be costed. Add a dated row to src/core/providers/pricing.ts before ' +
        'measuring this target.',
    }
  }

  /*
   * Everything below runs inside one transaction that holds a row lock on the
   * company, so that the snapshot is of a state that actually existed.
   *
   * The lock is doing the work here, not the transaction. PostgreSQL defaults to
   * READ COMMITTED, in which **every statement takes a fresh snapshot** - so
   * simply wrapping these reads in a transaction would still let a concurrent
   * `PUT /api/companies/:id/prompts` commit between them, and the run would
   * snapshot aliases from before that save and prompts from after it: a
   * measurement basis that never existed at any instant.
   *
   * `FOR UPDATE` is what serialises, and it works because Phase 2's prompt
   * replacement takes the same lock on the same row. Do not remove it as
   * redundant with the transaction; the transaction alone is not enough.
   *
   * The no-prompts rejection is inside the lock for the same reason: otherwise a
   * concurrent save clearing the list could land between the check and the insert,
   * and the run would be created with no prompts at all.
   */
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Company" WHERE id = ${companyId}::uuid FOR UPDATE
    `
    if (locked.length === 0) {
      return { ok: false, reason: 'unknown-company', message: 'Unknown company' } as const
    }

    const company = await tx.company.findUniqueOrThrow({
      where: { id: companyId },
      include: { prompts: { orderBy: { order: 'asc' } } },
    })

    if (company.prompts.length === 0) {
      return {
        ok: false,
        reason: 'no-prompts',
        message: 'This company has no prompts; nothing would be measured.',
      } as const
    }

    // Two cost guardrails, neither a spec rule - see lib/defaults.ts for both.
    // Checked here rather than at save time because C2 requires a long list to
    // still save; it is running one that spends the money.
    //
    // The order matters only for which message the operator reads. The prompt
    // count is checked first because "shorten the list" is the more actionable
    // remedy of the two.
    if (company.prompts.length > MAX_PROMPTS) {
      const calls = company.prompts.length * targets.length * repetitions
      return {
        ok: false,
        reason: 'too-many-prompts',
        message:
          `This company has ${company.prompts.length} prompts, above the limit of ` +
          `${MAX_PROMPTS}. Queueing it would make ${calls} provider calls. ` +
          'Shorten the prompt list, or raise MAX_PROMPTS in lib/defaults.ts if the ' +
          'cost is intended.',
      } as const
    }

    // The bound that actually limits the bill. Cost is driven by
    // prompts x targets x N, and bounding any one of those three leaves the
    // product unbounded: 100 prompts, two targets and N=50 all pass their own
    // limits and plan 10,000 calls. This is the only check that sees the product,
    // and it is refused here - before the run row exists, and therefore before any
    // provider call can be made for it.
    const plannedCalls = company.prompts.length * targets.length * repetitions
    if (plannedCalls > MAX_PLANNED_CALLS) {
      const estimate = formatMicrosAsUsd(BigInt(plannedCalls) * ESTIMATED_MICROS_PER_CALL)
      const ceiling = formatMicrosAsUsd(BigInt(MAX_PLANNED_CALLS) * ESTIMATED_MICROS_PER_CALL)
      return {
        ok: false,
        reason: 'too-many-calls',
        message:
          `This run would make ${plannedCalls} provider calls - ` +
          `${company.prompts.length} prompts x ${targets.length} targets x N=${repetitions} - ` +
          `costing roughly ${estimate}, above the limit of ${MAX_PLANNED_CALLS} calls ` +
          `(roughly ${ceiling}). Lower N, shorten the prompt list, measure fewer ` +
          'targets, or raise MAX_PLANNED_CALLS in lib/defaults.ts if the cost is ' +
          'intended. The estimate is an average of real calls already made and is ' +
          'not a quote.',
      } as const
    }

    const promptTexts = company.prompts.map((prompt) => prompt.text)

    const hash = basisHash({
      prompts: promptTexts,
      targets,
      aliases: company.aliases,
      competitors: company.competitors,
    })

    const run = await tx.run.create({
      data: {
        companyId: company.id,
        status: 'queued',
        repetitions,
        brandName: company.name,
        brandAliases: company.aliases,
        brandCompetitors: company.competitors,
        basisHash: hash,
        targets: {
          create: targets.map((target) => ({
            provider: target.provider,
            modelId: target.modelId,
          })),
        },
        prompts: {
          create: promptTexts.map((text, order) => ({ text, order })),
        },
      },
      select: { id: true, status: true },
    })

    return {
      ok: true,
      runId: run.id,
      status: run.status,
      plannedCalls,
    } as const
  })
}

/** The first target with no row in the price table, as `provider:modelId`, or null. */
function firstUnpriceableTarget(targets: readonly Target[]): string | null {
  for (const target of targets) {
    try {
      priceFor(target)
    } catch {
      return targetKey(target)
    }
  }
  return null
}

/** The first target that appears twice, as `provider:modelId`, or null. */
function firstDuplicateTarget(targets: readonly Target[]): string | null {
  const seen = new Set<string>()
  for (const target of targets) {
    const key = targetKey(target)
    if (seen.has(key)) return key
    seen.add(key)
  }
  return null
}

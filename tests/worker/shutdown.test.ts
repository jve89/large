/**
 * What a deploy does to a run in flight (SPEC C15, and CLAUDE.md rule 18).
 *
 * This file exists because ARCHITECTURE.md described this path backwards for four
 * phases and no test looked. It claimed `finishRun` was never reached on shutdown
 * and the reclaim path resumed the run. Driven at the seam - `processNextRun`, a
 * real database, an adapter that aborts the way both SDKs do - the truth was the
 * opposite: every in-flight attempt was stored as a `failed` answer, the terminal
 * status was written from the fraction of work that happened to be done, and the
 * run ended `failed` with the reason "no target reached the coverage threshold".
 * An infrastructure event wearing the clothes of a measurement, on every deploy.
 *
 * No unit test could have seen it. `executeRun` returns normally on abort and
 * `finishRun` does exactly what it is told; each part worked. The seam did not.
 *
 * What is asserted here is therefore all database state after the signal, never a
 * return value: the run is still claimable, nothing was written that says the
 * targets were measured, and the money already spent was kept.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ProviderAdapter, ProviderResult, Target } from '../../src/core/providers/types.ts'
import { processNextRun, type WorkerDeps } from '../../src/worker/index.ts'
import { prisma } from '../../src/lib/db.ts'
import { createStubAdapters, okResult } from '../helpers/stub-adapter.ts'

const PREFIX = `test-shutdown-${process.pid}-`
let companyId: string

beforeAll(async () => {
  const company = await prisma.company.create({
    data: { name: `${PREFIX}co`, aliases: ['Acme'], competitors: ['Globex'] },
  })
  companyId = company.id
})

// Each test must be the only claimable run in the database: `claimRun` takes the
// oldest claimable row, and these tests deliberately leave runs `running`.
beforeEach(async () => {
  await prisma.run.deleteMany({ where: { companyId } })
})

afterAll(async () => {
  await prisma.run.deleteMany({ where: { companyId } })
  await prisma.company.deleteMany({ where: { id: companyId } })
  await prisma.$disconnect()
})

/** A queued run of `promptCount` prompts against one target at N=1. */
async function queueRunRow(promptCount: number): Promise<string> {
  const run = await prisma.run.create({
    data: {
      companyId,
      status: 'queued',
      repetitions: 1,
      brandName: `${PREFIX}brand`,
      brandAliases: ['Acme'],
      brandCompetitors: ['Globex'],
      basisHash: `sd-${Math.random().toString(36).slice(2)}`,
      prompts: {
        create: Array.from({ length: promptCount }, (_, i) => ({ text: `p${i}`, order: i })),
      },
      targets: { create: [{ provider: 'anthropic', modelId: 'claude-sonnet-5' }] },
    },
  })
  return run.id
}

function deps(overrides: Partial<WorkerDeps>): WorkerDeps {
  return {
    prisma,
    credentials: { anthropicApiKey: 'unused', openaiApiKey: 'unused' },
    concurrencyPerProvider: 4,
    coverageThreshold: 0.8,
    staleRunSeconds: 120,
    maxReclaims: 3,
    heartbeatIntervalMs: 60_000,
    ...overrides,
  }
}

/**
 * An adapter that answers `p0` at once and hangs on everything else until the
 * signal fires - then returns what both SDKs produce for a cancelled request: an
 * ordinary non-retryable failure, indistinguishable from a provider refusing.
 * `APIUserAbortError extends APIError` in @anthropic-ai/sdk 0.120.0 and openai
 * 7.5.0 (checked 2026-08-25), so `ask()` classifies it `retryable: false`.
 */
function halfHangingAdapters(state: { started: string[] }) {
  return (target: Target): ProviderAdapter => ({
    provider: target.provider,
    modelId: target.modelId,
    async ask(prompt: string, signal: AbortSignal): Promise<ProviderResult> {
      state.started.push(prompt)
      if (prompt === 'p0') return okResult('Acme is the pick here.')
      await new Promise<void>((resolve) => {
        if (signal.aborted) return resolve()
        signal.addEventListener('abort', () => resolve(), { once: true })
      })
      return { ok: false, reason: 'Request was aborted.', retryable: false }
    },
  })
}

/** Runs one worker over the run and aborts once `waitFor` calls have started. */
async function interruptMidRun(
  runId: string,
  promptCount: number,
): Promise<{ started: string[] }> {
  const controller = new AbortController()
  const state = { started: [] as string[] }

  const processing = processNextRun(
    deps({ signal: controller.signal, adapterFor: halfHangingAdapters(state) }),
  )

  while (state.started.length < promptCount) await new Promise((r) => setTimeout(r, 5))
  controller.abort()

  const processed = await processing
  expect(processed).toMatchObject({ runId, interrupted: true })
  return state
}

describe('a worker interrupted by SIGTERM', () => {
  it('leaves the run running and claimable rather than writing a terminal status', async () => {
    const runId = await queueRunRow(2)
    await interruptMidRun(runId, 2)

    const run = await prisma.run.findUniqueOrThrow({ where: { id: runId } })

    // Still claimable: the claim query matches `queued`, or `running` with a stale
    // heartbeat. A row with finishedAt set is neither, and is gone for good.
    expect(run.status).toBe('running')
    expect(run.finishedAt).toBeNull()
    expect(run.heartbeatAt).not.toBeNull()

    // And nothing was written that claims a measurement was made and came up
    // short. This is the sentence a customer would eventually have read.
    expect(run.failureReason).toBeNull()

    // The interruption is not the run's fault, so it has not spent a reclaim yet.
    // The reclaim it is about to cost is charged by the next worker, once.
    expect(run.reclaimCount).toBe(0)
  })

  it('does not store an aborted attempt as a failed answer', async () => {
    const runId = await queueRunRow(2)
    await interruptMidRun(runId, 2)

    const answers = await prisma.answer.findMany({ where: { runId } })

    // A stored `failed` row would be permanent: the resume path skips every
    // combination that has an answer, so the attempt would never be made again.
    expect(answers.filter((a) => a.status === 'failed')).toEqual([])
    expect(answers.map((a) => a.failureReason)).not.toContain('Request was aborted.')
  })

  it('keeps an answer that had already arrived, because it is already paid for', async () => {
    const runId = await queueRunRow(2)
    await interruptMidRun(runId, 2)

    const answers = await prisma.answer.findMany({ where: { runId } })

    // p0 answered before the signal landed. Dropping it would buy the same answer
    // twice - once now and once on resume - which is the opposite of the mistake
    // above and just as expensive.
    expect(answers).toHaveLength(1)
    expect(answers[0]).toMatchObject({ status: 'ok' })
    expect(answers[0]?.rawText).toContain('Acme')
  })

  it('is resumed by the next worker, which re-asks nothing already stored', async () => {
    const runId = await queueRunRow(2)
    await interruptMidRun(runId, 2)

    // The next worker finds the heartbeat stale and takes it over.
    const healthy = createStubAdapters(() => okResult('Globex, then Acme.'))
    const processed = await processNextRun(
      deps({ staleRunSeconds: 0, adapterFor: healthy.adapterFor }),
    )

    expect(processed).toMatchObject({ runId, status: 'completed' })
    expect(processed?.interrupted).toBeFalsy()

    // Only the outstanding combination was bought. p0's answer was kept, so p0 was
    // never asked again - CLAUDE.md rule 14, and the whole reason the drop above
    // is safe.
    expect(healthy.calls.map((c) => c.prompt)).toEqual(['p1'])

    const run = await prisma.run.findUniqueOrThrow({ where: { id: runId } })
    expect(run.status).toBe('completed')
    expect(run.reclaimCount).toBe(1)
    expect(await prisma.answer.count({ where: { runId, status: 'ok' } })).toBe(2)
  })
})

describe('a run that keeps losing its worker', () => {
  it('ends with a reason that names the interruption, not a measurement', async () => {
    const runId = await queueRunRow(1)
    await prisma.run.update({
      where: { id: runId },
      data: { status: 'running', heartbeatAt: new Date(0), reclaimCount: 3 },
    })

    const processed = await processNextRun(
      deps({ staleRunSeconds: 0, maxReclaims: 3, adapterFor: createStubAdapters(() => okResult('x')).adapterFor }),
    )
    expect(processed).toMatchObject({ runId, status: 'failed' })

    const run = await prisma.run.findUniqueOrThrow({ where: { id: runId } })
    expect(run.failureReason).toContain('interrupted repeatedly')
    // The distinction the whole file is about: this says the run did not finish.
    // It must not say the targets were measured and nothing was found.
    expect(run.failureReason).not.toContain('coverage threshold')
  })
})

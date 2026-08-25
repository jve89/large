/**
 * SPEC C3 - Queue a run.
 *
 * Against a real PostgreSQL, because every rule that matters here is a claim about
 * what the database holds afterwards: the snapshot is what was stored, "no run was
 * created" is a count, and "editing the company leaves the run untouched" is a
 * comparison of stored rows before and after.
 *
 * The immutability tests deliberately edit the company through Phase 1's PATCH and
 * Phase 2's PUT - the real endpoints an operator uses - rather than writing to the
 * tables directly. Rule 10 has to hold across phases, not only within one.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { POST as createCompany } from '../../src/app/api/companies/route.ts'
import { PATCH as patchCompany } from '../../src/app/api/companies/[companyId]/route.ts'
import {
  PUT as putPrompts,
  replacePromptList,
} from '../../src/app/api/companies/[companyId]/prompts/route.ts'
import { queueRun } from '../../src/core/run/queue.ts'
import { fulfilled, raceWithSeparateConnections } from '../helpers/concurrency.ts'
import { POST as postRun } from '../../src/app/api/runs/route.ts'
import {
  DEFAULT_REPETITIONS,
  DEFAULT_TARGETS,
  MAX_PLANNED_CALLS,
  MAX_PROMPTS,
  MAX_REPETITIONS,
} from '../../src/lib/defaults.ts'
import { prisma } from '../../src/lib/db.ts'

const PREFIX = `test-c3-${process.pid}-`
const created: string[] = []

function ctx(companyId: string): { params: Promise<{ companyId: string }> } {
  return { params: Promise.resolve({ companyId }) }
}

function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function createFixture(
  name: string,
  options: { aliases?: string[]; competitors?: string[]; prompts?: string[] } = {},
): Promise<string> {
  const response = await createCompany(
    jsonRequest('http://localhost/api/companies', 'POST', {
      name: `${PREFIX}${name}`,
      aliases: options.aliases ?? ['Acme'],
      competitors: options.competitors ?? ['Globex'],
    }),
  )
  expect(response.status).toBe(201)
  const { id } = (await response.json()) as { id: string }
  created.push(id)

  const prompts = options.prompts ?? ['first prompt', 'second prompt']
  if (prompts.length > 0) {
    const put = await putPrompts(
      jsonRequest('http://localhost/prompts', 'PUT', { prompts }),
      ctx(id),
    )
    expect(put.status).toBe(200)
  }
  return id
}

/** Queues a run and returns the raw response, without asserting on it. */
async function queue(body: unknown): Promise<Response> {
  return postRun(jsonRequest('http://localhost/api/runs', 'POST', body))
}

/** Queues a run, asserts 201, and returns the new run's id. */
async function queueOk(body: unknown): Promise<string> {
  const response = await queue(body)
  expect(response.status).toBe(201)
  const payload = (await response.json()) as { runId: string; status: string }
  expect(payload.status).toBe('queued')
  return payload.runId
}

async function loadRun(runId: string) {
  return prisma.run.findUniqueOrThrow({
    where: { id: runId },
    include: {
      prompts: { orderBy: { order: 'asc' } },
      targets: { orderBy: { modelId: 'asc' } },
    },
  })
}

afterAll(async () => {
  for (const id of created) {
    await prisma.run.deleteMany({ where: { companyId: id } })
    await prisma.prompt.deleteMany({ where: { companyId: id } })
    await prisma.company.deleteMany({ where: { id } })
  }
  await prisma.$disconnect()
})

describe('POST /api/runs - the snapshot', () => {
  it('creates a queued run carrying the whole measurement basis', async () => {
    const companyId = await createFixture('snapshot', {
      aliases: ['Acme', 'AcmeCo'],
      competitors: ['Globex', 'Initech'],
      prompts: ['prompt one', 'prompt two', 'prompt three'],
    })

    const runId = await queueOk({ companyId, repetitions: 2 })
    const run = await loadRun(runId)

    expect(run.status).toBe('queued')
    expect(run.repetitions).toBe(2)
    expect(run.brandName).toBe(`${PREFIX}snapshot`)
    expect(run.brandAliases).toEqual(['Acme', 'AcmeCo'])
    expect(run.brandCompetitors).toEqual(['Globex', 'Initech'])
    expect(run.basisHash).toMatch(/^[0-9a-f]{64}$/)
    expect(run.prompts.map((p) => ({ text: p.text, order: p.order }))).toEqual([
      { text: 'prompt one', order: 0 },
      { text: 'prompt two', order: 1 },
      { text: 'prompt three', order: 2 },
    ])
    expect(run.targets).toHaveLength(DEFAULT_TARGETS.length)
  })

  it('returns without waiting: the run is not started and no answer exists', async () => {
    const companyId = await createFixture('nowait')
    const runId = await queueOk({ companyId })
    const run = await loadRun(runId)

    expect(run.status).toBe('queued')
    expect(run.claimedAt).toBeNull()
    expect(run.startedAt).toBeNull()
    expect(run.finishedAt).toBeNull()
    expect(run.heartbeatAt).toBeNull()
    expect(run.reclaimCount).toBe(0)
    expect(await prisma.answer.count({ where: { runId } })).toBe(0)
  })

  it('applies the default N and the default target list when neither is given', async () => {
    const companyId = await createFixture('defaults')
    const run = await loadRun(await queueOk({ companyId }))

    expect(run.repetitions).toBe(DEFAULT_REPETITIONS)
    expect(run.targets.map((t) => `${t.provider}:${t.modelId}`).sort()).toEqual(
      DEFAULT_TARGETS.map((t) => `${t.provider}:${t.modelId}`).sort(),
    )
  })

  it('stores the target list it was given, not the default one', async () => {
    const companyId = await createFixture('targets')
    const only = DEFAULT_TARGETS[0]!
    const run = await loadRun(await queueOk({ companyId, targets: [only] }))

    expect(run.targets).toHaveLength(1)
    expect(run.targets[0]?.provider).toBe(only.provider)
    expect(run.targets[0]?.modelId).toBe(only.modelId)
  })

  it('reports the number of provider calls the run will make', async () => {
    const companyId = await createFixture('planned-calls', {
      prompts: ['one', 'two', 'three'],
    })

    const response = await queue({ companyId, repetitions: 4 })
    expect(response.status).toBe(201)
    const body = (await response.json()) as { plannedCalls: number }

    // prompts x targets x N - exact, not a default case: this endpoint knows both.
    expect(body.plannedCalls).toBe(3 * DEFAULT_TARGETS.length * 4)
  })
})

/**
 * CLAUDE.md rule 10 - runs are immutable once queued. The company is edited
 * through the real endpoints, because that is how it is edited in practice.
 */
describe('POST /api/runs - the run is immutable afterwards', () => {
  it('survives the company being renamed and its aliases and competitors replaced', async () => {
    const companyId = await createFixture('immutable', {
      aliases: ['Snap'],
      competitors: ['Rival'],
      prompts: ['the measured prompt'],
    })

    const runId = await queueOk({ companyId })
    const before = await loadRun(runId)

    const patched = await patchCompany(
      jsonRequest('http://localhost/patch', 'PATCH', {
        name: `${PREFIX}renamed-entirely`,
        aliases: ['CompletelyDifferent'],
        competitors: ['SomeoneElse'],
      }),
      ctx(companyId),
    )
    expect(patched.status).toBe(200)

    const after = await loadRun(runId)
    expect(after.brandName).toBe(before.brandName)
    expect(after.brandAliases).toEqual(before.brandAliases)
    expect(after.brandCompetitors).toEqual(before.brandCompetitors)
    expect(after.basisHash).toBe(before.basisHash)
  })

  it('survives the prompt list being replaced through Phase 2 PUT', async () => {
    const companyId = await createFixture('immutable-prompts', {
      prompts: ['measured one', 'measured two'],
    })

    const runId = await queueOk({ companyId })
    const before = await loadRun(runId)

    const put = await putPrompts(
      jsonRequest('http://localhost/prompts', 'PUT', {
        prompts: ['something else entirely'],
      }),
      ctx(companyId),
    )
    expect(put.status).toBe(200)

    const after = await loadRun(runId)
    expect(after.prompts.map((p) => p.text)).toEqual(['measured one', 'measured two'])
    expect(after.basisHash).toBe(before.basisHash)
    // ...and the company's own list really did change, so this cannot pass by
    // nothing having happened.
    const companyPrompts = await prisma.prompt.findMany({ where: { companyId } })
    expect(companyPrompts.map((p) => p.text)).toEqual(['something else entirely'])
  })

  it('survives the prompt list being cleared entirely', async () => {
    const companyId = await createFixture('immutable-cleared', { prompts: ['measured'] })
    const runId = await queueOk({ companyId })

    await putPrompts(jsonRequest('http://localhost/prompts', 'PUT', { prompts: [] }), ctx(companyId))

    const after = await loadRun(runId)
    expect(after.prompts.map((p) => p.text)).toEqual(['measured'])
  })
})

/**
 * `basisHash` covers exactly four inputs: prompts, targets, aliases, competitors.
 * The negatives are what matter - what must NOT move the hash.
 */
describe('POST /api/runs - basisHash', () => {
  async function hashOf(companyId: string, body: Record<string, unknown> = {}): Promise<string> {
    const run = await loadRun(await queueOk({ companyId, ...body }))
    return run.basisHash
  }

  it('is identical for two runs on an unchanged basis', async () => {
    const companyId = await createFixture('hash-stable')
    expect(await hashOf(companyId)).toBe(await hashOf(companyId))
  })

  it('does NOT change when the company is renamed', async () => {
    const companyId = await createFixture('hash-rename')
    const before = await hashOf(companyId)

    await patchCompany(
      jsonRequest('http://localhost/patch', 'PATCH', { name: `${PREFIX}quite-different-name` }),
      ctx(companyId),
    )

    // Renaming a company does not change what was measured; changing an alias
    // does. This is the whole reason brandName is snapshotted but not hashed.
    expect(await hashOf(companyId)).toBe(before)
  })

  it('does NOT change when N changes', async () => {
    const companyId = await createFixture('hash-n')
    // Two runs at different N ask the same question of the same models about the
    // same brand. N is displayed beside every figure instead of being hashed.
    expect(await hashOf(companyId, { repetitions: 1 })).toBe(
      await hashOf(companyId, { repetitions: 5 }),
    )
  })

  it('changes when an alias changes', async () => {
    const companyId = await createFixture('hash-alias', { aliases: ['Acme'] })
    const before = await hashOf(companyId)

    await patchCompany(
      jsonRequest('http://localhost/patch', 'PATCH', { aliases: ['Acme', 'AcmeCo'] }),
      ctx(companyId),
    )
    expect(await hashOf(companyId)).not.toBe(before)
  })

  it('changes when a competitor changes', async () => {
    const companyId = await createFixture('hash-competitor', { competitors: ['Globex'] })
    const before = await hashOf(companyId)

    await patchCompany(
      jsonRequest('http://localhost/patch', 'PATCH', { competitors: ['Globex', 'Initech'] }),
      ctx(companyId),
    )
    expect(await hashOf(companyId)).not.toBe(before)
  })

  it('changes when a prompt changes', async () => {
    const companyId = await createFixture('hash-prompt', { prompts: ['one', 'two'] })
    const before = await hashOf(companyId)

    await putPrompts(
      jsonRequest('http://localhost/prompts', 'PUT', { prompts: ['one', 'different'] }),
      ctx(companyId),
    )
    expect(await hashOf(companyId)).not.toBe(before)
  })

  it('changes when the prompts are merely reordered, because their order is the basis', async () => {
    const companyId = await createFixture('hash-order', { prompts: ['one', 'two'] })
    const before = await hashOf(companyId)

    await putPrompts(
      jsonRequest('http://localhost/prompts', 'PUT', { prompts: ['two', 'one'] }),
      ctx(companyId),
    )
    expect(await hashOf(companyId)).not.toBe(before)
  })

  it('changes when the target list changes', async () => {
    // Every target here must be priced, because an unpriceable one is now refused
    // at queue time (C3). The model-id-only variation is covered by the unit test
    // in tests/hash.test.ts, which calls basisHash directly and needs no price.
    const companyId = await createFixture('hash-targets')
    const before = await hashOf(companyId, { targets: [DEFAULT_TARGETS[0]!] })
    const after = await hashOf(companyId, { targets: [DEFAULT_TARGETS[1]!] })
    expect(after).not.toBe(before)
  })

  it('changes when a target is added to the list', async () => {
    const companyId = await createFixture('hash-target-added')
    const one = await hashOf(companyId, { targets: [DEFAULT_TARGETS[0]!] })
    const both = await hashOf(companyId, { targets: [...DEFAULT_TARGETS] })
    expect(both).not.toBe(one)
  })
})

describe('POST /api/runs - a company with no prompts', () => {
  it('rejects and creates no run', async () => {
    const companyId = await createFixture('noprompts', { prompts: [] })
    const before = await prisma.run.count()

    const response = await queue({ companyId })
    expect(response.status).toBe(400)

    expect(await prisma.run.count()).toBe(before)
    expect(await prisma.run.count({ where: { companyId } })).toBe(0)
  })

  it('rejects after the prompt list has been cleared, and creates no run', async () => {
    const companyId = await createFixture('emptied', { prompts: ['temporary'] })
    await putPrompts(jsonRequest('http://localhost/prompts', 'PUT', { prompts: [] }), ctx(companyId))

    const before = await prisma.run.count()
    const response = await queue({ companyId })
    expect(response.status).toBe(400)
    expect(await prisma.run.count()).toBe(before)
  })
})

describe('POST /api/runs - N', () => {
  it('accepts a numeric string, because the dialog submits form values', async () => {
    const companyId = await createFixture('n-string')
    const run = await loadRun(await queueOk({ companyId, repetitions: '4' }))
    expect(run.repetitions).toBe(4)
  })

  it('accepts the guardrail maximum', async () => {
    const companyId = await createFixture('n-max')
    const run = await loadRun(await queueOk({ companyId, repetitions: MAX_REPETITIONS }))
    expect(run.repetitions).toBe(MAX_REPETITIONS)
  })

  it('rejects 0, a negative, a fraction and anything past the guardrail', async () => {
    const companyId = await createFixture('n-bad')
    const before = await prisma.run.count()

    for (const repetitions of [0, -1, 2.5, MAX_REPETITIONS + 1, 1000, 'abc']) {
      const response = await queue({ companyId, repetitions })
      expect(response.status).toBe(400)
    }

    expect(await prisma.run.count()).toBe(before)
  })
})

describe('POST /api/runs - targets', () => {
  it('rejects an empty target list and creates no run', async () => {
    const companyId = await createFixture('t-empty')
    const before = await prisma.run.count()

    const response = await queue({ companyId, targets: [] })
    expect(response.status).toBe(400)
    expect(await prisma.run.count()).toBe(before)
  })

  it('rejects an unknown provider', async () => {
    const companyId = await createFixture('t-provider')
    const response = await queue({
      companyId,
      targets: [{ provider: 'not-a-provider', modelId: 'x' }],
    })
    expect(response.status).toBe(400)
  })

  it('rejects a duplicated target, names it, and creates no run', async () => {
    const companyId = await createFixture('t-dupe')
    const before = await prisma.run.count()
    const first = DEFAULT_TARGETS[0]!

    const response = await queue({
      companyId,
      targets: [first, DEFAULT_TARGETS[1]!, first],
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain(`${first.provider}:${first.modelId}`)
    expect(await prisma.run.count()).toBe(before)
  })

  it('accepts the full default target list', async () => {
    const companyId = await createFixture('t-all')
    const run = await loadRun(await queueOk({ companyId, targets: [...DEFAULT_TARGETS] }))
    expect(run.targets).toHaveLength(DEFAULT_TARGETS.length)
  })

  it('rejects a target with no price on record, names it, and creates no run', async () => {
    const companyId = await createFixture('t-unpriced')
    const before = await prisma.run.count()

    // A target the price table does not carry cannot be costed, and rule 12
    // forbids a price living anywhere else - so the run could never report what
    // it spent. Refused at queue time rather than after every call has failed.
    const response = await queue({
      companyId,
      targets: [{ provider: 'openai', modelId: 'gpt-9-does-not-exist' }],
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('openai:gpt-9-does-not-exist')
    expect(await prisma.run.count()).toBe(before)
  })

  it('rejects the whole request when only one target of several is unpriced', async () => {
    const companyId = await createFixture('t-unpriced-mixed')
    const before = await prisma.run.count()

    const response = await queue({
      companyId,
      targets: [DEFAULT_TARGETS[0]!, { provider: 'anthropic', modelId: 'claude-nonexistent' }],
    })

    expect(response.status).toBe(400)
    expect(await prisma.run.count()).toBe(before)
  })
})

describe('POST /api/runs - rejection', () => {
  it('returns 404 for an unknown company and creates no run', async () => {
    const before = await prisma.run.count()
    const response = await queue({ companyId: '00000000-0000-0000-0000-000000000000' })
    expect(response.status).toBe(404)
    expect(await prisma.run.count()).toBe(before)
  })

  it('returns 404 for a malformed company id rather than throwing', async () => {
    const before = await prisma.run.count()
    for (const bad of ['not-a-uuid', '123', 'ffffffff-ffff-ffff-ffff']) {
      const response = await queue({ companyId: bad })
      expect(response.status).toBe(404)
    }
    expect(await prisma.run.count()).toBe(before)
  })

  it('rejects a payload that fails the schema and creates no run', async () => {
    const before = await prisma.run.count()
    for (const bad of [{}, { companyId: '' }, { companyId: 42 }, { companyId: null }]) {
      const response = await queue(bad)
      expect(response.status).toBe(400)
    }
    expect(await prisma.run.count()).toBe(before)
  })

  it('rejects a body that is not JSON', async () => {
    const response = await postRun(
      new Request('http://localhost/api/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not json at all',
      }),
    )
    expect(response.status).toBe(400)
  })
})

/**
 * The `FOR UPDATE` lock, deferred from Phase 3 and proved here on Phase 4's
 * harness.
 *
 * `queueRun` reads the company and its prompts as **two separate SQL statements**
 * - verified against the query log: Prisma issues an `include` as two queries -
 * and PostgreSQL's default READ COMMITTED gives each statement its own snapshot.
 * So wrapping them in a transaction is not enough on its own; the lock is what
 * serialises them against a concurrent prompt replacement, which takes the same
 * lock.
 *
 * The invariant is that a run never records a basis that did not exist at some
 * instant: either the whole old list, or the request is refused because the list
 * was cleared first. Never a partial list, and never a run with no prompts at all.
 */
describe('POST /api/runs - queued while the prompt list is being replaced', () => {
  it('snapshots one coherent state, never a partial list or an empty run', async () => {
    const original = ['original one', 'original two', 'original three']

    for (let round = 0; round < 8; round += 1) {
      const companyId = await createFixture(`race-${round}`, { prompts: original })

      const results = await raceWithSeparateConnections(2, async (client, index) => {
        if (index === 0) {
          // Clear the list entirely - the most destructive concurrent edit.
          await replacePromptList(client, companyId, [])
          return { actor: 'replace' as const }
        }
        const queued = await queueRun({
          prisma: client,
          companyId,
          repetitions: 1,
          targets: [...DEFAULT_TARGETS],
        })
        return { actor: 'queue' as const, queued }
      })

      expect(
        results.every((r) => r.status === 'fulfilled'),
        `round ${round}: ${JSON.stringify(results.map((r) => (r.status === 'rejected' ? String(r.reason) : 'ok')))}`,
      ).toBe(true)

      const values = fulfilled(results)
      const queueResult = values.find((v) => v.actor === 'queue')
      expect(queueResult).toBeDefined()
      const queued = queueResult && 'queued' in queueResult ? queueResult.queued : undefined

      if (queued?.ok) {
        // The run went ahead: its snapshot must be the whole original list.
        const run = await loadRun(queued.runId)
        expect(
          run.prompts.map((p) => p.text),
          `round ${round}: snapshot was not the whole original list`,
        ).toEqual(original)
        expect(run.prompts).not.toHaveLength(0)
      } else {
        // Or the replacement won and the list was empty, so C3 refused it.
        expect(queued?.reason).toBe('no-prompts')
        expect(await prisma.run.count({ where: { companyId } })).toBe(0)
      }

      // Either way the company's own list ends up cleared - the replacement ran.
      expect(await prisma.prompt.count({ where: { companyId } })).toBe(0)
    }
  })
})

/**
 * The prompt-list ceiling (`MAX_PROMPTS`). A cost guardrail rather than a
 * capability, enforced at queue time because C2 requires a long list to still
 * save - saving is free, running is what spends money.
 */
describe('POST /api/runs - the prompt-list ceiling', () => {
  function lines(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `prompt number ${i}`)
  }

  it('queues a run at exactly the maximum', async () => {
    const companyId = await createFixture('at-max-prompts', { prompts: lines(MAX_PROMPTS) })
    const run = await loadRun(await queueOk({ companyId, repetitions: 1 }))
    expect(run.prompts).toHaveLength(MAX_PROMPTS)
  })

  it('refuses one past the maximum, names the numbers, and creates no run', async () => {
    const count = MAX_PROMPTS + 1
    const companyId = await createFixture('over-max-prompts', { prompts: lines(count) })
    const before = await prisma.run.count()

    const response = await queue({ companyId, repetitions: DEFAULT_REPETITIONS })
    expect(response.status).toBe(400)

    const body = (await response.json()) as { error: string }
    expect(body.error).toContain(String(count))
    expect(body.error).toContain(String(MAX_PROMPTS))
    // ...and the call count it would have cost, which is the reason for the bound.
    expect(body.error).toContain(String(count * DEFAULT_TARGETS.length * DEFAULT_REPETITIONS))

    expect(await prisma.run.count()).toBe(before)
    expect(await prisma.run.count({ where: { companyId } })).toBe(0)
  })

  it('still allows the oversized list to be SAVED, per C2', async () => {
    // The bound is on running, not on storing. C2 says a list over 50 "SHALL
    // still allow the save", so enforcing this at save time would contradict it.
    const companyId = await createFixture('save-over-max', { prompts: [] })
    const put = await putPrompts(
      jsonRequest('http://localhost/prompts', 'PUT', { prompts: lines(MAX_PROMPTS + 25) }),
      ctx(companyId),
    )
    expect(put.status).toBe(200)
    expect(await prisma.prompt.count({ where: { companyId } })).toBe(MAX_PROMPTS + 25)
  })
})

/**
 * The cost bound (`MAX_PLANNED_CALLS`).
 *
 * `MAX_PROMPTS` and `MAX_REPETITIONS` each bound one factor, and a run's cost is
 * the **product** of three: prompts x targets x N. Bounding one factor leaves the
 * product unbounded, which is the hole this block exists to close - the first test
 * below is a run that satisfies every other limit in the codebase and would still
 * have spent about eight hundred dollars.
 *
 * Driven through the endpoint rather than through `queueRun`, and asserting on
 * `prisma.run.count()`, because the claim is "no run is created and therefore no
 * provider call is ever made for it" - a statement about the database after the
 * request, not about the return value of a function (CLAUDE.md rule 18).
 */
describe('POST /api/runs - the cost bound', () => {
  const TARGETS = DEFAULT_TARGETS.length

  function lines(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `prompt number ${i}`)
  }

  it('refuses the run that passes every other limit: MAX_PROMPTS x targets x MAX_REPETITIONS', async () => {
    // 100 prompts is exactly MAX_PROMPTS and 50 is exactly MAX_REPETITIONS, so
    // neither of those checks fires. The product is 10,000 calls.
    const companyId = await createFixture('product-blowout', { prompts: lines(MAX_PROMPTS) })
    const before = await prisma.run.count()

    const response = await queue({ companyId, repetitions: MAX_REPETITIONS })
    expect(response.status).toBe(400)

    const body = (await response.json()) as { error: string }
    expect(body.error).toContain(String(MAX_PROMPTS * TARGETS * MAX_REPETITIONS))
    expect(body.error).toContain(String(MAX_PLANNED_CALLS))
    // The figure the operator actually cares about is money, so it is stated.
    expect(body.error).toContain('$')
    // It must not be reported as a prompt-list problem: the list is legal.
    expect(body.error).not.toContain('above the limit of ' + String(MAX_PROMPTS) + '.')

    expect(await prisma.run.count()).toBe(before)
  })

  it('queues a run at exactly the limit', async () => {
    const prompts = MAX_PLANNED_CALLS / (TARGETS * DEFAULT_REPETITIONS)
    expect(Number.isInteger(prompts)).toBe(true)

    const companyId = await createFixture('at-max-calls', { prompts: lines(prompts) })
    const runId = await queueOk({ companyId, repetitions: DEFAULT_REPETITIONS })

    const response = await queue({ companyId, repetitions: DEFAULT_REPETITIONS })
    expect(response.status).toBe(201)
    expect((await response.json()) as { plannedCalls: number }).toMatchObject({
      plannedCalls: MAX_PLANNED_CALLS,
    })

    const run = await loadRun(runId)
    expect(run.prompts).toHaveLength(prompts)
  })

  it('refuses one prompt past the limit, names all three factors, and creates no run', async () => {
    const prompts = MAX_PLANNED_CALLS / (TARGETS * DEFAULT_REPETITIONS) + 1
    const companyId = await createFixture('over-max-calls', { prompts: lines(prompts) })
    const before = await prisma.run.count()

    const response = await queue({ companyId, repetitions: DEFAULT_REPETITIONS })
    expect(response.status).toBe(400)

    const body = (await response.json()) as { error: string }
    expect(body.error).toContain(String(prompts * TARGETS * DEFAULT_REPETITIONS))
    // All three factors, because a reader cannot otherwise tell which to change.
    expect(body.error).toContain(`${prompts} prompts`)
    expect(body.error).toContain(`${TARGETS} targets`)
    expect(body.error).toContain(`N=${DEFAULT_REPETITIONS}`)

    expect(await prisma.run.count()).toBe(before)
  })

  it('lets N alone breach it on a short prompt list', async () => {
    // Four prompts is nothing and N=50 is legal, and the product is still 400.
    // Before this bound existed there was no check that would have refused it.
    const companyId = await createFixture('short-list-huge-n', { prompts: lines(4) })
    const before = await prisma.run.count()

    const response = await queue({ companyId, repetitions: MAX_REPETITIONS })
    expect(response.status).toBe(400)
    expect(((await response.json()) as { error: string }).error).toContain(
      String(4 * TARGETS * MAX_REPETITIONS),
    )
    expect(await prisma.run.count()).toBe(before)
  })

  it('counts targets as a factor: the same list runs when fewer targets are measured', async () => {
    const prompts = MAX_PLANNED_CALLS / (TARGETS * DEFAULT_REPETITIONS) + 1
    const companyId = await createFixture('fewer-targets', { prompts: lines(prompts) })

    // Refused against the full target list...
    expect((await queue({ companyId, repetitions: DEFAULT_REPETITIONS })).status).toBe(400)

    // ...and allowed against one, because the bound is on the product and not on
    // any single factor.
    const runId = await queueOk({
      companyId,
      repetitions: DEFAULT_REPETITIONS,
      targets: [DEFAULT_TARGETS[0]],
    })
    const run = await loadRun(runId)
    expect(run.targets).toHaveLength(1)
  })
})

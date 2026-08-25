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
import { PUT as putPrompts } from '../../src/app/api/companies/[companyId]/prompts/route.ts'
import { POST as postRun } from '../../src/app/api/runs/route.ts'
import { DEFAULT_REPETITIONS, DEFAULT_TARGETS, MAX_REPETITIONS } from '../../src/lib/defaults.ts'
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
    const run = await loadRun(
      await queueOk({
        companyId,
        targets: [{ provider: 'openai', modelId: 'some-other-model' }],
      }),
    )

    expect(run.targets).toHaveLength(1)
    expect(run.targets[0]?.provider).toBe('openai')
    expect(run.targets[0]?.modelId).toBe('some-other-model')
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

  it('changes when a model id changes', async () => {
    const companyId = await createFixture('hash-model')
    const before = await hashOf(companyId, {
      targets: [{ provider: 'openai', modelId: 'model-a' }],
    })
    const after = await hashOf(companyId, {
      targets: [{ provider: 'openai', modelId: 'model-b' }],
    })
    expect(after).not.toBe(before)
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

    const response = await queue({
      companyId,
      targets: [
        { provider: 'anthropic', modelId: 'model-a' },
        { provider: 'openai', modelId: 'model-b' },
        { provider: 'anthropic', modelId: 'model-a' },
      ],
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('anthropic:model-a')
    expect(await prisma.run.count()).toBe(before)
  })

  it('accepts the same model id under two different providers', async () => {
    const companyId = await createFixture('t-samemodel')
    const run = await loadRun(
      await queueOk({
        companyId,
        targets: [
          { provider: 'anthropic', modelId: 'shared-name' },
          { provider: 'openai', modelId: 'shared-name' },
        ],
      }),
    )
    expect(run.targets).toHaveLength(2)
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

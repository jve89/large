/**
 * SPEC C1 — Company registry.
 *
 * These run against a real PostgreSQL. The two rules that matter most here are
 * negative ones — "nothing is persisted" when a name is empty, and "every
 * existing run is left untouched" when a company is edited — and neither can be
 * checked against a mock, because both are claims about what the database holds
 * afterwards.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { GET as listCompanies, POST as createCompany } from '../../src/app/api/companies/route.ts'
import {
  GET as getCompany,
  PATCH as patchCompany,
} from '../../src/app/api/companies/[companyId]/route.ts'
import { prisma } from '../../src/lib/db.ts'

const PREFIX = `test-c1-${process.pid}-`
const created: string[] = []

function post(body: unknown): Request {
  return new Request('http://localhost/api/companies', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function patch(body: unknown): Request {
  return new Request('http://localhost/api/companies/x', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function ctx(companyId: string): { params: Promise<{ companyId: string }> } {
  return { params: Promise.resolve({ companyId }) }
}

async function createFixture(body: {
  name: string
  aliases?: string[]
  competitors?: string[]
}): Promise<string> {
  const response = await createCompany(post(body))
  expect(response.status).toBe(201)
  const { id } = (await response.json()) as { id: string }
  created.push(id)
  return id
}

afterAll(async () => {
  for (const id of created) {
    // Run holds companyId with ON DELETE RESTRICT, so runs go first. Their
    // targets, prompts, answers, citations and mentions cascade from there.
    await prisma.run.deleteMany({ where: { companyId: id } })
    await prisma.prompt.deleteMany({ where: { companyId: id } })
    await prisma.company.deleteMany({ where: { id } })
  }
  await prisma.$disconnect()
})

describe('POST /api/companies', () => {
  it('persists a company with its aliases and competitors, retrievable by id', async () => {
    const id = await createFixture({
      name: `${PREFIX}acme`,
      aliases: ['Acme', 'AcmeCo'],
      competitors: ['Globex', 'Initech'],
    })

    const response = await getCompany(new Request('http://localhost'), ctx(id))
    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      company: { id: string; name: string; aliases: string[]; competitors: string[] }
    }
    expect(body.company.id).toBe(id)
    expect(body.company.name).toBe(`${PREFIX}acme`)
    expect(body.company.aliases).toEqual(['Acme', 'AcmeCo'])
    expect(body.company.competitors).toEqual(['Globex', 'Initech'])
  })

  it('accepts an empty competitor list', async () => {
    const id = await createFixture({ name: `${PREFIX}alone`, aliases: ['Alone'] })
    const company = await prisma.company.findUnique({ where: { id } })
    expect(company?.competitors).toEqual([])
  })

  it('preserves alias order, because the first alias labels the mentions', async () => {
    const id = await createFixture({
      name: `${PREFIX}order`,
      aliases: ['Zeta', 'Alpha', 'Mu'],
    })
    const company = await prisma.company.findUnique({ where: { id } })
    expect(company?.aliases).toEqual(['Zeta', 'Alpha', 'Mu'])
  })

  it('trims, drops blanks and de-duplicates case-insensitively', async () => {
    const id = await createFixture({
      name: `${PREFIX}messy`,
      aliases: ['  Acme  ', '', 'ACME', 'AcmeCo', '   '],
      competitors: ['Globex', 'globex'],
    })
    const company = await prisma.company.findUnique({ where: { id } })
    expect(company?.aliases).toEqual(['Acme', 'AcmeCo'])
    expect(company?.competitors).toEqual(['Globex'])
  })

  it('rejects an empty name and persists nothing', async () => {
    const before = await prisma.company.count()
    const response = await createCompany(post({ name: '', aliases: [], competitors: [] }))
    expect(response.status).toBe(400)
    expect(await prisma.company.count()).toBe(before)
  })

  it('rejects a whitespace-only name and persists nothing', async () => {
    const before = await prisma.company.count()
    const response = await createCompany(post({ name: '   ' }))
    expect(response.status).toBe(400)
    expect(await prisma.company.count()).toBe(before)
  })

  it('rejects a payload that fails the schema and persists nothing', async () => {
    const before = await prisma.company.count()
    const response = await createCompany(post({ name: 42, aliases: 'not-an-array' }))
    expect(response.status).toBe(400)
    expect(await prisma.company.count()).toBe(before)
  })
})

describe('GET /api/companies', () => {
  it('lists companies with their run count', async () => {
    const id = await createFixture({ name: `${PREFIX}listed`, aliases: ['Listed'] })
    const response = await listCompanies()
    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      companies: { id: string; name: string; runCount: number }[]
    }
    const mine = body.companies.find((c) => c.id === id)
    expect(mine).toBeDefined()
    expect(mine?.runCount).toBe(0)
  })

  it('returns 404 for an unknown company', async () => {
    const response = await getCompany(
      new Request('http://localhost'),
      ctx('00000000-0000-0000-0000-000000000000'),
    )
    expect(response.status).toBe(404)
  })
})

describe('PATCH /api/companies/:companyId', () => {
  it('persists a changed name, alias list and competitor list', async () => {
    const id = await createFixture({
      name: `${PREFIX}before`,
      aliases: ['Before'],
      competitors: ['Rival'],
    })

    const response = await patchCompany(
      patch({
        name: `${PREFIX}after`,
        aliases: ['After', 'AfterCo'],
        competitors: ['Rival', 'NewRival'],
      }),
      ctx(id),
    )
    expect(response.status).toBe(200)

    const company = await prisma.company.findUnique({ where: { id } })
    expect(company?.name).toBe(`${PREFIX}after`)
    expect(company?.aliases).toEqual(['After', 'AfterCo'])
    expect(company?.competitors).toEqual(['Rival', 'NewRival'])
  })

  it('updates only the fields that are present', async () => {
    const id = await createFixture({
      name: `${PREFIX}partial`,
      aliases: ['Keep'],
      competitors: ['AlsoKeep'],
    })

    const response = await patchCompany(patch({ name: `${PREFIX}renamed` }), ctx(id))
    expect(response.status).toBe(200)

    const company = await prisma.company.findUnique({ where: { id } })
    expect(company?.name).toBe(`${PREFIX}renamed`)
    expect(company?.aliases).toEqual(['Keep'])
    expect(company?.competitors).toEqual(['AlsoKeep'])
  })

  it('rejects an empty name and persists nothing', async () => {
    const id = await createFixture({ name: `${PREFIX}keepname`, aliases: ['Keep'] })

    const response = await patchCompany(patch({ name: '' }), ctx(id))
    expect(response.status).toBe(400)

    const company = await prisma.company.findUnique({ where: { id } })
    expect(company?.name).toBe(`${PREFIX}keepname`)
  })

  it('rejects a whitespace-only name and persists nothing', async () => {
    const id = await createFixture({ name: `${PREFIX}keepname2`, aliases: ['Keep'] })

    const response = await patchCompany(patch({ name: '  ' }), ctx(id))
    expect(response.status).toBe(400)

    const company = await prisma.company.findUnique({ where: { id } })
    expect(company?.name).toBe(`${PREFIX}keepname2`)
  })

  it('returns 404 for an unknown company', async () => {
    const response = await patchCompany(
      patch({ name: 'whatever' }),
      ctx('00000000-0000-0000-0000-000000000000'),
    )
    expect(response.status).toBe(404)
  })

  it('leaves every existing run untouched (C1, CLAUDE.md rule 10)', async () => {
    const id = await createFixture({
      name: `${PREFIX}snapshot`,
      aliases: ['Snap'],
      competitors: ['Rival'],
    })

    // A run carries its own copy of the brand definition, taken at queue time.
    const run = await prisma.run.create({
      data: {
        companyId: id,
        status: 'queued',
        repetitions: 3,
        brandName: `${PREFIX}snapshot`,
        brandAliases: ['Snap'],
        brandCompetitors: ['Rival'],
        basisHash: 'fixed-basis-hash',
        prompts: { create: [{ text: 'a prompt', order: 0 }] },
        targets: { create: [{ provider: 'anthropic', modelId: 'model-x' }] },
      },
      select: { id: true },
    })

    await patchCompany(
      patch({
        name: `${PREFIX}renamed-entirely`,
        aliases: ['CompletelyDifferent'],
        competitors: ['SomeoneElse'],
      }),
      ctx(id),
    )

    const after = await prisma.run.findUnique({
      where: { id: run.id },
      include: { prompts: true, targets: true },
    })

    expect(after?.brandName).toBe(`${PREFIX}snapshot`)
    expect(after?.brandAliases).toEqual(['Snap'])
    expect(after?.brandCompetitors).toEqual(['Rival'])
    expect(after?.basisHash).toBe('fixed-basis-hash')
    expect(after?.prompts.map((p) => p.text)).toEqual(['a prompt'])
    expect(after?.targets.map((t) => t.modelId)).toEqual(['model-x'])
  })
})

/**
 * SPEC C11 - the comparability guard.
 *
 * The seven runs PLAN names, plus the two things that would silently break the
 * guard from the inside: an input added to `basisHash` that should not be there,
 * and an ordering that makes two identical bases hash differently.
 *
 * The failure mode this capability has is a **false negative** - refusing a
 * comparison that is valid - and it is the quieter of the two. A false positive
 * draws a wrong line and someone eventually notices; a false negative just tells a
 * customer their history is unavailable, and nobody argues with it.
 */
import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AGGREGATION_SEMANTICS_VERSION } from '../src/lib/aggregate.ts'
import { comparable, groupIntoSeries } from '../src/lib/comparability.ts'
import { MEASUREMENT_SEMANTICS_VERSION } from '../src/core/parse/semantics.ts'
import { basisHash, basisHashAt } from '../src/lib/hash.ts'
import { prisma } from '../src/lib/db.ts'
import { sweepByPrefix } from './helpers/cleanup.ts'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {} }),
  notFound: () => {
    throw new Error('notFound')
  },
}))

const BASE = {
  prompts: ['who is best in Leeds?', 'who does emergency call-outs?'],
  targets: [
    { provider: 'anthropic' as const, modelId: 'claude-sonnet-5' },
    { provider: 'openai' as const, modelId: 'gpt-5.6-terra' },
  ],
  aliases: ['Acme', 'AcmeCo'],
  competitors: ['Globex', 'Initech'],
}

describe('the seven runs', () => {
  it('1. an identical basis is one series', () => {
    expect(basisHash(BASE)).toBe(basisHash({ ...BASE }))
    expect(comparable(run('a', basisHash(BASE)), run('b', basisHash(BASE)))).toBe(true)
  })

  it('2. a changed prompt breaks the series', () => {
    expect(basisHash({ ...BASE, prompts: ['who is best in Leeds?', 'different'] })).not.toBe(
      basisHash(BASE),
    )
  })

  it('3. a changed model id breaks the series', () => {
    expect(
      basisHash({
        ...BASE,
        targets: [BASE.targets[0]!, { provider: 'openai' as const, modelId: 'gpt-5.7' }],
      }),
    ).not.toBe(basisHash(BASE))
  })

  it('4. a changed alias list breaks the series', () => {
    expect(basisHash({ ...BASE, aliases: ['Acme'] })).not.toBe(basisHash(BASE))
  })

  it('5. a changed competitor list breaks the series', () => {
    expect(basisHash({ ...BASE, competitors: ['Globex'] })).not.toBe(basisHash(BASE))
  })

  it('6. a changed MEASUREMENT_SEMANTICS_VERSION breaks the series', () => {
    // The only basis input no operator action produces. An alias change is visible
    // to whoever made it; a parser change is visible to nobody.
    expect(basisHashAt(BASE, MEASUREMENT_SEMANTICS_VERSION)).not.toBe(
      basisHashAt(BASE, MEASUREMENT_SEMANTICS_VERSION + 1),
    )
  })

  it('7. a changed brand NAME does not break the series', () => {
    // The brand name is snapshotted and deliberately not hashed: renaming a
    // company does not change what was measured, while changing an alias does.
    // `MeasurementBasis` has no name field at all, which is how that is enforced.
    expect(basisHash(BASE)).toBe(basisHash({ ...BASE }))
    expect(Object.keys(BASE)).not.toContain('brandName')
  })
})

describe('canonical form - none of the four operator inputs is a sequence', () => {
  it('prompt order does not change the hash', () => {
    // Changed 2026-08-25. Every (prompt, target, repetition) is an independent
    // call, so twenty prompts asked in a different order are the same twenty
    // questions. Hashing them as a list refused a comparison between two runs that
    // asked identically - a false negative, and the quiet kind.
    expect(basisHash({ ...BASE, prompts: [...BASE.prompts].reverse() })).toBe(basisHash(BASE))
  })

  it('target order does not change the hash', () => {
    expect(basisHash({ ...BASE, targets: [...BASE.targets].reverse() })).toBe(basisHash(BASE))
  })

  it('alias and competitor order do not change the hash', () => {
    expect(
      basisHash({
        ...BASE,
        aliases: [...BASE.aliases].reverse(),
        competitors: [...BASE.competitors].reverse(),
      }),
    ).toBe(basisHash(BASE))
  })

  it('a duplicate alias is collapsed, and a duplicate prompt is NOT', () => {
    // Different upstream guarantees: C2 already promises a stored prompt list has
    // no duplicates, so collapsing one here would hide a C2 failure. Nothing
    // promises an operator did not type a name twice.
    expect(basisHash({ ...BASE, aliases: [...BASE.aliases, 'Acme'] })).toBe(basisHash(BASE))
    expect(basisHash({ ...BASE, prompts: [...BASE.prompts, BASE.prompts[0]!] })).not.toBe(
      basisHash(BASE),
    )
  })

  it('whitespace-padded names are equal to their trimmed form', () => {
    expect(basisHash({ ...BASE, competitors: ['  Globex ', 'Initech'] })).toBe(basisHash(BASE))
  })

  it('orders by code unit, so the same basis hashes identically on any host', () => {
    // localeCompare depends on the runtime's ICU data. For a hash whose whole job
    // is to be equal across time and machines, that would be fatal rather than
    // untidy - the same failure class as the cited-domain tie-break.
    const accented = { ...BASE, competitors: ['Zeta', 'Ápple', 'apple'] }
    expect(basisHash(accented)).toBe(
      basisHash({ ...accented, competitors: ['apple', 'Zeta', 'Ápple'] }),
    )
  })
})

describe('what basisHash must NOT contain', () => {
  it('is a function of exactly five inputs and nothing else', () => {
    // The real guard against the aggregation version - or anything else - being
    // added later. Recomputing the payload here means a sixth input turns this
    // red, which a comment cannot do.
    const expected = createHash('sha256')
      .update(
        JSON.stringify({
          prompts: [...BASE.prompts].map((p) => p.normalize('NFC')).sort(),
          targets: BASE.targets
            .map((t) => [t.provider, t.modelId])
            .sort((a, b) => (a[0]! < b[0]! ? -1 : a[0]! > b[0]! ? 1 : a[1]! < b[1]! ? -1 : 1)),
          aliases: [...new Set(BASE.aliases)].sort(),
          competitors: [...new Set(BASE.competitors)].sort(),
          semanticsVersion: MEASUREMENT_SEMANTICS_VERSION,
        }),
        'utf8',
      )
      .digest('hex')

    expect(basisHash(BASE)).toBe(expected)
  })

  it('does not react to the aggregation semantics version', () => {
    // Proved rather than commented, as asked. Two runs on one basis stay one
    // series whatever the aggregation version is, because the hash never saw it -
    // and both are rendered under today's rule whenever they are read.
    expect(AGGREGATION_SEMANTICS_VERSION).toBeGreaterThan(0)
    const hash = basisHash(BASE)
    const view = groupIntoSeries([run('a', hash), run('b', hash)])
    expect(view.basisChanged).toBe(false)
    expect(view.series).toHaveLength(1)
    expect(view.series[0]!.runs).toHaveLength(2)
  })
})

function run(id: string, basisHash: string, createdAt = new Date(2026, 0, 1)) {
  return { id, basisHash, createdAt }
}

describe('grouping runs into series', () => {
  it('separates two bases and reports that the basis changed', () => {
    const view = groupIntoSeries([
      run('a', 'basis-1', new Date(2026, 0, 1)),
      run('b', 'basis-2', new Date(2026, 0, 2)),
    ])
    expect(view.basisChanged).toBe(true)
    expect(view.series.map((s) => s.basisHash)).toEqual(['basis-1', 'basis-2'])
  })

  it('groups by basis and not by adjacency, so A-B-A is two series and not three', () => {
    // The two A runs are comparable to each other; the B run between them changed
    // nothing about what they measured. Splitting on adjacency would refuse a
    // comparison that is valid, which is the failure this capability is for.
    const view = groupIntoSeries([
      run('a1', 'basis-A', new Date(2026, 0, 1)),
      run('b1', 'basis-B', new Date(2026, 0, 2)),
      run('a2', 'basis-A', new Date(2026, 0, 3)),
    ])
    expect(view.series).toHaveLength(2)
    expect(view.series[0]!.runs.map((r) => r.id)).toEqual(['a1', 'a2'])
    expect(view.series[1]!.runs.map((r) => r.id)).toEqual(['b1'])
  })

  it('orders series by their earliest run and runs chronologically', () => {
    const view = groupIntoSeries([
      run('late', 'basis-B', new Date(2026, 0, 9)),
      run('old', 'basis-A', new Date(2026, 0, 2)),
      run('older', 'basis-A', new Date(2026, 0, 1)),
    ])
    expect(view.series.map((s) => s.ordinal)).toEqual([1, 2])
    expect(view.series[0]!.basisHash).toBe('basis-A')
    expect(view.series[0]!.runs.map((r) => r.id)).toEqual(['older', 'old'])
  })

  it('is fully determined when two runs share a timestamp', () => {
    const same = new Date(2026, 0, 1)
    const first = groupIntoSeries([run('b', 'x', same), run('a', 'x', same)])
    const second = groupIntoSeries([run('a', 'x', same), run('b', 'x', same)])
    expect(first.series[0]!.runs.map((r) => r.id)).toEqual(['a', 'b'])
    expect(second.series[0]!.runs.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('handles no runs and one run without claiming a change', () => {
    expect(groupIntoSeries([]).basisChanged).toBe(false)
    expect(groupIntoSeries([run('a', 'x')]).basisChanged).toBe(false)
  })
})

const PREFIX = `test-c11-${process.pid}-`
let companyId = ''

beforeAll(async () => {
  await sweepByPrefix(prisma, PREFIX)
  const company = await prisma.company.create({
    data: { name: `${PREFIX}co`, aliases: ['Acme'], competitors: ['Globex'] },
  })
  companyId = company.id
})

afterAll(async () => {
  await sweepByPrefix(prisma, PREFIX)
  await prisma.$disconnect()
})

async function makeRun(hash: string, createdAt: Date): Promise<string> {
  const created = await prisma.run.create({
    data: {
      companyId,
      status: 'completed',
      repetitions: 3,
      brandName: `${PREFIX}brand`,
      basisHash: hash,
      createdAt,
      finishedAt: createdAt,
      prompts: { create: [{ text: 'p', order: 0 }] },
      targets: { create: [{ provider: 'anthropic', modelId: 'claude-sonnet-5' }] },
    },
  })
  return created.id
}

async function renderCompany(): Promise<string> {
  const { default: CompanyPage } = await import('../src/app/companies/[companyId]/page.tsx')
  return renderToStaticMarkup(await CompanyPage({ params: Promise.resolve({ companyId }) }))
}

describe('C11 at its surface - the company run list', () => {
  it('says so, and separates the groups, when the basis changed', async () => {
    await makeRun('basis-alpha', new Date(2026, 0, 1))
    await makeRun('basis-alpha', new Date(2026, 0, 2))
    await makeRun('basis-beta', new Date(2026, 0, 3))

    const html = await renderCompany()

    expect(html).toContain('data-basis-changed="true"')
    expect(html).toContain('not one series')
    expect(html).toContain('data-series="basis-alpha"')
    expect(html).toContain('data-series="basis-beta"')
    expect(html).toContain('Series 1 of 2')
    expect(html).toContain('Series 2 of 2')
  })

  it('returns the grouping from the API as well, so a client need not re-derive it', async () => {
    const { GET } = await import('../src/app/api/companies/[companyId]/route.ts')
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ companyId }),
    })
    const body = (await response.json()) as {
      comparability: { basisChanged: boolean; series: { basisHash: string; runIds: string[] }[] }
    }

    expect(body.comparability.basisChanged).toBe(true)
    expect(body.comparability.series.map((s) => s.basisHash)).toEqual([
      'basis-alpha',
      'basis-beta',
    ])
    expect(body.comparability.series[0]!.runIds).toHaveLength(2)
  })
})

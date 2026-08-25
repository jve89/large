/**
 * SPEC C2 - Prompt list.
 *
 * These run against a real PostgreSQL, for the same reason the C1 tests do: the
 * rules that matter here are claims about what the database holds afterwards -
 * "the previous list is replaced in full", "every existing run is left untouched",
 * "nothing is persisted" - and none of them can be checked against a mock.
 *
 * The two figures in the over-50 warning are recomputed here from
 * `src/lib/defaults.ts` rather than written as literals, so that changing a
 * default fails this test instead of leaving the warning quietly stale.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { POST as createCompany } from '../../src/app/api/companies/route.ts'
import {
  PROMPT_WARNING_THRESHOLD,
  PUT as putPrompts,
} from '../../src/app/api/companies/[companyId]/prompts/route.ts'
import { DEFAULT_REPETITIONS, DEFAULT_TARGETS } from '../../src/lib/defaults.ts'
import { prisma } from '../../src/lib/db.ts'

const PREFIX = `test-c2-${process.pid}-`
const created: string[] = []

interface PutBody {
  count: number
  submittedLines: number
  prompts: string[]
  duplicatesRemoved: string[]
  notice?: string
  warning?: string
}

function put(body: unknown): Request {
  return new Request('http://localhost/api/companies/x/prompts', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function ctx(companyId: string): { params: Promise<{ companyId: string }> } {
  return { params: Promise.resolve({ companyId }) }
}

async function createFixture(name: string): Promise<string> {
  const response = await createCompany(
    new Request('http://localhost/api/companies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: `${PREFIX}${name}` }),
    }),
  )
  expect(response.status).toBe(201)
  const { id } = (await response.json()) as { id: string }
  created.push(id)
  return id
}

/** Saves a list and returns the parsed 200 body. */
async function save(companyId: string, prompts: string[]): Promise<PutBody> {
  const response = await putPrompts(put({ prompts }), ctx(companyId))
  expect(response.status).toBe(200)
  return (await response.json()) as PutBody
}

/** The stored list, read straight from the database in `order`. */
async function stored(companyId: string): Promise<{ text: string; order: number }[]> {
  const rows = await prisma.prompt.findMany({
    where: { companyId },
    orderBy: { order: 'asc' },
    select: { text: true, order: true },
  })
  return rows
}

afterAll(async () => {
  for (const id of created) {
    await prisma.run.deleteMany({ where: { companyId: id } })
    await prisma.prompt.deleteMany({ where: { companyId: id } })
    await prisma.company.deleteMany({ where: { id } })
  }
  await prisma.$disconnect()
})

describe('PUT /api/companies/:companyId/prompts - storing the list', () => {
  it('persists every non-empty line as one ordered prompt, 0-based and contiguous', async () => {
    const id = await createFixture('basic')
    const body = await save(id, ['first prompt', 'second prompt', 'third prompt'])

    expect(body.count).toBe(3)
    expect(await stored(id)).toEqual([
      { text: 'first prompt', order: 0 },
      { text: 'second prompt', order: 1 },
      { text: 'third prompt', order: 2 },
    ])
  })

  it('drops blank and whitespace-only lines', async () => {
    const id = await createFixture('blanks')
    const body = await save(id, ['one', '', '   ', '\t', 'two', '  \n  ', 'three'])

    expect(body.count).toBe(3)
    expect(body.submittedLines).toBe(7)
    expect((await stored(id)).map((p) => p.text)).toEqual(['one', 'two', 'three'])
  })

  it('trims each line', async () => {
    const id = await createFixture('trim')
    await save(id, ['  leading', 'trailing   ', '  both  '])

    expect((await stored(id)).map((p) => p.text)).toEqual(['leading', 'trailing', 'both'])
  })

  it('does not Unicode-normalise the prompt text (CLAUDE.md rule 6)', async () => {
    const id = await createFixture('nfc')
    // "café" with a combining acute accent - NFD. C1 would fold this to NFC; C2
    // must not, because the prompt goes to the provider unmodified. hash.ts
    // normalises when it hashes, so the measurement basis is stable regardless.
    // Written as an escape so that an editor normalising this file cannot
    // silently turn the test into a tautology.
    const decomposed = 'best cafe\u0301 in Utrecht'
    await save(id, [decomposed])

    const rows = await stored(id)
    expect(rows[0]?.text).toBe(decomposed)
    expect(rows[0]?.text).not.toBe(decomposed.normalize('NFC'))
  })

  it('accepts an empty list and clears the prompts', async () => {
    const id = await createFixture('clear')
    await save(id, ['something'])
    expect(await stored(id)).toHaveLength(1)

    const body = await save(id, [])
    expect(body.count).toBe(0)
    expect(await stored(id)).toEqual([])
  })

  it('accepts a list that is only blank lines and clears the prompts', async () => {
    const id = await createFixture('allblank')
    await save(id, ['something'])

    const body = await save(id, ['', '   '])
    expect(body.count).toBe(0)
    expect(await stored(id)).toEqual([])
  })
})

/**
 * The replacement cases. `Prompt` carries UNIQUE (companyId, order), and an
 * implementation that updated the rows in place rather than replacing them would
 * collide with itself here - most visibly on the reordering case, where every new
 * row wants an `order` some surviving old row still holds.
 */
describe('PUT /api/companies/:companyId/prompts - replacing the list in full', () => {
  it('replaces a longer list with a shorter one', async () => {
    const id = await createFixture('shrink')
    await save(id, ['a', 'b', 'c', 'd', 'e'])

    const body = await save(id, ['a', 'b'])
    expect(body.count).toBe(2)
    expect(await stored(id)).toEqual([
      { text: 'a', order: 0 },
      { text: 'b', order: 1 },
    ])
  })

  it('replaces a shorter list with a longer one', async () => {
    const id = await createFixture('grow')
    await save(id, ['a'])

    const body = await save(id, ['a', 'b', 'c'])
    expect(body.count).toBe(3)
    expect((await stored(id)).map((p) => p.text)).toEqual(['a', 'b', 'c'])
  })

  it('replaces a list with the same entries reordered', async () => {
    const id = await createFixture('reorder')
    await save(id, ['a', 'b', 'c'])

    await save(id, ['c', 'a', 'b'])
    expect(await stored(id)).toEqual([
      { text: 'c', order: 0 },
      { text: 'a', order: 1 },
      { text: 'b', order: 2 },
    ])
  })

  it('replaces a list with entirely different entries', async () => {
    const id = await createFixture('swap')
    await save(id, ['old one', 'old two'])

    await save(id, ['new one', 'new two', 'new three'])
    expect((await stored(id)).map((p) => p.text)).toEqual(['new one', 'new two', 'new three'])
  })

  it('leaves exactly the second list after two saves in a row', async () => {
    const id = await createFixture('twice')
    await save(id, ['first', 'second', 'third'])
    await save(id, ['only'])

    expect(await stored(id)).toEqual([{ text: 'only', order: 0 }])
  })
})

/**
 * De-duplication (SPEC C2). On the **exact trimmed string** - never
 * case-insensitively, never with internal whitespace collapsed. Two prompts
 * differing in case or spacing are two different prompts to a provider, so they
 * are two different measurements.
 */
describe('PUT /api/companies/:companyId/prompts - duplicates', () => {
  it('stores an identical line once and reports what it removed', async () => {
    const id = await createFixture('dupes')
    const body = await save(id, ['same prompt', 'other prompt', 'same prompt'])

    expect(body.count).toBe(2)
    expect(body.submittedLines).toBe(3)
    expect(body.duplicatesRemoved).toEqual(['same prompt'])
    expect((await stored(id)).map((p) => p.text)).toEqual(['same prompt', 'other prompt'])
  })

  it('keeps the first occurrence and its position', async () => {
    const id = await createFixture('dupefirst')
    await save(id, ['alpha', 'beta', 'alpha', 'gamma'])

    expect(await stored(id)).toEqual([
      { text: 'alpha', order: 0 },
      { text: 'beta', order: 1 },
      { text: 'gamma', order: 2 },
    ])
  })

  it('treats lines that differ only in surrounding whitespace as duplicates', async () => {
    const id = await createFixture('dupetrim')
    const body = await save(id, ['a prompt', '  a prompt  '])

    expect(body.count).toBe(1)
    expect(body.duplicatesRemoved).toEqual(['a prompt'])
  })

  it('removes one line per extra copy, so three copies report two removals', async () => {
    const id = await createFixture('dupethree')
    const body = await save(id, ['x', 'x', 'x'])

    expect(body.count).toBe(1)
    expect(body.duplicatesRemoved).toEqual(['x', 'x'])
  })

  it('does NOT de-duplicate case-insensitively', async () => {
    const id = await createFixture('dupecase')
    const body = await save(id, ['Best plumber in Utrecht', 'best plumber in utrecht'])

    expect(body.count).toBe(2)
    expect(body.duplicatesRemoved).toEqual([])
    expect(body.notice).toBeUndefined()
  })

  it('does NOT de-duplicate across differing internal whitespace', async () => {
    const id = await createFixture('dupespace')
    const body = await save(id, ['best  plumber', 'best plumber'])

    expect(body.count).toBe(2)
    expect(body.duplicatesRemoved).toEqual([])
  })

  it('reports the lines submitted, the prompts stored and the specific lines removed', async () => {
    const id = await createFixture('dupenotice')
    const body = await save(id, ['keep me', '', 'drop me', 'drop me'])

    expect(body.notice).toBeDefined()
    const notice = body.notice ?? ''
    expect(notice).toContain('4 lines submitted')
    expect(notice).toContain('2 prompts stored')
    expect(notice).toContain('"drop me"')
    expect(notice).toContain('1 duplicate line was removed')
  })

  it('says nothing about duplicates when there are none', async () => {
    const id = await createFixture('nodupes')
    const body = await save(id, ['a', 'b'])

    expect(body.duplicatesRemoved).toEqual([])
    expect(body.notice).toBeUndefined()
  })
})

/**
 * The over-50 warning (SPEC C2). Both figures it is computed from come from
 * `lib/defaults.ts`, and this test recomputes them from the same source, so a
 * change to either default fails here rather than going unnoticed.
 */
describe('PUT /api/companies/:companyId/prompts - the over-50 warning', () => {
  const targetCount = DEFAULT_TARGETS.length

  function lines(count: number): string[] {
    return Array.from({ length: count }, (_, index) => `prompt number ${index}`)
  }

  it('does not warn at exactly the threshold', async () => {
    const id = await createFixture('at-threshold')
    const body = await save(id, lines(PROMPT_WARNING_THRESHOLD))

    expect(body.count).toBe(PROMPT_WARNING_THRESHOLD)
    expect(body.warning).toBeUndefined()
  })

  it('warns one past the threshold and still saves the whole list', async () => {
    const id = await createFixture('over-threshold')
    const count = PROMPT_WARNING_THRESHOLD + 1
    const body = await save(id, lines(count))

    expect(body.count).toBe(count)
    expect(body.warning).toBeDefined()
    expect(await stored(id)).toHaveLength(count)
  })

  it('names the call count and both figures it was computed from', async () => {
    const id = await createFixture('warning-figures')
    const count = PROMPT_WARNING_THRESHOLD + 1
    const body = await save(id, lines(count))
    const warning = body.warning ?? ''

    const expectedCalls = count * targetCount * DEFAULT_REPETITIONS
    expect(warning).toContain(String(expectedCalls))
    expect(warning).toContain(String(DEFAULT_REPETITIONS))
    expect(warning).toContain(String(targetCount))
  })

  it('says the figure is the default case, because it cannot know a future run', async () => {
    const id = await createFixture('warning-default')
    const body = await save(id, lines(PROMPT_WARNING_THRESHOLD + 1))
    const warning = body.warning ?? ''

    expect(warning).toContain('default')
    expect(warning.toLowerCase()).toContain('not a prediction')
  })

  it('counts stored prompts, not submitted lines - blanks do not push it over', async () => {
    const id = await createFixture('warning-blanks')
    // Threshold-many real prompts plus ten blank lines is not more than the
    // threshold: a prompt is a non-empty line.
    const body = await save(id, [...lines(PROMPT_WARNING_THRESHOLD), ...Array(10).fill('  ')])

    expect(body.count).toBe(PROMPT_WARNING_THRESHOLD)
    expect(body.warning).toBeUndefined()
  })

  it('counts stored prompts, not submitted lines - duplicates do not push it over', async () => {
    const id = await createFixture('warning-dupes')
    const body = await save(id, [...lines(PROMPT_WARNING_THRESHOLD), 'prompt number 0'])

    expect(body.count).toBe(PROMPT_WARNING_THRESHOLD)
    expect(body.warning).toBeUndefined()
    expect(body.duplicatesRemoved).toEqual(['prompt number 0'])
  })

  it('carries the de-duplication notice and the warning at the same time', async () => {
    const id = await createFixture('both')
    const count = PROMPT_WARNING_THRESHOLD + 1
    const body = await save(id, [...lines(count), 'prompt number 0'])

    expect(body.count).toBe(count)
    expect(body.warning).toBeDefined()
    expect(body.notice).toBeDefined()
    expect(body.duplicatesRemoved).toEqual(['prompt number 0'])
  })
})

describe('PUT /api/companies/:companyId/prompts - rejection', () => {
  it('returns 404 for an unknown company and persists nothing', async () => {
    const before = await prisma.prompt.count()
    const response = await putPrompts(
      put({ prompts: ['a'] }),
      ctx('00000000-0000-0000-0000-000000000000'),
    )
    expect(response.status).toBe(404)
    expect(await prisma.prompt.count()).toBe(before)
  })

  it('returns 404 for a malformed company id and persists nothing', async () => {
    const before = await prisma.prompt.count()
    const response = await putPrompts(put({ prompts: ['a'] }), ctx('not-a-uuid'))
    expect(response.status).toBe(404)
    expect(await prisma.prompt.count()).toBe(before)
  })

  it('rejects a payload that fails the schema and leaves the stored list alone', async () => {
    const id = await createFixture('badpayload')
    await save(id, ['keep me'])

    for (const bad of [{ prompts: 'not-an-array' }, { prompts: [1, 2] }, {}, { prompts: null }]) {
      const response = await putPrompts(put(bad), ctx(id))
      expect(response.status).toBe(400)
    }

    expect((await stored(id)).map((p) => p.text)).toEqual(['keep me'])
  })

  it('rejects a body that is not JSON and leaves the stored list alone', async () => {
    const id = await createFixture('badjson')
    await save(id, ['keep me'])

    const response = await putPrompts(
      new Request('http://localhost/api/companies/x/prompts', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: 'not json at all',
      }),
      ctx(id),
    )
    expect(response.status).toBe(400)
    expect((await stored(id)).map((p) => p.text)).toEqual(['keep me'])
  })
})

/**
 * CLAUDE.md rule 10 - runs are immutable once queued. A run holds `RunPrompt`, a
 * copy taken at queue time, and nothing references `Prompt`, so replacing a
 * company's prompt list must leave every stored run exactly as it was.
 *
 * Proved here rather than reasoned about, because "nothing writes to Run" is
 * exactly the kind of claim that stays true until someone adds a convenience.
 */
describe('PUT /api/companies/:companyId/prompts - existing runs', () => {
  it('leaves every existing run untouched', async () => {
    const id = await createFixture('runsnapshot')
    await save(id, ['the prompt the run measured', 'a second prompt'])

    const run = await prisma.run.create({
      data: {
        companyId: id,
        status: 'queued',
        repetitions: 3,
        brandName: `${PREFIX}runsnapshot`,
        brandAliases: ['Snap'],
        brandCompetitors: ['Rival'],
        basisHash: 'fixed-basis-hash',
        prompts: {
          create: [
            { text: 'the prompt the run measured', order: 0 },
            { text: 'a second prompt', order: 1 },
          ],
        },
        targets: { create: [{ provider: 'anthropic', modelId: 'model-x' }] },
      },
      select: { id: true },
    })

    // Replace the company's list with something entirely different, including a
    // different length and a different order.
    await save(id, ['a completely different prompt'])

    const after = await prisma.run.findUnique({
      where: { id: run.id },
      include: { prompts: { orderBy: { order: 'asc' } }, targets: true },
    })

    expect(after?.status).toBe('queued')
    expect(after?.repetitions).toBe(3)
    expect(after?.basisHash).toBe('fixed-basis-hash')
    expect(after?.brandName).toBe(`${PREFIX}runsnapshot`)
    expect(after?.brandAliases).toEqual(['Snap'])
    expect(after?.brandCompetitors).toEqual(['Rival'])
    expect(after?.prompts.map((p) => ({ text: p.text, order: p.order }))).toEqual([
      { text: 'the prompt the run measured', order: 0 },
      { text: 'a second prompt', order: 1 },
    ])
    expect(after?.targets.map((t) => t.modelId)).toEqual(['model-x'])

    // ...and the company's own list really did change, so the assertions above
    // cannot pass by nothing having happened.
    expect((await stored(id)).map((p) => p.text)).toEqual(['a completely different prompt'])
  })

  it('leaves a run untouched when the company list is cleared entirely', async () => {
    const id = await createFixture('runclear')
    await save(id, ['measured'])

    const run = await prisma.run.create({
      data: {
        companyId: id,
        status: 'running',
        repetitions: 1,
        brandName: `${PREFIX}runclear`,
        brandAliases: [],
        brandCompetitors: [],
        basisHash: 'another-fixed-hash',
        prompts: { create: [{ text: 'measured', order: 0 }] },
        targets: { create: [{ provider: 'openai', modelId: 'model-y' }] },
      },
      select: { id: true },
    })

    await save(id, [])

    const after = await prisma.run.findUnique({
      where: { id: run.id },
      include: { prompts: true },
    })
    expect(after?.status).toBe('running')
    expect(after?.prompts.map((p) => p.text)).toEqual(['measured'])
    expect(await stored(id)).toEqual([])
  })
})

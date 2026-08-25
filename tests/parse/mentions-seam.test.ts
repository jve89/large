/**
 * SPEC C8 at its seam.
 *
 * `tests/parse/mentions.test.ts` proves the parser. This file proves that anything
 * calls it, and that what it returns reaches the database - which is a different
 * claim and the one this codebase keeps getting wrong (CLAUDE.md rule 18). Delete
 * the `findMentions` call in `src/core/run/execute.ts` and every test in the
 * parser file still passes; these go red.
 *
 * It is named `parse/mentions-seam` rather than `run/...` so that PLAN's stated
 * verification command for this phase - `npm run test -- parse/mentions` - runs it
 * too. A criterion that names a command which does not run the test is the same
 * defect one level up.
 *
 * Two clauses can only be checked here, because the parser never sees the data
 * they are about:
 *   - "IF a brand occurs only in a citation and not in the visible text, THEN it
 *     SHALL count as not mentioned" - citations are a separate table, so the claim
 *     is about the rows, not about a string;
 *   - an `ok` answer with no recognised brand stores zero Mention rows and stays
 *     `ok`. Zero mentions is a measurement; it must never be reachable only via a
 *     failure.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { executeRun, type RunnableRun } from '../../src/core/run/execute.ts'
import { prisma } from '../../src/lib/db.ts'
import { createStubAdapters, okResult } from '../helpers/stub-adapter.ts'

const PREFIX = `test-c8-seam-${process.pid}-`
const ALIASES = ['Acme', 'Acme Corp']
const COMPETITORS = ['Globex', 'Initech']

let companyId: string

beforeAll(async () => {
  const company = await prisma.company.create({
    data: { name: `${PREFIX}co`, aliases: [...ALIASES], competitors: [...COMPETITORS] },
  })
  companyId = company.id
})

afterAll(async () => {
  await prisma.run.deleteMany({ where: { companyId } })
  await prisma.company.deleteMany({ where: { id: companyId } })
  await prisma.$disconnect()
})

/** One prompt, one target, N=1 - so the run has exactly one answer to inspect. */
async function buildRun(): Promise<RunnableRun> {
  const created = await prisma.run.create({
    data: {
      companyId,
      status: 'running',
      repetitions: 1,
      heartbeatAt: new Date(),
      brandName: `${PREFIX}brand`,
      brandAliases: [...ALIASES],
      brandCompetitors: [...COMPETITORS],
      basisHash: `c8-${Math.random().toString(36).slice(2)}`,
      prompts: { create: [{ text: 'who is best?', order: 0 }] },
      targets: { create: [{ provider: 'anthropic', modelId: 'claude-sonnet-5' }] },
    },
    include: { prompts: true, targets: true },
  })

  return {
    id: created.id,
    repetitions: created.repetitions,
    brandAliases: created.brandAliases,
    brandCompetitors: created.brandCompetitors,
    prompts: created.prompts.map((p) => ({ id: p.id, text: p.text })),
    targets: created.targets.map((t) => ({
      id: t.id,
      provider: t.provider,
      modelId: t.modelId,
    })),
  }
}

/** Executes one run whose single answer is `text`, and returns the stored row. */
async function answerFor(
  text: string,
  citations: readonly { url: string; title: string | null }[] = [],
) {
  const run = await buildRun()
  const adapters = createStubAdapters(() =>
    okResult(text, { citations: citations.map((c) => ({ url: c.url, title: c.title })) }),
  )

  const status = await executeRun(run, {
    prisma,
    adapterFor: adapters.adapterFor,
    concurrencyPerProvider: 2,
    coverageThreshold: 0.8,
  })
  expect(status).toBe('completed')

  return prisma.answer.findFirstOrThrow({
    where: { runId: run.id },
    include: { mentions: { orderBy: { position: 'asc' } }, citations: true },
  })
}

describe('C8 at the seam - what executeRun actually stores', () => {
  it('persists every recognised brand with its position and the total recognised', async () => {
    const answer = await answerFor('Globex is popular, Acme is cheaper, Initech is oldest.')

    expect(answer.status).toBe('ok')
    expect(
      answer.mentions.map((m) => [m.brand, m.position, m.totalRecognised, m.isSubject]),
    ).toEqual([
      ['Globex', 1, 3, false],
      ['Acme', 2, 3, true],
      ['Initech', 3, 3, false],
    ])
  })

  it('stores one row for the subject however many of its aliases occur', async () => {
    const answer = await answerFor('Acme Corp, usually just called Acme, wins.')

    expect(answer.mentions).toHaveLength(1)
    expect(answer.mentions[0]).toMatchObject({
      brand: 'Acme',
      isSubject: true,
      position: 1,
      totalRecognised: 1,
    })
  })

  it('does not count a brand that occurs only in a citation', async () => {
    const answer = await answerFor('Several vendors serve this market.', [
      { url: 'https://globex.example.com/pricing', title: 'Globex pricing' },
      { url: 'https://acme.example.com/', title: 'Acme, the official site' },
    ])

    // The citations are stored - this is not a test that they were dropped.
    expect(answer.citations).toHaveLength(2)
    // ...and neither brand is a mention, because neither is in the visible text.
    expect(answer.mentions).toEqual([])
  })

  it('stores an ok answer with zero mentions, which is a measurement and not a failure', async () => {
    const answer = await answerFor('I would ask a local trade association instead.')

    expect(answer.status).toBe('ok')
    expect(answer.failureReason).toBeNull()
    expect(answer.rawText).toContain('trade association')
    expect(answer.mentions).toEqual([])
  })

  it('matches against the run snapshot, not against the company as it stands now', async () => {
    // Rule 10: a run is immutable. The parser is handed the run's snapshot, so a
    // competitor added after the run was queued is not recognised in it.
    await prisma.company.update({
      where: { id: companyId },
      data: { competitors: [...COMPETITORS, 'Umbrella'] },
    })

    const answer = await answerFor('Umbrella and Acme both appear here.')
    expect(answer.mentions.map((m) => m.brand)).toEqual(['Acme'])

    await prisma.company.update({
      where: { id: companyId },
      data: { competitors: [...COMPETITORS] },
    })
  })
})

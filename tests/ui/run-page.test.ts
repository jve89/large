/**
 * SPEC C10 at the seam it actually lives at: the page a person reads.
 *
 * `tests/aggregate.test.ts` proves the arithmetic. It proves nothing about whether
 * a reader ever sees a coverage, and that is the whole obligation - "coverage and
 * N beside every figure" is trivially satisfied in a function and trivially lost
 * in the markup that renders it. A figure displayed without its coverage is
 * precisely the competitor's product: a confident number with nothing qualifying
 * it. That is `SPEC.md` -> Vision differentiator 2, and this file is where it
 * either exists or does not (CLAUDE.md rule 18).
 *
 * It renders the real server component against real database rows, with no DOM
 * environment and no new dependency: `react-dom/server` is already a dependency,
 * and the only thing standing in the way was `useRouter` inside the progress
 * poller, which vitest's own mocking replaces. PLAN's "component tests for the UI"
 * item is therefore still open for *client* components and is closed for this
 * page - the one where the product's core promise is kept.
 *
 * The central assertion is structural rather than a list of expected strings:
 * every element carrying `data-figure` must contain a coverage and an N. A figure
 * added later is covered by it automatically; a figure rendered *without* going
 * through `FigureValue` is what it is built to notice.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AnswerStatus, RunStatus } from '@prisma/client'
import { prisma } from '../../src/lib/db.ts'
import { sweepByPrefix } from '../helpers/cleanup.ts'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {} }),
  notFound: () => {
    throw new Error('notFound')
  },
}))

const PREFIX = `test-c10-page-${process.pid}-`
const N = 2
let companyId: string

beforeAll(async () => {
  await sweepByPrefix(prisma, PREFIX)
  const company = await prisma.company.create({
    data: { name: `${PREFIX}co`, aliases: ['Acme'], competitors: ['Globex', 'Initech'] },
  })
  companyId = company.id
})

afterAll(async () => {
  await sweepByPrefix(prisma, PREFIX)
  await prisma.$disconnect()
})

/** `[promptIndex, targetIndex, status, namesSubject]` for one stored attempt. */
type Attempt = [number, number, AnswerStatus, boolean]

async function renderRun(attempts: readonly Attempt[], status: RunStatus = 'completed') {
  const run = await prisma.run.create({
    data: {
      companyId,
      status,
      repetitions: N,
      brandName: `${PREFIX}brand`,
      brandAliases: ['Acme'],
      brandCompetitors: ['Globex', 'Initech'],
      basisHash: `c10-${Math.random().toString(36).slice(2)}`,
      finishedAt: new Date(),
      prompts: {
        create: [
          { text: 'who is best in Leeds?', order: 0 },
          { text: 'who does emergency call-outs?', order: 1 },
        ],
      },
      targets: {
        create: [
          { provider: 'anthropic', modelId: 'claude-sonnet-5' },
          { provider: 'openai', modelId: 'gpt-5.6-terra' },
        ],
      },
    },
    include: { prompts: { orderBy: { order: 'asc' } }, targets: { orderBy: { provider: 'asc' } } },
  })

  const seen = new Map<string, number>()
  for (const [promptIndex, targetIndex, answerStatus, namesSubject] of attempts) {
    const runPromptId = run.prompts[promptIndex]!.id
    const runTargetId = run.targets[targetIndex]!.id
    const key = `${runPromptId}|${runTargetId}`
    const repetition = (seen.get(key) ?? 0) + 1
    seen.set(key, repetition)

    await prisma.answer.create({
      data: {
        runId: run.id,
        runPromptId,
        runTargetId,
        repetition,
        status: answerStatus,
        rawText: answerStatus === 'ok' ? 'Acme and Globex both serve Leeds.' : null,
        failureReason: answerStatus === 'failed' ? 'stubbed provider failure' : null,
        inputTokens: answerStatus === 'ok' ? 1000 : null,
        outputTokens: answerStatus === 'ok' ? 250 : null,
        searchCount: answerStatus === 'ok' ? 2 : null,
        costMicros: answerStatus === 'ok' ? 80_000n : null,
        mentions:
          answerStatus === 'ok' && namesSubject
            ? {
                create: [
                  { brand: 'Acme', isSubject: true, position: 1, totalRecognised: 2 },
                  { brand: 'Globex', isSubject: false, position: 2, totalRecognised: 2 },
                ],
              }
            : answerStatus === 'ok'
              ? { create: [{ brand: 'Globex', isSubject: false, position: 1, totalRecognised: 1 }] }
              : undefined,
      },
    })
  }

  const { default: RunPage } = await import('../../src/app/runs/[runId]/page.tsx')
  return renderToStaticMarkup(await RunPage({ params: Promise.resolve({ runId: run.id }) }))
}

/** Every `<li data-figure="...">` block in the rendered markup. */
function figureBlocks(html: string): { name: string; text: string }[] {
  return [...html.matchAll(/<li data-figure="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)].map((match) => ({
    name: match[1]!,
    text: match[2]!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  }))
}

/** Both targets fully answered; the subject named in one prompt's answers only. */
const HEALTHY: Attempt[] = [
  [0, 0, 'ok', true],
  [0, 0, 'ok', true],
  [1, 0, 'ok', false],
  [1, 0, 'ok', false],
  [0, 1, 'ok', true],
  [0, 1, 'ok', true],
  [1, 1, 'ok', true],
  [1, 1, 'ok', true],
]

describe('C10 on the page - coverage and N beside every figure', () => {
  it('renders at least one figure, so the assertion below cannot pass vacuously', async () => {
    const blocks = figureBlocks(await renderRun(HEALTHY))
    // Two targets x three figures. If a figure is added or removed this is the
    // line that says so, rather than the structural check silently covering less.
    expect(blocks).toHaveLength(6)
    expect(new Set(blocks.map((b) => b.name))).toEqual(
      new Set(['mention-rate', 'average-position', 'competitor-frequency']),
    )
  })

  it('puts a coverage and an N on every single one of them', async () => {
    for (const block of figureBlocks(await renderRun(HEALTHY))) {
      expect(block.text, block.name).toMatch(/coverage \d/)
      expect(block.text, block.name).toMatch(/N=2/)
      // The denominator is stated, because a ratio without one is not checkable.
      expect(block.text, block.name).toMatch(/of \d+ planned/)
    }
  })

  it('states coverage as successes over PLANNED attempts, not over stored rows', async () => {
    // Half the plan never ran: four stored answers, all ok, eight planned.
    const html = await renderRun([
      [0, 0, 'ok', true],
      [0, 0, 'ok', true],
      [0, 1, 'ok', true],
      [0, 1, 'ok', true],
    ])
    for (const block of figureBlocks(html)) {
      expect(block.text).toContain('coverage 50% (2 of 4 planned)')
    }
  })
})

describe('C10 on the page - a target below the threshold', () => {
  const DEGRADED: Attempt[] = [
    ...HEALTHY.filter(([, targetIndex]) => targetIndex === 0),
    [0, 1, 'failed', false],
    [0, 1, 'failed', false],
    [1, 1, 'failed', false],
    [1, 1, 'failed', false],
  ]

  it('labels it unreliable rather than presenting its figures as a measurement', async () => {
    const html = await renderRun(DEGRADED)
    expect(html).toContain('Unreliable')
    expect(html).toContain('below the threshold')
  })

  it('leaves the healthy target unaffected and keeps the run visible', async () => {
    const html = await renderRun(DEGRADED)
    const blocks = figureBlocks(html)

    // Still six figures: the degraded target is labelled, never dropped.
    expect(blocks).toHaveLength(6)
    // The healthy one still reports its measurement.
    expect(blocks.some((b) => b.name === 'mention-rate' && b.text.includes('50%'))).toBe(true)
    // The degraded one reports no data, and says so with its own coverage.
    expect(
      blocks.some((b) => b.name === 'mention-rate' && b.text.includes('no data')),
    ).toBe(true)
    expect(html).toContain('claude-sonnet-5')
    expect(html).toContain('gpt-5.6-terra')
  })

  it('never renders a no-data figure as a zero', async () => {
    // Only the value half is checked. "coverage 0%" beside it is a true statement
    // about the coverage and must stay - that is the qualifier doing its job.
    const blocks = figureBlocks(await renderRun(DEGRADED))
    const noData = blocks.filter((b) => b.text.includes('no data'))
    expect(noData.length).toBeGreaterThan(0)
    for (const block of noData) {
      const value = block.text.split('· coverage')[0]!
      expect(value, block.name).not.toMatch(/\d/)
      expect(value, block.name).toContain('no data')
    }
  })
})

describe('C10 on the page - a cell where every attempt failed', () => {
  it('reads "no data" and never "not mentioned" or a zero count', async () => {
    const html = await renderRun([
      [0, 0, 'ok', true],
      [0, 0, 'ok', true],
      [1, 0, 'failed', false],
      [1, 0, 'failed', false],
      ...HEALTHY.filter(([, targetIndex]) => targetIndex === 1),
    ])

    expect(html).toContain('data-cell="no-data"')
    expect(html).toContain('no data — all 2 attempts failed')

    const noDataCells = [...html.matchAll(/<li data-cell="no-data"[^>]*>([\s\S]*?)<\/li>/g)].map(
      (m) => m[1]!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),
    )
    expect(noDataCells.length).toBeGreaterThan(0)
    for (const cell of noDataCells) {
      expect(cell).not.toMatch(/named in 0 of/)
      expect(cell).not.toContain('not mentioned')
    }
  })

  it('still reads a genuine zero as a measurement where attempts succeeded', async () => {
    const html = await renderRun(HEALTHY)
    // Prompt 1 against target 0 succeeded twice and named nobody: that is a
    // measurement of absence and must not be confused with the case above.
    expect(html).toContain('named in 0 of 2 successful attempts')
    expect(html).toContain('data-cell="measured"')
  })
})

describe('C12 on the page - run totals', () => {
  it('displays token usage, search count and cost once the run is terminal', async () => {
    const html = await renderRun(HEALTHY)
    expect(html).toContain('data-totals')
    // The one figure with no single target's coverage to carry, so it carries the
    // run-level equivalent instead: nothing on this page is unqualified.
    expect(html).toContain('8 successful answers of 8 planned')
    expect(html).toContain('N=2')
    expect(html).toContain('8,000 input tokens')
    expect(html).toContain('2,000 output tokens')
    expect(html).toContain('16 web searches')
    expect(html).toContain('$0.64')
  })

  it('shows no totals while the run is still running', async () => {
    const html = await renderRun(HEALTHY.slice(0, 2), 'running')
    expect(html).not.toContain('data-totals')
  })
})

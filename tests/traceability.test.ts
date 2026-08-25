/**
 * SPEC C17 - every figure is traceable to its evidence.
 *
 * This is the differentiator, and it is the only capability that constrains what a
 * **reader** can do rather than how a number is produced. So the tests that matter
 * here are not the ones that check a link exists.
 *
 * A link that exists is not evidence that a link resolves; a link that resolves is
 * not evidence that it resolves to the evidence for **that** figure rather than
 * for a neighbouring one. The seam tests below therefore take the href out of the
 * rendered run page, follow it into the evidence page, and assert that what comes
 * back belongs to the figure the link came from (CLAUDE.md rule 18).
 *
 * The degraded path is weighted more heavily than the healthy one on purpose. The
 * reader most likely to click "show me the evidence" is the one who disagrees with
 * the number, and the number they disagree with reads "no data" or "unreliable".
 * An instrument that says it does not know, and then cannot say why, has kept half
 * a promise.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AnswerStatus } from '@prisma/client'
import { contributesTo, evidenceHref, scopeFor } from '../src/lib/evidence.ts'
import { prisma } from '../src/lib/db.ts'
import { sweepByPrefix } from './helpers/cleanup.ts'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {} }),
  notFound: () => {
    throw new Error('notFound')
  },
}))

const PREFIX = `test-c17-${process.pid}-`
const N = 2
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

/** `[promptIndex, targetIndex, status, namesSubject, citedUrls?]`. */
type Attempt = readonly [number, number, AnswerStatus, boolean, (readonly string[])?]

interface Built {
  readonly runId: string
  readonly targetIds: readonly string[]
  readonly promptIds: readonly string[]
}

async function buildRun(attempts: readonly Attempt[]): Promise<Built> {
  const run = await prisma.run.create({
    data: {
      companyId,
      status: 'completed_with_errors',
      repetitions: N,
      brandName: `${PREFIX}brand`,
      brandAliases: ['Acme'],
      brandCompetitors: ['Globex'],
      basisHash: `c17-${Math.random().toString(36).slice(2)}`,
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
  for (const [promptIndex, targetIndex, status, namesSubject, urls] of attempts) {
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
        status,
        rawText: status === 'ok' ? `target ${targetIndex} said something about Acme.` : null,
        failureReason: status === 'failed' ? `provider ${targetIndex} refused: HTTP 401` : null,
        inputTokens: status === 'ok' ? 100 : null,
        outputTokens: status === 'ok' ? 50 : null,
        searchCount: status === 'ok' ? 1 : null,
        costMicros: status === 'ok' ? 1_000n : null,
        citations: {
          create: (urls ?? []).map((url, order) => ({ url, title: `source ${order}`, order })),
        },
        mentions:
          status === 'ok' && namesSubject
            ? { create: [{ brand: 'Acme', isSubject: true, position: 1, totalRecognised: 1 }] }
            : undefined,
      },
    })
  }

  return {
    runId: run.id,
    targetIds: run.targets.map((t) => t.id),
    promptIds: run.prompts.map((p) => p.id),
  }
}

async function renderRunPage(runId: string): Promise<string> {
  const { default: RunPage } = await import('../src/app/runs/[runId]/page.tsx')
  return renderToStaticMarkup(await RunPage({ params: Promise.resolve({ runId }) }))
}

/** Renders whatever an evidence href points at, by following it rather than guessing. */
async function followEvidenceHref(href: string): Promise<string> {
  const url = new URL(href, 'http://localhost')
  const [, , runId, , runTargetId] = url.pathname.split('/')
  const { default: EvidencePage } = await import(
    '../src/app/runs/[runId]/evidence/[runTargetId]/page.tsx'
  )
  return renderToStaticMarkup(
    await EvidencePage({
      params: Promise.resolve({ runId: runId!, runTargetId: runTargetId! }),
      searchParams: Promise.resolve({
        figure: url.searchParams.get('figure') ?? undefined,
        prompt: url.searchParams.get('prompt') ?? undefined,
      }),
    }),
  )
}

function hrefOf(html: string, attribute: string, value: string): string {
  const pattern = new RegExp(`<a[^>]*${attribute}="${value}"[^>]*href="([^"]+)"`)
  const alt = new RegExp(`<a[^>]*href="([^"]+)"[^>]*${attribute}="${value}"`)
  const match = pattern.exec(html) ?? alt.exec(html)
  if (!match) throw new Error(`no link with ${attribute}="${value}" in the rendered page`)
  return match[1]!.replace(/&amp;/g, '&')
}

function textOf(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Target 0 healthy and citing; target 1 fails every attempt. */
const MIXED: Attempt[] = [
  [0, 0, 'ok', true, ['https://acme.nl/a', 'https://acme.nl/b']],
  [0, 0, 'ok', true, ['https://globex.nl/a']],
  [1, 0, 'ok', false, ['https://acme.nl/c']],
  [1, 0, 'ok', false, []],
  [0, 1, 'failed', false],
  [0, 1, 'failed', false],
  [1, 1, 'failed', false],
  [1, 1, 'failed', false],
]

describe('the figure-to-evidence mapping', () => {
  it('names a scope for every figure the page renders', () => {
    for (const figure of [
      'mention-rate',
      'average-position',
      'competitor-frequency',
      'cited-domains',
      'coverage',
    ]) {
      expect(scopeFor(figure), figure).not.toBeNull()
    }
    expect(scopeFor('not-a-figure')).toBeNull()
    expect(scopeFor(undefined)).toBeNull()
  })

  it('excludes a failed answer from every figure', () => {
    const failed = { status: 'failed' as const, mentions: [] }
    for (const figure of ['mention-rate', 'cited-domains', 'average-position']) {
      expect(contributesTo(scopeFor(figure)!, failed), figure).toBe(false)
    }
  })

  it('counts an unnamed-brand answer for mention rate but not for average position', () => {
    // The two figures reach different shapes of evidence, which is the reason the
    // mapping is stated rather than implied: an answer that did not name the brand
    // is the denominator of one figure and absent from the other.
    const unnamed = { status: 'ok' as const, mentions: [{ isSubject: false }] }
    expect(contributesTo(scopeFor('mention-rate')!, unnamed)).toBe(true)
    expect(contributesTo(scopeFor('average-position')!, unnamed)).toBe(false)
  })

  it('tells a reader that cited domains are counted per answer, not per URL', () => {
    // Stated before they count the URLs themselves and get a bigger number.
    expect(scopeFor('cited-domains')!.explanation).toContain('answers, never citation rows')
  })

  it('carries no markdown, because these strings are rendered as plain text', () => {
    // Caught in the browser pass: the cited-domains explanation reached the screen
    // reading "successful **answers**". A string that is displayed verbatim cannot
    // carry emphasis it has no renderer for.
    for (const figure of ['mention-rate','average-position','competitor-frequency','cited-domains','coverage']) {
      expect(scopeFor(figure)!.explanation, figure).not.toContain('**')
    }
  })

  it('tells a reader that coverage has evidence which does not exist', () => {
    expect(scopeFor('coverage')!.explanation).toContain('never made')
  })
})

describe('following the link from a figure', () => {
  it('reaches the evidence for THAT figure, not for a neighbouring target', async () => {
    // The assertion rule 18 is actually about, and the first version of this test
    // was too weak to make it: it checked that the *healthy* target's link reached
    // the healthy target, which stays true when every link on the page is wired to
    // the first target. Pointing them all at target 0 left it green.
    //
    // What has to hold is per block: every evidence link rendered inside one
    // target's section reaches that target and no other.
    const built = await buildRun(MIXED)
    const html = await renderRunPage(built.runId)

    const blocks = [
      ...html.matchAll(/data-target-block="([^"]+)"([\s\S]*?)(?=data-target-block=|<\/ul>)/g),
    ]
    expect(blocks).toHaveLength(built.targetIds.length)

    for (const [, targetId, block] of blocks) {
      const hrefs = [...block!.matchAll(/data-evidence-link="[a-z-]+"[^>]*href="([^"]+)"/g)].map(
        (m) => m[1]!.replace(/&amp;/g, '&'),
      )
      expect(hrefs.length, `figures under ${targetId}`).toBeGreaterThanOrEqual(4)
      for (const href of hrefs) {
        expect(href, `a link under ${targetId} points elsewhere`).toContain(targetId!)
      }
    }

    // ...and following one actually lands on that target's answers.
    const [firstTargetId, firstBlock] = [blocks[0]![1]!, blocks[0]![2]!]
    const href = /data-evidence-link="[a-z-]+"[^>]*href="([^"]+)"/
      .exec(firstBlock)![1]!
      .replace(/&amp;/g, '&')
    const evidence = await followEvidenceHref(href)
    expect(evidence).toContain(`data-run-target-id="${firstTargetId}"`)
    expect(evidence).not.toContain(`data-run-target-id="${built.targetIds[1]}"`)
  })

  it('says which answers the figure was computed from, and marks the ones it used', async () => {
    const built = await buildRun(MIXED)
    const html = await renderRunPage(built.runId)
    const evidence = await followEvidenceHref(hrefOf(html, 'data-evidence-link', 'average-position'))

    expect(evidence).toContain('data-scope="average-position"')
    // Two answers named the brand; two did not and are shown but not counted.
    expect([...evidence.matchAll(/data-used="true"/g)]).toHaveLength(2)
    expect([...evidence.matchAll(/data-used="false"/g)]).toHaveLength(2)
    expect(textOf(evidence)).toContain('not counted in this figure')
  })

  it('carries raw text, citations in stored order, and every recognised name', async () => {
    const built = await buildRun(MIXED)
    const html = await renderRunPage(built.runId)
    const evidence = await followEvidenceHref(hrefOf(html, 'data-evidence-link', 'cited-domains'))
    const text = textOf(evidence)

    expect(text).toContain('target 0 said something about Acme.')
    expect(text).toContain('1/1 Acme (subject)')
    // In stored order: source 0 before source 1.
    expect(evidence.indexOf('source 0')).toBeLessThan(evidence.indexOf('source 1'))
  })

  it('shows an answer with no recognised brand without confusing it with a failure', async () => {
    const built = await buildRun(MIXED)
    const html = await renderRunPage(built.runId)
    const evidence = await followEvidenceHref(hrefOf(html, 'data-evidence-link', 'mention-rate'))

    // Two of the healthy target's four answers named nobody. They are `ok`.
    expect([...evidence.matchAll(/data-answer="ok"/g)]).toHaveLength(4)
    expect(evidence).not.toContain('data-answer="failed"')
    expect(textOf(evidence)).toContain('No recognised brand found in the visible text.')
  })

  it('reaches attempts that were never made, which coverage counts and no row holds', async () => {
    const built = await buildRun([MIXED[0]!, MIXED[1]!]) // one prompt only, of two
    const html = await renderRunPage(built.runId)
    const evidence = await followEvidenceHref(hrefOf(html, 'data-evidence-link', 'coverage'))

    expect(evidence).toContain('data-never-attempted')
    expect(textOf(evidence)).toContain('never made')
  })
})

describe('the degraded path, which is the one a reader disputes', () => {
  it('takes a no-data cell to the failed attempts and their reasons', async () => {
    const built = await buildRun(MIXED)
    const html = await renderRunPage(built.runId)

    // The cell link on a no-data cell, followed.
    const href = hrefOf(html, 'data-cell-evidence-link', 'no-data')
    const evidence = await followEvidenceHref(href)
    const text = textOf(evidence)

    expect(evidence).toContain('data-failure-reason')
    expect(text).toContain('provider 1 refused: HTTP 401')
    // Scoped to the one prompt the cell was for, not the whole target.
    expect([...evidence.matchAll(/data-answer="failed"/g)]).toHaveLength(N)
    expect(text).toContain('One prompt')
  })

  it('keeps an unreliable target’s answers reachable rather than withdrawing them', async () => {
    // A target below the threshold has its figures labelled, not hidden - and the
    // evidence beneath them stays reachable, or "unreliable" is unfalsifiable.
    const built = await buildRun(MIXED)
    const html = await renderRunPage(built.runId)
    expect(html).toContain('Unreliable')

    const degradedLink = [...html.matchAll(/data-evidence-link="coverage"[^>]*href="([^"]+)"/g)]
      .map((m) => m[1]!.replace(/&amp;/g, '&'))
      .find((href) => href.includes(built.targetIds[1]!))
    expect(degradedLink).toBeDefined()

    const evidence = await followEvidenceHref(degradedLink!)
    expect(evidence).toContain(`data-run-target-id="${built.targetIds[1]}"`)
    expect([...evidence.matchAll(/data-answer="failed"/g)]).toHaveLength(4)
    expect(textOf(evidence)).toContain('provider 1 refused')
  })

  it('refuses a target id belonging to another run rather than showing the wrong evidence', async () => {
    const mine = await buildRun(MIXED)
    const other = await buildRun(MIXED)

    await expect(
      followEvidenceHref(evidenceHref(mine.runId, other.targetIds[0]!, 'mention-rate')),
    ).rejects.toThrow('notFound')
  })
})

describe('no figure is displayed whose evidence is unreachable', () => {
  it('gives every rendered figure on the page an evidence link', async () => {
    const built = await buildRun(MIXED)
    const html = await renderRunPage(built.runId)

    const figures = [...html.matchAll(/<li data-figure="([^"]+)"/g)].map((m) => m[1]!)
    const linked = new Set(
      [...html.matchAll(/data-evidence-link="([a-z-]+)"/g)].map((m) => m[1]!),
    )
    expect(figures.length).toBeGreaterThan(0)
    for (const figure of figures) expect(linked, figure).toContain(figure)
  })
})

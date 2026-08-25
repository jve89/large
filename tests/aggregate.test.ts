/**
 * SPEC C9, C10, C12 - the arithmetic.
 *
 * Pure fixtures, no database: every rule here is a statement about numbers, and a
 * literal is the shape that can be written down exactly. The other half of C10 -
 * that a reader actually sees coverage and N beside a figure - is not checkable
 * here and is driven at the page in `tests/ui/run-page.test.ts` (CLAUDE.md
 * rule 18).
 *
 * The coverage fixtures are 100, 85, 79 and 0 percent, straddling the 0.8
 * threshold on both sides by one point, plus one run whose two targets differ.
 */
import { describe, expect, it } from 'vitest'
import { aggregateRun, type AggregatableAnswer, type AggregateInput } from '../src/lib/aggregate.ts'

const THRESHOLD = 0.8
const PROMPTS = Array.from({ length: 20 }, (_, i) => `prompt-${i}`)
const N = 5 // 20 prompts x 5 = 100 planned per target, so a percentage is a count

const TARGETS = [
  { id: 'target-a', provider: 'anthropic' as const, modelId: 'claude-sonnet-5' },
  { id: 'target-b', provider: 'openai' as const, modelId: 'gpt-5.6-terra' },
]

interface AnswerSpec {
  readonly targetId: string
  readonly ok: number
  readonly failed?: number
  /** Citation URLs put on every answer, ok or failed. */
  readonly citing?: readonly string[]
  /** Of the ok answers, how many name the subject. */
  readonly subjectIn?: number
  /** Position given to the subject wherever it is named. */
  readonly subjectPosition?: number
  /** Competitor names to put in every ok answer. */
  readonly competitorsIn?: readonly string[]
}

/** Builds answers spread across prompts in run order, N per prompt. */
function answersFor(spec: AnswerSpec): AggregatableAnswer[] {
  const rows: AggregatableAnswer[] = []
  const total = spec.ok + (spec.failed ?? 0)
  for (let i = 0; i < total; i += 1) {
    const isOk = i < spec.ok
    const namesSubject = isOk && i < (spec.subjectIn ?? spec.ok)
    rows.push({
      runTargetId: spec.targetId,
      runPromptId: PROMPTS[Math.floor(i / N) % PROMPTS.length]!,
      status: isOk ? 'ok' : 'failed',
      inputTokens: isOk ? 1000 : null,
      outputTokens: isOk ? 200 : null,
      searchCount: isOk ? 2 : null,
      costMicros: isOk ? 80_000n : null,
      citations: (spec.citing ?? []).map((url) => ({ url })),
      mentions: !isOk
        ? []
        : [
            ...(namesSubject
              ? [{ brand: 'Acme', isSubject: true, position: spec.subjectPosition ?? 1 }]
              : []),
            ...(spec.competitorsIn ?? []).map((brand, index) => ({
              brand,
              isSubject: false,
              position: index + 2,
            })),
          ],
    })
  }
  return rows
}

function input(overrides: Partial<AggregateInput> = {}): AggregateInput {
  return {
    repetitions: N,
    coverageThreshold: THRESHOLD,
    targets: TARGETS,
    promptIds: PROMPTS,
    competitors: ['Globex', 'Initech'],
    answers: [],
    ...overrides,
  }
}

function targetA(answers: AggregatableAnswer[]) {
  return aggregateRun(input({ answers })).targets[0]!
}

describe('coverage', () => {
  it('is successes over PLANNED attempts, not over stored rows', () => {
    // The sharp case, and the one an interrupted run creates: ten answers stored,
    // none of them failed, ninety never attempted. ok/(ok+failed) would say 100%.
    const target = targetA(answersFor({ targetId: 'target-a', ok: 10 }))

    expect(target.coverage.successes).toBe(10)
    expect(target.coverage.planned).toBe(100)
    expect(target.coverage.ratio).toBeCloseTo(0.1)
    expect(target.coverage.reliable).toBe(false)
  })

  it('counts a failed answer in the denominator and not the numerator', () => {
    const target = targetA(answersFor({ targetId: 'target-a', ok: 85, failed: 15 }))
    expect(target.coverage.successes).toBe(85)
    expect(target.coverage.planned).toBe(100)
    expect(target.coverage.ratio).toBeCloseTo(0.85)
  })

  it.each([
    [100, true],
    [85, true],
    [79, false],
    [0, false],
  ])('at %i percent coverage, reliable is %s', (ok, reliable) => {
    const target = targetA(answersFor({ targetId: 'target-a', ok, failed: 100 - ok }))
    expect(target.coverage.ratio).toBeCloseTo(ok / 100)
    expect(target.coverage.reliable).toBe(reliable)
  })
})

describe('mention rate', () => {
  it('is over successful answers, so a failed attempt is not a brand-absent answer', () => {
    // 50 ok, 25 of them naming the subject, and 50 failed. The rate is 0.5 - not
    // 0.25, which is what counting failures as absences would give.
    const target = targetA(
      answersFor({ targetId: 'target-a', ok: 50, failed: 50, subjectIn: 25 }),
    )

    expect(target.mentionRate.result).toEqual({ kind: 'measured', value: 0.5 })
    expect(target.coverage.ratio).toBeCloseTo(0.5)
  })

  it('is a measured zero when the brand was never named', () => {
    const target = targetA(answersFor({ targetId: 'target-a', ok: 100, subjectIn: 0 }))
    expect(target.mentionRate.result).toEqual({ kind: 'measured', value: 0 })
  })

  it('is no-data, never zero, when nothing succeeded', () => {
    const target = targetA(answersFor({ targetId: 'target-a', ok: 0, failed: 100 }))
    expect(target.mentionRate.result).toEqual({ kind: 'no-data' })
  })

  it('carries its own coverage and the run N with it', () => {
    const target = targetA(answersFor({ targetId: 'target-a', ok: 85, failed: 15 }))
    expect(target.mentionRate.repetitions).toBe(N)
    expect(target.mentionRate.coverage.ratio).toBeCloseTo(0.85)
  })
})

describe('average position', () => {
  it('averages only the answers that named the brand', () => {
    const answers = [
      ...answersFor({ targetId: 'target-a', ok: 10, subjectIn: 10, subjectPosition: 3 }),
      ...answersFor({ targetId: 'target-a', ok: 10, subjectIn: 0 }),
    ]
    expect(targetA(answers).averagePosition.result).toEqual({ kind: 'measured', value: 3 })
  })

  it('distinguishes "never named" from "nothing came back"', () => {
    // Both render as a dash and they are completely different findings: one is a
    // measurement whose answer is "nowhere", the other is the absence of one.
    const neverNamed = targetA(answersFor({ targetId: 'target-a', ok: 100, subjectIn: 0 }))
    expect(neverNamed.averagePosition.result.kind).toBe('not-applicable')

    const nothingBack = targetA(answersFor({ targetId: 'target-a', ok: 0, failed: 100 }))
    expect(nothingBack.averagePosition.result.kind).toBe('no-data')
  })
})

describe('competitor frequency', () => {
  it('counts answers, and lists a competitor that never appeared', () => {
    const target = targetA(
      answersFor({ targetId: 'target-a', ok: 40, subjectIn: 40, competitorsIn: ['Globex'] }),
    )
    expect(target.competitors.result).toEqual({
      kind: 'measured',
      value: [
        { brand: 'Globex', answers: 40 },
        // Present with zero rather than missing: "measured and never appeared" is
        // an observation, and dropping the row would read as "not measured".
        { brand: 'Initech', answers: 0 },
      ],
    })
  })

  it('breaks ties by brand ascending, so two reads agree', () => {
    const target = targetA(
      answersFor({
        targetId: 'target-a',
        ok: 10,
        competitorsIn: ['Initech', 'Globex'],
      }),
    )
    const value = target.competitors.result.kind === 'measured' ? target.competitors.result.value : []
    expect(value.map((c) => c.brand)).toEqual(['Globex', 'Initech'])
  })

  it('is no-data when nothing succeeded, not an empty list', () => {
    const target = targetA(answersFor({ targetId: 'target-a', ok: 0, failed: 20 }))
    expect(target.competitors.result).toEqual({ kind: 'no-data' })
  })

  it('is an empty-of-counts measurement when competitors were measured and absent', () => {
    const target = targetA(answersFor({ targetId: 'target-a', ok: 10, competitorsIn: [] }))
    expect(target.competitors.result.kind).toBe('measured')
  })
})

describe('a prompt cell', () => {
  it('reads no-data when every attempt for that prompt and target failed', () => {
    const answers: AggregatableAnswer[] = [
      ...answersFor({ targetId: 'target-a', ok: 0, failed: N }), // all of prompt-0
      ...answersFor({ targetId: 'target-a', ok: N }).map((a) => ({
        ...a,
        runPromptId: PROMPTS[1]!,
      })),
    ]
    const cells = targetA(answers).cells

    expect(cells[0]).toMatchObject({ runPromptId: PROMPTS[0], succeeded: 0, state: 'no-data' })
    // ...and it must not be reachable as a zero mention count.
    expect(cells[0]!.mentioned).toBe(0)
    expect(cells[1]).toMatchObject({ runPromptId: PROMPTS[1], succeeded: N, state: 'measured' })
  })

  it('reads measured with zero mentions when the brand was simply absent', () => {
    const answers = answersFor({ targetId: 'target-a', ok: N, subjectIn: 0 })
    const cell = targetA(answers).cells[0]!
    expect(cell).toMatchObject({ state: 'measured', succeeded: N, mentioned: 0 })
  })

  it('covers every planned prompt even where nothing at all was stored', () => {
    const cells = targetA(answersFor({ targetId: 'target-a', ok: N })).cells
    expect(cells).toHaveLength(PROMPTS.length)
    expect(cells.slice(1).every((cell) => cell.state === 'no-data')).toBe(true)
  })
})

describe('two targets in one run', () => {
  it('leaves a healthy target unaffected by a degraded one, and keeps both visible', () => {
    const result = aggregateRun(
      input({
        answers: [
          ...answersFor({ targetId: 'target-a', ok: 100, subjectIn: 60 }),
          ...answersFor({ targetId: 'target-b', ok: 0, failed: 100 }),
        ],
      }),
    )

    const [a, b] = result.targets
    expect(a!.coverage.reliable).toBe(true)
    expect(a!.mentionRate.result).toEqual({ kind: 'measured', value: 0.6 })

    expect(b!.coverage.reliable).toBe(false)
    expect(b!.mentionRate.result).toEqual({ kind: 'no-data' })

    // Both are present: the run stays visible and the degraded target is labelled
    // rather than dropped, per C10.
    expect(result.targets).toHaveLength(2)
  })

  it('gives each target its own coverage, not the run’s', () => {
    const result = aggregateRun(
      input({
        answers: [
          ...answersFor({ targetId: 'target-a', ok: 100 }),
          ...answersFor({ targetId: 'target-b', ok: 79, failed: 21 }),
        ],
      }),
    )
    expect(result.targets[0]!.coverage.ratio).toBeCloseTo(1)
    expect(result.targets[1]!.coverage.ratio).toBeCloseTo(0.79)
    expect(result.targets[1]!.coverage.reliable).toBe(false)
  })
})

describe('run totals (C12)', () => {
  it('sums tokens, searches and cost over successful answers only', () => {
    const result = aggregateRun(
      input({
        answers: [
          ...answersFor({ targetId: 'target-a', ok: 3, failed: 2 }),
          ...answersFor({ targetId: 'target-b', ok: 2 }),
        ],
      }),
    )

    expect(result.totals).toEqual({
      answers: 5,
      inputTokens: 5000,
      outputTokens: 1000,
      searchCount: 10,
      costMicros: 400_000n,
      plannedAttempts: 200,
    })
  })

  it('keeps cost exact above Number.MAX_SAFE_INTEGER', () => {
    const huge = 9_007_199_254_740_993n
    const answers = answersFor({ targetId: 'target-a', ok: 2 }).map((a) => ({
      ...a,
      costMicros: huge,
    }))
    expect(aggregateRun(input({ answers })).totals.costMicros).toBe(huge * 2n)
  })

  it('states the planned attempt count, so a partial run’s cost is not read as a complete one’s', () => {
    // A run total has no single target whose coverage to print, which would have
    // left the one money figure on the page as the only unqualified one. Half a
    // run genuinely costs half as much, and two totals compared without this are
    // not comparable.
    const half = aggregateRun(input({ answers: answersFor({ targetId: 'target-a', ok: 100 }) }))
    expect(half.totals.answers).toBe(100)
    expect(half.totals.plannedAttempts).toBe(200)
  })
})

describe('nothing is persisted', () => {
  it('is a pure function of its input', () => {
    const answers = answersFor({ targetId: 'target-a', ok: 40, subjectIn: 20 })
    expect(aggregateRun(input({ answers }))).toEqual(aggregateRun(input({ answers })))
  })
})

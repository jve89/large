/**
 * SPEC C16 - cited domain frequency, per target.
 *
 * The Objective promises "which sources those models cite when they answer".
 * Phase 5 stored them and the run page listed them per answer, which at 20 prompts
 * x 2 targets x N=3 hands a reader 120 separate URL lists. This is the figure that
 * turns those rows into an answer to the question.
 *
 * Pure fixtures, no database: every rule here is a statement about counting and
 * ordering. That a reader actually sees the table, with its coverage and the run's
 * N beside it, is a presentation obligation and is driven at the page in
 * `tests/ui/run-page.test.ts` (CLAUDE.md rules 18 and 21).
 *
 * The two rules most easily got wrong, and the reason each is here:
 *   - the unit of observation is the **answer**, never the citation row, so a
 *     model that footnotes one source six times has drawn on it once;
 *   - an empty list and "no data" are different findings. A target with successful
 *     answers that cited nothing genuinely cited nothing; a target with no
 *     successful answers has told us nothing at all.
 */
import { describe, expect, it } from 'vitest'
import {
  aggregateRun,
  citedDomainOf,
  isOwnDomain,
  ownHostOf,
  type AggregatableAnswer,
  type AggregateInput,
  type DomainCount,
} from '../src/lib/aggregate.ts'

const TARGETS = [
  { id: 'target-a', provider: 'anthropic' as const, modelId: 'claude-sonnet-5' },
  { id: 'target-b', provider: 'openai' as const, modelId: 'gpt-5.6-terra' },
]
const PROMPTS = ['prompt-0', 'prompt-1']
const N = 2

function answer(
  targetId: string,
  status: 'ok' | 'failed',
  urls: readonly string[],
  runPromptId = PROMPTS[0]!,
): AggregatableAnswer {
  return {
    runTargetId: targetId,
    runPromptId,
    status,
    inputTokens: status === 'ok' ? 100 : null,
    outputTokens: status === 'ok' ? 50 : null,
    searchCount: status === 'ok' ? 1 : null,
    costMicros: status === 'ok' ? 1_000n : null,
    mentions: [],
    citations: urls.map((url) => ({ url })),
  }
}

function input(answers: AggregatableAnswer[], ownWebsite: string | null = null): AggregateInput {
  return {
    repetitions: N,
    coverageThreshold: 0.8,
    targets: TARGETS,
    promptIds: PROMPTS,
    competitors: [],
    ownWebsite,
    answers,
  }
}

/** The cited-domain list of the first target, or null when it reads "no data". */
function domainsOfA(answers: AggregatableAnswer[]): readonly DomainCount[] | null {
  const result = aggregateRun(input(answers)).targets[0]!.citedDomains.result
  return result.kind === 'measured' ? result.value : null
}

describe('citedDomainOf', () => {
  it('lower-cases the host and drops a leading www.', () => {
    expect(citedDomainOf('https://WWW.Acme.NL/prices')).toBe('acme.nl')
    expect(citedDomainOf('https://acme.nl/prices')).toBe('acme.nl')
  })

  it('keeps a subdomain as its own source', () => {
    // The stated rule, and the same choice visible-text.ts makes: `www.` is a
    // convention for addressing one site; a subdomain is a different host.
    expect(citedDomainOf('https://blog.acme.nl/x')).toBe('blog.acme.nl')
  })

  it('needs no public suffix list, because it never groups by registrable domain', () => {
    // The multi-label suffixes that defeat a naive last-two-labels rule never
    // arise: these are simply three different hosts.
    expect(citedDomainOf('https://www.acme.co.uk/a')).toBe('acme.co.uk')
    expect(citedDomainOf('https://blog.acme.co.uk/a')).toBe('blog.acme.co.uk')
    expect(citedDomainOf('https://acme.com.au/a')).toBe('acme.com.au')
  })

  it('ignores a port, a path, a query and a fragment', () => {
    expect(citedDomainOf('https://acme.nl:8443/a/b?c=1#d')).toBe('acme.nl')
  })

  it('drops a trailing dot on the host', () => {
    expect(citedDomainOf('https://acme.nl./x')).toBe('acme.nl')
  })

  it('returns null for anything C7 would not have stored', () => {
    for (const url of ['', 'not a url', 'ftp://acme.nl/x', 'mailto:info@acme.nl']) {
      expect(citedDomainOf(url), url).toBeNull()
    }
  })
})

describe('C16 - counting', () => {
  it('counts the same host with and without www as one domain', () => {
    expect(
      domainsOfA([
        answer('target-a', 'ok', ['https://www.acme.nl/a']),
        answer('target-a', 'ok', ['https://acme.nl/b']),
      ]),
    ).toEqual([{ domain: 'acme.nl', answers: 2, isOwn: false }])
  })

  it('counts two pages of one site inside ONE answer only once', () => {
    // The rule that stops a heavily footnoting model inflating its favourite
    // source. Six citations, one answer, one count.
    expect(
      domainsOfA([
        answer('target-a', 'ok', [
          'https://acme.nl/a',
          'https://acme.nl/b',
          'https://www.acme.nl/c',
          'https://acme.nl/a?utm=1',
          'https://acme.nl/d',
          'https://acme.nl/e',
        ]),
      ]),
    ).toEqual([{ domain: 'acme.nl', answers: 1, isOwn: false }])
  })

  it('counts the same domain across two answers twice', () => {
    expect(
      domainsOfA([
        answer('target-a', 'ok', ['https://acme.nl/a']),
        answer('target-a', 'ok', ['https://acme.nl/a']),
      ]),
    ).toEqual([{ domain: 'acme.nl', answers: 2, isOwn: false }])
  })

  it('counts a subdomain separately from its parent', () => {
    expect(
      domainsOfA([answer('target-a', 'ok', ['https://acme.nl/a', 'https://blog.acme.nl/b'])]),
    ).toEqual([
      { domain: 'acme.nl', answers: 1, isOwn: false },
      { domain: 'blog.acme.nl', answers: 1, isOwn: false },
    ])
  })

  it('ignores the citations of a failed answer, even when they would change the order', () => {
    // Constructed so that counting them flips the top row: globex.nl would reach 3
    // and lead. A failed call is never "cited nothing" and never cited anything
    // either (CLAUDE.md rule 1).
    const answers = [
      answer('target-a', 'ok', ['https://acme.nl/a']),
      answer('target-a', 'ok', ['https://acme.nl/b']),
      answer('target-a', 'failed', ['https://globex.nl/a']),
      answer('target-a', 'failed', ['https://globex.nl/b']),
      answer('target-a', 'failed', ['https://globex.nl/c']),
    ]
    expect(domainsOfA(answers)).toEqual([{ domain: 'acme.nl', answers: 2, isOwn: false }])
  })
})

describe('C16 - ordering', () => {
  it('orders by descending count', () => {
    const answers = [
      answer('target-a', 'ok', ['https://rare.nl/a']),
      answer('target-a', 'ok', ['https://common.nl/a']),
      answer('target-a', 'ok', ['https://common.nl/b']),
    ]
    expect(domainsOfA(answers)?.map((d) => d.domain)).toEqual(['common.nl', 'rare.nl'])
  })

  it('breaks a tie by domain ascending, so two reads agree', () => {
    const answers = [answer('target-a', 'ok', ['https://zeta.nl/a', 'https://alpha.nl/a'])]
    expect(domainsOfA(answers)?.map((d) => d.domain)).toEqual(['alpha.nl', 'zeta.nl'])
  })

  it('orders by code unit rather than locale, so the order does not depend on the host', () => {
    // localeCompare depends on the runtime's ICU data and default locale and can
    // order these differently on a laptop and in the container. A product whose
    // argument is reproducibility cannot have a table that reorders between reads.
    const answers = [
      answer('target-a', 'ok', ['https://Zebra.nl/a', 'https://apple.nl/a', 'https://Ápple.nl/a']),
    ]
    const ordered = domainsOfA(answers)?.map((d) => d.domain)
    expect(ordered).toEqual([...ordered!].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
  })

  it('is stable across repeated reads of identical input', () => {
    const answers = [
      answer('target-a', 'ok', ['https://a.nl/x', 'https://b.nl/x', 'https://c.nl/x']),
    ]
    expect(domainsOfA(answers)).toEqual(domainsOfA(answers))
  })
})

describe('C16 - absence', () => {
  it('reads "no data" when the target has no successful answers', () => {
    const result = aggregateRun(
      input([answer('target-a', 'failed', ['https://acme.nl/a'])]),
    ).targets[0]!.citedDomains.result
    expect(result).toEqual({ kind: 'no-data' })
  })

  it('reads as an EMPTY LIST when successful answers carry no citations at all', () => {
    // Not "no data": the model genuinely cited nothing, which is an observation
    // rather than the absence of one. This is the distinction C16 spells out.
    const result = aggregateRun(input([answer('target-a', 'ok', [])])).targets[0]!.citedDomains
      .result
    expect(result).toEqual({ kind: 'measured', value: [] })
  })

  it('skips a citation whose URL is unusable rather than counting it as a domain', () => {
    expect(domainsOfA([answer('target-a', 'ok', ['not a url', 'https://acme.nl/a'])])).toEqual([
      { domain: 'acme.nl', answers: 1, isOwn: false },
    ])
  })
})

describe('C16 - two targets in one run', () => {
  it('gives each target its own list, and one target’s failure does not touch the other', () => {
    const result = aggregateRun(
      input([
        answer('target-a', 'ok', ['https://acme.nl/a']),
        answer('target-a', 'ok', ['https://acme.nl/b'], PROMPTS[1]!),
        answer('target-b', 'ok', ['https://globex.nl/a']),
        answer('target-b', 'failed', [], PROMPTS[1]!),
      ]),
    )

    const [a, b] = result.targets
    expect(a!.citedDomains.result).toEqual({
      kind: 'measured',
      value: [{ domain: 'acme.nl', answers: 2, isOwn: false }],
    })
    expect(b!.citedDomains.result).toEqual({
      kind: 'measured',
      value: [{ domain: 'globex.nl', answers: 1, isOwn: false }],
    })
  })

  it('carries each target’s own coverage and the run N with its list, per C10', () => {
    const result = aggregateRun(
      input([
        answer('target-a', 'ok', ['https://acme.nl/a']),
        answer('target-b', 'failed', []),
      ]),
    )

    expect(result.targets[0]!.citedDomains.repetitions).toBe(N)
    expect(result.targets[0]!.citedDomains.coverage.planned).toBe(PROMPTS.length * N)
    expect(result.targets[0]!.citedDomains.coverage.reliable).toBe(false)
    expect(result.targets[1]!.citedDomains.coverage.successes).toBe(0)
  })
})

describe('C16 - nothing is persisted', () => {
  it('is a pure function of its input, computed on every read', () => {
    const answers = [answer('target-a', 'ok', ['https://acme.nl/a', 'https://globex.nl/b'])]
    expect(aggregateRun(input(answers))).toEqual(aggregateRun(input(answers)))
  })
})

describe('Phase 13 - marking the client’s own cited domains', () => {
  it('reads a host out of whatever form the operator typed', () => {
    for (const written of [
      'acme.nl',
      'ACME.NL',
      'www.acme.nl',
      'https://acme.nl',
      'https://www.acme.nl/prices?x=1',
      '  acme.nl  ',
    ]) {
      expect(ownHostOf(written), written).toBe('acme.nl')
    }
  })

  it('records nothing for an absent or unusable website', () => {
    for (const written of [null, undefined, '', '   ', 'not a website']) {
      expect(ownHostOf(written as string | null), String(written)).toBeNull()
    }
  })

  it('marks the host itself and any subdomain of it', () => {
    // The operator supplies the answer, so no public suffix list is needed: the
    // question is "does this cited host equal, or end with a dot plus, the host
    // the client gave us" - which works identically for .nl and .co.uk.
    expect(isOwnDomain('acme.nl', 'acme.nl')).toBe(true)
    expect(isOwnDomain('shop.acme.nl', 'acme.nl')).toBe(true)
    expect(isOwnDomain('a.b.acme.co.uk', 'acme.co.uk')).toBe(true)
  })

  it('does not mark a host that merely ends with the same letters', () => {
    expect(isOwnDomain('notacme.nl', 'acme.nl')).toBe(false)
    expect(isOwnDomain('acme.nl.example.com', 'acme.nl')).toBe(false)
  })

  it('does not mark the parent of the host it was given - the stated limitation', () => {
    // A client who records blog.acme.nl will not have acme.nl marked. The
    // comparison is one-way by design: a subdomain of what they gave us is
    // theirs, a parent of it is a host we were not told about. Recorded rather
    // than discovered; the remedy is to enter the apex.
    expect(isOwnDomain('acme.nl', 'blog.acme.nl')).toBe(false)
  })

  it('marks nothing at all when no website is recorded', () => {
    const answers = [answer('target-a', 'ok', ['https://acme.nl/a', 'https://globex.nl/b'])]
    const marked = domainsOfA(answers)
    expect(marked!.every((d) => d.isOwn === false)).toBe(true)
    // ...and the list is otherwise byte-for-byte what C16 alone produces.
    expect(marked!.map((d) => [d.domain, d.answers])).toEqual([
      ['acme.nl', 1],
      ['globex.nl', 1],
    ])
  })

  it('marks the client’s hosts and nobody else’s', () => {
    const answers = [
      answer('target-a', 'ok', [
        'https://www.acme.nl/a',
        'https://shop.acme.nl/b',
        'https://mediamarkt.nl/c',
        'https://shop.mediamarkt.nl/d',
      ]),
    ]
    const result = aggregateRun(input(answers, 'acme.nl')).targets[0]!.citedDomains.result
    const value = result.kind === 'measured' ? result.value : []

    expect(value.filter((d) => d.isOwn).map((d) => d.domain).sort()).toEqual([
      'acme.nl',
      'shop.acme.nl',
    ])
    // Scope: nothing here changes how C16 counts anybody else. mediamarkt.nl and
    // shop.mediamarkt.nl stay two rows, because nothing told us they are one
    // business.
    expect(value.filter((d) => !d.isOwn).map((d) => d.domain).sort()).toEqual([
      'mediamarkt.nl',
      'shop.mediamarkt.nl',
    ])
  })

  it('does not let the marking change the count or the order', () => {
    // The marking is an annotation. A client's own site is not promoted up a
    // frequency table for being theirs.
    const answers = [
      answer('target-a', 'ok', ['https://zzz.nl/a']),
      answer('target-a', 'ok', ['https://zzz.nl/b']),
      answer('target-a', 'ok', ['https://acme.nl/c']),
    ]
    const unmarked = aggregateRun(input(answers)).targets[0]!.citedDomains.result
    const marked = aggregateRun(input(answers, 'acme.nl')).targets[0]!.citedDomains.result
    const strip = (r: typeof unmarked) =>
      r.kind === 'measured' ? r.value.map((d) => [d.domain, d.answers]) : null

    expect(strip(marked)).toEqual(strip(unmarked))
    expect(strip(marked)).toEqual([
      ['zzz.nl', 2],
      ['acme.nl', 1],
    ])
  })
})

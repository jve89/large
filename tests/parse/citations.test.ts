import type Anthropic from '@anthropic-ai/sdk'
import type OpenAI from 'openai'
import { describe, expect, it } from 'vitest'
import { interpretAnthropicMessage } from '../../src/core/providers/anthropic.ts'
import { interpretOpenAiResponse } from '../../src/core/providers/openai.ts'
import { loadFixture } from '../helpers/fixtures.ts'

type AnthropicMessage = Anthropic.Messages.Message
type OpenAiResponse = OpenAI.Responses.Response
import { normaliseCitations } from '../../src/core/parse/citations.ts'

describe('normaliseCitations', () => {
  it('keeps url and title in the order the provider reported them', () => {
    expect(
      normaliseCitations([
        { url: 'https://a.example.com/one', title: 'One' },
        { url: 'https://b.example.com/two', title: 'Two' },
      ]),
    ).toEqual([
      { url: 'https://a.example.com/one', title: 'One' },
      { url: 'https://b.example.com/two', title: 'Two' },
    ])
  })

  it('de-duplicates repeated sources', () => {
    const result = normaliseCitations([
      { url: 'https://a.example.com/one', title: 'One' },
      { url: 'https://a.example.com/one', title: 'One again' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe('One')
  })

  it('drops a fragment but keeps a query string', () => {
    expect(normaliseCitations([{ url: 'https://a.example.com/p?x=1#frag' }])[0]?.url).toBe(
      'https://a.example.com/p?x=1',
    )
  })

  it('drops entries without a usable url', () => {
    expect(
      normaliseCitations([{ url: '' }, { url: null }, {}, { url: 'not a url' }]),
    ).toEqual([])
  })

  it('rejects a non-http scheme', () => {
    expect(normaliseCitations([{ url: 'javascript:alert(1)' }])).toEqual([])
  })

  it('normalises a missing title to null rather than an empty string', () => {
    expect(normaliseCitations([{ url: 'https://a.example.com', title: '   ' }])[0]?.title).toBe(
      null,
    )
  })
})

/**
 * C7's rules, stated explicitly rather than left implied by the cases above.
 */
describe('normaliseCitations - C7 in full', () => {
  it('collapses two citations differing only by a fragment', () => {
    const out = normaliseCitations([
      { url: 'https://example.com/guide', title: 'Guide' },
      { url: 'https://example.com/guide#pricing', title: 'Guide, pricing section' },
    ])
    expect(out).toHaveLength(1)
    // The first reporting wins, so the title kept is the first one seen.
    expect(out[0]?.title).toBe('Guide')
  })

  it('keeps two citations differing by a query string, which is a different page', () => {
    const out = normaliseCitations([
      { url: 'https://example.com/search?q=a' },
      { url: 'https://example.com/search?q=b' },
    ])
    expect(out).toHaveLength(2)
  })

  it('drops a relative url, because a stored citation SHALL be absolute', () => {
    expect(normaliseCitations([{ url: '/guide' }, { url: 'guide.html' }])).toEqual([])
  })

  it('drops non-http schemes', () => {
    expect(
      normaliseCitations([
        { url: 'ftp://example.com/f' },
        { url: 'data:text/plain,hello' },
        { url: 'javascript:alert(1)' },
      ]),
    ).toEqual([])
  })

  it('keeps http as well as https', () => {
    const out = normaliseCitations([{ url: 'http://example.com/a' }])
    expect(out).toHaveLength(1)
  })

  it('preserves the order the provider first reported each source', () => {
    const out = normaliseCitations([
      { url: 'https://c.example/3' },
      { url: 'https://a.example/1' },
      { url: 'https://c.example/3#again' },
      { url: 'https://b.example/2' },
    ])
    // After the collapse the surviving order is first-reported order, and the
    // duplicate does not hold a slot.
    expect(out.map((c) => c.url)).toEqual([
      'https://c.example/3',
      'https://a.example/1',
      'https://b.example/2',
    ])
  })
})

/**
 * The same rules, driven through **stored provider responses** rather than
 * hand-written arrays - so what is checked is the shape a provider actually
 * produced, not the shape we believe it produces.
 *
 * `anthropic-ok` and `openai-ok` are `observed`: real captures. Everything else is
 * `documented` - see tests/helpers/fixtures.ts and each file's `$meta`.
 */
describe('citations extracted from stored provider responses', () => {
  it('extracts absolute, de-duplicated citations from a real Anthropic answer', () => {
    const fixture = loadFixture<AnthropicMessage>('anthropic-ok')
    expect(fixture.meta.evidence).toBe('observed')

    const result = interpretAnthropicMessage(fixture.response, fixture.meta.modelId, 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.citations.length).toBeGreaterThan(0)
    for (const citation of result.citations) {
      expect(citation.url).toMatch(/^https?:\/\//)
      expect(citation.url).not.toContain('#')
    }
    // De-duplicated: no url appears twice.
    expect(new Set(result.citations.map((c) => c.url)).size).toBe(result.citations.length)
  })

  it('extracts absolute, de-duplicated citations from a real OpenAI answer', () => {
    const fixture = loadFixture<OpenAiResponse>('openai-ok')
    expect(fixture.meta.evidence).toBe('observed')

    const result = interpretOpenAiResponse(fixture.response, fixture.meta.modelId, 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.citations.length).toBeGreaterThan(0)
    for (const citation of result.citations) {
      expect(citation.url).toMatch(/^https?:\/\//)
    }
    expect(new Set(result.citations.map((c) => c.url)).size).toBe(result.citations.length)
  })
})

/**
 * Rule 8, and the reason this project has a live gate: **a web search error is not
 * an empty result.** These are two tests and not one on purpose - the pair is what
 * distinguishes "the search failed" from "the search worked and found nothing",
 * and collapsing them is the single most damaging error this instrument can make,
 * because it is invisible afterwards.
 */
describe('a search error is a failure; a search that found nothing is an answer', () => {
  it('Anthropic: an error object is `ok: false` and yields no answer at all', () => {
    const fixture = loadFixture<AnthropicMessage>('anthropic-search-error')
    const result = interpretAnthropicMessage(fixture.response, fixture.meta.modelId, 1)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('web search failed')
    expect(result.reason).toContain('too_many_requests')
    expect(result.retryable).toBe(true)
  })

  it('Anthropic: an empty result list is a successful answer with no citations', () => {
    const fixture = loadFixture<AnthropicMessage>('anthropic-no-citations')
    const result = interpretAnthropicMessage(fixture.response, fixture.meta.modelId, 1)

    // The model searched, matched nothing, and answered. That is an observation,
    // not the absence of one, and it must never collapse into the case above.
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.citations).toEqual([])
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('OpenAI: a non-completed web_search_call is `ok: false`', () => {
    const fixture = loadFixture<OpenAiResponse>('openai-search-error')
    const result = interpretOpenAiResponse(fixture.response, fixture.meta.modelId, 1)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('web search failed')
  })

  it('OpenAI: a completed search with no annotations is a successful answer', () => {
    const fixture = loadFixture<OpenAiResponse>('openai-no-citations')
    const result = interpretOpenAiResponse(fixture.response, fixture.meta.modelId, 1)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.citations).toEqual([])
    expect(result.text.length).toBeGreaterThan(0)
  })
})

/**
 * A truncated or paused answer can cut off a brand, which would then be counted as
 * not mentioned. Both are failed attempts, never successful ones.
 */
describe('truncated and incomplete answers are failures', () => {
  it('Anthropic: stop_reason max_tokens is a failure, not a short answer', () => {
    const fixture = loadFixture<AnthropicMessage>('anthropic-truncated')
    const result = interpretAnthropicMessage(fixture.response, fixture.meta.modelId, 1)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('truncated')
    expect(result.retryable).toBe(false)
  })

  it('Anthropic: a paused turn is a failure and is retryable', () => {
    const fixture = loadFixture<AnthropicMessage>('anthropic-pause-turn')
    const result = interpretAnthropicMessage(fixture.response, fixture.meta.modelId, 1)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('paused')
    expect(result.retryable).toBe(true)
  })

  it('OpenAI: an incomplete response is a failure carrying its reason', () => {
    const fixture = loadFixture<OpenAiResponse>('openai-incomplete')
    const result = interpretOpenAiResponse(fixture.response, fixture.meta.modelId, 1)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('incomplete')
    expect(result.reason).toContain('max_output_tokens')
  })
})

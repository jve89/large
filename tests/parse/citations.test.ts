import { describe, expect, it } from 'vitest'
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

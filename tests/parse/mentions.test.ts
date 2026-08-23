import { describe, expect, it } from 'vitest'
import { findMentions } from '../../src/core/parse/mentions.ts'

const subject = { aliases: ['Acme'], competitors: ['Globex', 'Initech'] }

describe('findMentions', () => {
  it('ranks brands by first occurrence in the visible text', () => {
    const result = findMentions('Globex leads, then Acme, then Initech.', subject)
    expect(result.map((m) => [m.brand, m.position])).toEqual([
      ['Globex', 1],
      ['Acme', 2],
      ['Initech', 3],
    ])
    expect(result.every((m) => m.totalRecognised === 3)).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(findMentions('acme is fine', subject).map((m) => m.brand)).toEqual(['Acme'])
  })

  it('does not match a plural of a single-word alias (no stemming, per C8)', () => {
    expect(findMentions('There are many Acmes around.', subject)).toEqual([])
  })

  it('matches a brand at the very first and very last character', () => {
    expect(findMentions('Acme', subject).map((m) => m.brand)).toEqual(['Acme'])
    expect(findMentions('the winner is Globex', subject).map((m) => m.brand)).toEqual([
      'Globex',
    ])
  })

  it('tolerates a line break inside a multi-word alias', () => {
    const result = findMentions('We rate Big\n  Corp highly.', {
      aliases: ['Big Corp'],
      competitors: [],
    })
    expect(result.map((m) => m.brand)).toEqual(['Big Corp'])
  })

  it('does not count a brand that appears only in a link target', () => {
    expect(findMentions('Read [the guide](https://acme.example.com).', subject)).toEqual([])
  })

  it('does not count a brand that appears only inside a code fence', () => {
    const raw = ['Nothing here.', '```', 'Acme', '```'].join('\n')
    expect(findMentions(raw, subject)).toEqual([])
  })

  it('prefers the longest alias where aliases overlap', () => {
    const result = findMentions('We use Acme Cloud daily.', {
      aliases: ['Acme', 'Acme Cloud'],
      competitors: [],
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.totalRecognised).toBe(1)
  })

  it('resolves a name in both lists in favour of the subject brand', () => {
    const result = findMentions('Acme wins.', { aliases: ['Acme'], competitors: ['Acme'] })
    expect(result).toHaveLength(1)
    expect(result[0]?.isSubject).toBe(true)
  })

  it('treats every alias of the subject as one brand', () => {
    const result = findMentions('Acme, also known as AcmeCo, is popular.', {
      aliases: ['Acme', 'AcmeCo'],
      competitors: ['Globex'],
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.position).toBe(1)
    expect(result[0]?.totalRecognised).toBe(1)
  })

  it('works with an empty competitor list', () => {
    const result = findMentions('Acme is the only one.', { aliases: ['Acme'], competitors: [] })
    expect(result).toEqual([
      { brand: 'Acme', isSubject: true, position: 1, totalRecognised: 1 },
    ])
  })

  it('returns nothing when the brand is absent', () => {
    expect(findMentions('Nobody relevant here.', subject)).toEqual([])
  })

  it('requires a non-alphanumeric boundary, so a substring does not match', () => {
    expect(findMentions('AcmeCorporation is different.', subject)).toEqual([])
  })
})

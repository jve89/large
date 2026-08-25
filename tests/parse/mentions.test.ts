/**
 * SPEC C8 - the parser.
 *
 * Every clause of C8 that is a statement about a string is checked here. The two
 * that are not - that anything calls this at all, and that a brand appearing only
 * in a citation is not a mention - are in `mentions-seam.test.ts`, because neither
 * is observable from inside this function (CLAUDE.md rule 18).
 */
import { describe, expect, it } from 'vitest'
import { findMentions } from '../../src/core/parse/mentions.ts'

const subject = { aliases: ['Acme'], competitors: ['Globex', 'Initech'] }

/** Just the brand names, in position order. */
function brands(text: string, input = subject): string[] {
  return findMentions(text, input).map((m) => m.brand)
}

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

  it('matches an accented alias whatever normalisation form the answer arrives in', () => {
    // A provider may send either form and the difference is invisible on screen.
    // C8 says matching is Unicode-normalised, so both must match one NFC alias.
    const cafe = { aliases: ['Caf\u00e9 Rouge'], competitors: [] }
    const composed = 'We rate Caf\u00e9 Rouge highly.' // e-acute as one code point
    const decomposed = 'We rate Cafe\u0301 Rouge highly.' // e + combining acute

    expect(composed).not.toBe(decomposed)
    expect(brands(composed, cafe)).toEqual(['Caf\u00e9 Rouge'])
    expect(brands(decomposed, cafe)).toEqual(['Caf\u00e9 Rouge'])
  })

  it('matches an alias that is itself decomposed against composed answer text', () => {
    const cafe = { aliases: ['Cafe\u0301 Rouge'], competitors: [] }
    expect(brands('We rate Caf\u00e9 Rouge highly.', cafe)).toHaveLength(1)
  })

  it('is case-insensitive across accented letters too', () => {
    const cafe = { aliases: ['Caf\u00e9 Rouge'], competitors: [] }
    expect(brands('CAF\u00c9 ROUGE is closed on Mondays.', cafe)).toHaveLength(1)
  })

  it('accepts every non-alphanumeric character as a boundary', () => {
    for (const text of ['Acme, yes', '(Acme)', '"Acme"', 'Acme.', '- Acme', 'Acme/Globex']) {
      expect(brands(text), text).toContain('Acme')
    }
  })

  it("matches a possessive, because an apostrophe is not alphanumeric", () => {
    // Deliberate and worth pinning: C8 rules out a suffix that is *itself*
    // alphanumeric, which is what "Acmes" is. "Acme's" breaks the boundary with
    // the apostrophe, so the brand is there and a reader sees it.
    expect(brands("Acme's engineers are good.")).toEqual(['Acme'])
  })

  it('does not match a digit suffix either, since digits are alphanumeric', () => {
    expect(brands('Acme2 is a different company.')).toEqual([])
  })

  it('matches when the brand is the entire answer, both edges at once', () => {
    expect(brands('Acme')).toEqual(['Acme'])
  })

  it('matches a brand as the very last characters, with no trailing punctuation', () => {
    expect(brands('If in doubt, use Acme')).toEqual(['Acme'])
  })

  it('prefers the longest alias when the longer one belongs to a competitor', () => {
    // The overlap that matters: subject alias "Acme" is a prefix of competitor
    // "Acme Cloud". Matching the short one first would report the subject as
    // mentioned where the text names a rival - the most damaging possible error.
    const overlapping = { aliases: ['Acme'], competitors: ['Acme Cloud'] }
    const result = findMentions('We migrated to Acme Cloud last year.', overlapping)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ brand: 'Acme Cloud', isSubject: false })
  })

  it('still finds the shorter alias elsewhere in the same answer', () => {
    const overlapping = { aliases: ['Acme'], competitors: ['Acme Cloud'] }
    const result = findMentions('Acme is fine, but Acme Cloud is faster.', overlapping)

    expect(result.map((m) => [m.brand, m.position])).toEqual([
      ['Acme', 1],
      ['Acme Cloud', 2],
    ])
  })

  it('tolerates extra spaces as well as a line break inside a multi-word alias', () => {
    const big = { aliases: ['Big Corp'], competitors: [] }
    expect(brands('the   Big     Corp   result', big)).toEqual(['Big Corp'])
    expect(brands('the Big\nCorp result', big)).toEqual(['Big Corp'])
    expect(brands('the Big\r\n\tCorp result', big)).toEqual(['Big Corp'])
  })

  it('does not join two words across a paragraph break into a multi-word alias', () => {
    // \s+ is elastic, and a blank line is still whitespace. This is the honest
    // consequence and it is pinned rather than left to be discovered: an alias
    // split across a paragraph is matched. If that ever proves wrong in real
    // answers it is a spec question, not a silent fix.
    const big = { aliases: ['Big Corp'], competitors: [] }
    expect(brands('Big\n\nCorp', big)).toEqual(['Big Corp'])
  })

  it('reports position and total consistently on every row of one answer', () => {
    const result = findMentions('Initech, then Globex, then Acme.', subject)
    expect(result.map((m) => m.position)).toEqual([1, 2, 3])
    expect(new Set(result.map((m) => m.totalRecognised))).toEqual(new Set([3]))
  })

  it('finds nothing when the run snapshot has no aliases at all', () => {
    // Not a parser fault: a company saved with no aliases can never be mentioned.
    // Pinned so the behaviour is a known one rather than a surprise in Phase 9.
    expect(brands('Acme is everywhere.', { aliases: [], competitors: ['Globex'] })).toEqual([])
  })

  it('ignores an empty or whitespace-only alias rather than matching everything', () => {
    const result = findMentions('Anything at all.', { aliases: ['', '   '], competitors: [] })
    expect(result).toEqual([])
  })

  it('does not count a brand that appears only in a bare URL', () => {
    // CLAUDE.md rule 7, and the reason SPEC's Visible text definition was widened:
    // a client's own domain contains its own name, so this counted the subject as
    // mentioned in answers that never named it and shifted every position after.
    expect(brands('Three firms serve Leeds; see https://acme.example.com/prices.')).toEqual([])
  })

  it('does not count a brand that appears only in an email address', () => {
    expect(brands('Ask for a quote at info@acme.nl.')).toEqual([])
  })

  it('does not count a brand that appears only in a reference-link definition', () => {
    const raw = ['Read [the comparison][c].', '', '[c]: https://acme.example.com/vs'].join('\n')
    expect(brands(raw)).toEqual([])
  })

  it('does not let an address shift the positions of brands that are named', () => {
    // The damaging version of the bug: the subject is only in a URL, but that URL
    // comes first, so before the widening Acme took position 1 and Globex - the
    // brand the model actually recommended - was reported second.
    const raw = 'Per https://acme.example.com/guide, Globex is the one to call.'
    expect(findMentions(raw, subject).map((m) => [m.brand, m.position])).toEqual([
      ['Globex', 1],
    ])
  })

  it('still counts a brand named in a link label', () => {
    expect(brands('We recommend [Acme](https://example.com/x).')).toEqual(['Acme'])
  })

  it('still counts a brand named in prose beside its own address', () => {
    const result = findMentions('Acme (www.acme.example.com) is the pick.', subject)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ brand: 'Acme', position: 1, totalRecognised: 1 })
  })

  it('matches an alias that is a bare domain, since those are not stripped', () => {
    const domainAlias = { aliases: ['acme.com'], competitors: [] }
    expect(brands('Everyone calls them acme.com locally.', domainAlias)).toEqual(['acme.com'])
  })

  it('still counts the brand inside a bare domain, which is the cost of keeping bare domains', () => {
    // Observed in real output on 2026-08-25: openai attributes its sources as
    // `([coolblue.nl](https://www.coolblue.nl/...))`. The link rule reduces that
    // to the label `coolblue.nl`, which has neither scheme nor `www.` and is
    // therefore deliberately kept - and "Coolblue" then matches inside it, because
    // the dot is a boundary.
    //
    // This is the residual of the address problem and it is a consequence of the
    // rule rather than an oversight: bare domains stay so that an operator may use
    // one as an alias. It is pinned here so that a later reader meets it as a
    // known trade-off. Where it bites is the "cited but not named" case - a model
    // that attributes a source as `[acme.nl](...)` while recommending a rival
    // still scores the subject as mentioned.
    const raw = 'Buy from Globex. ([acme.nl](https://www.acme.nl/prices))'
    expect(brands(raw)).toEqual(['Globex', 'Acme'])
  })
})

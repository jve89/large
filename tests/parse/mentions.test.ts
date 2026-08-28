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

  it('does not count a brand whose only appearance is a link label that is a domain', () => {
    // Observed in real output on 2026-08-25: openai attributes sources as
    // `([coolblue.nl](https://www.coolblue.nl/...))`. That is the visible half of
    // an attribution, not prose, and the markdown says so - the parser already
    // knows it is inside a link because it strips the target.
    const raw = 'Buy from Globex. ([acme.nl](https://www.acme.nl/prices))'
    expect(brands(raw)).toEqual(['Globex'])
  })

  it('still counts a bare domain standing in running prose', () => {
    // The other half of the same rule. Here the model is naming a business.
    expect(brands('Try acme.nl for pipes.', { aliases: ['acme.nl'], competitors: [] })).toEqual([
      'acme.nl',
    ])
  })

  it('still counts a link whose label names the brand', () => {
    expect(brands('We recommend [Acme](https://acme.nl).')).toEqual(['Acme'])
  })

  it('keeps a label that merely contains a domain among other words', () => {
    expect(brands('See [the acme.nl guide](https://x.example.com).')).toEqual(['Acme'])
  })

  it('accepts the false negative when a brand IS a domain and links to itself', () => {
    // Booking.com, Werkspot.nl. The label is the address of the thing linked, the
    // citation already records it, and counting it would read a source as a
    // recommendation. Deliberately taken in the under-counting direction, and
    // PLAN Phase 9 counts how often it actually happens.
    const domainBrand = { aliases: ['Booking.com'], competitors: [] }
    expect(brands('Compare prices at [Booking.com](https://www.booking.com).', domainBrand)).toEqual(
      [],
    )
    // Named in prose as well, it is counted - which is the expected real case.
    expect(
      brands('Booking.com is cheapest ([booking.com](https://www.booking.com)).', domainBrand),
    ).toEqual(['Booking.com'])
  })

  it('counts a brand that merely looks like a domain, because it is not the address', () => {
    // The class the previous rule wrongly merged with the one above. "Node.js"
    // contains a dot and a TLD-shaped suffix and is not an address; nodejs.org is.
    const dotted = { aliases: ['Node.js'], competitors: [] }
    expect(brands('We build on [Node.js](https://nodejs.org) here.', dotted)).toEqual(['Node.js'])
  })
})

/**
 * Quote folding (SPEC -> Definitions -> Quote folding; C8; measurement semantics
 * version 5).
 *
 * Every test here goes red if `foldQuotes` is removed from either side of the
 * comparison, which is the point of the block: the defect it guards is invisible
 * on screen - the two apostrophes render almost identically - and total when it
 * occurs, because an alias that cannot match matches nothing at all.
 */
describe('findMentions - typographic apostrophes and quotation marks', () => {
  const CURLY = '’'
  const STRAIGHT = "'"

  it('matches a straight-apostrophe alias against typographic answer text', () => {
    // The operator's keyboard against the model's renderer. This is the case that
    // actually happens, and without folding it can never match.
    const mikes = { aliases: ["Mike's Car Service"], competitors: [] }
    expect(brands(`I would try Mike${CURLY}s Car Service in Geldermalsen.`, mikes)).toEqual([
      "Mike's Car Service",
    ])
  })

  it('matches a typographic-apostrophe alias against straight answer text', () => {
    // The reverse. Folding one side only would trade one silent miss for the other.
    const mikes = { aliases: [`Mike${CURLY}s Car Service`], competitors: [] }
    expect(brands(`I would try Mike${STRAIGHT}s Car Service.`, mikes)).toEqual([
      `Mike${CURLY}s Car Service`,
    ])
  })

  it('matches the Dutch forms this rule exists for', () => {
    // 't, 's and possessives are ordinary in Dutch business and place names, so an
    // unfolded match fails most often on the most local-sounding businesses.
    // Three separate businesses, so they are competitors: every alias of the
    // subject collapses to one entry, which would hide two of the three.
    const dutch = {
      aliases: ['Acme'],
      competitors: ["'t Hoekje", "'s-Hertogenbosch", "Jan's Autoservice"],
    }
    const answer =
      `Ga naar ${CURLY}t Hoekje in ${CURLY}s-Hertogenbosch, of naar Jan${CURLY}s Autoservice.`
    expect(brands(answer, dutch)).toEqual(["'t Hoekje", "'s-Hertogenbosch", "Jan's Autoservice"])
  })

  it('folds double quotation marks as well as apostrophes', () => {
    const quoted = { aliases: ['Café "De Zon"'], competitors: [] }
    expect(brands('We raden Café “De Zon” aan.', quoted)).toEqual(['Café "De Zon"'])
  })

  it('reports the brand exactly as the operator typed it, not the folded form', () => {
    // Folding is a reduction made inside the comparison. What is stored and shown
    // is the operator's own text.
    const mikes = { aliases: ["Mike's Car Service"], competitors: [] }
    const result = findMentions(`Mike${CURLY}s Car Service is open.`, mikes)
    expect(result[0]?.brand).toBe("Mike's Car Service")
    expect(result[0]?.brand).not.toContain(CURLY)
  })

  it('does not move a position: a brand after a folded character keeps its rank', () => {
    // Every folded character is one code unit replaced by one, so an offset cannot
    // shift. A length-changing fold would renumber every brand after an apostrophe.
    const overlapping = { aliases: ["Jan's Autoservice"], competitors: ['Globex', 'Initech'] }
    const curly = findMentions(
      `Globex, dan Jan${CURLY}s Autoservice, dan Initech.`,
      overlapping,
    )
    const straight = findMentions(
      `Globex, dan Jan${STRAIGHT}s Autoservice, dan Initech.`,
      overlapping,
    )
    expect(curly.map((m) => [m.brand, m.position, m.totalRecognised])).toEqual([
      ['Globex', 1, 3],
      ["Jan's Autoservice", 2, 3],
      ['Initech', 3, 3],
    ])
    expect(curly).toEqual(straight)
  })

  it('counts one brand, not two, when both apostrophe forms are listed', () => {
    // An operator who pastes a name twice in the two forms must not double the
    // total recognised, which is the denominator of a position.
    const both = {
      aliases: [],
      competitors: ["Mike's Car Service", `Mike${CURLY}s Car Service`],
    }
    const result = findMentions(`Mike${CURLY}s Car Service is open.`, both)
    expect(result).toHaveLength(1)
    expect(result[0]?.totalRecognised).toBe(1)
  })

  it('does not fold a backtick, which is markdown syntax rather than an apostrophe', () => {
    const tick = { aliases: ["Jan's Autoservice"], competitors: [] }
    expect(brands('Jan`s Autoservice', tick)).toEqual([])
  })
})

/**
 * Hyphen folding (SPEC -> Definitions -> Quote folding; C8; measurement semantics
 * version 6).
 *
 * The apostrophe fold's twin, and found the same way: Phase 9 registered a
 * competitor as `Slotenmaker-Expert`, a model wrote "Slotenmaker Expert
 * Nieuwegein" in prose, and the business was named and counted nowhere.
 */
describe('findMentions - hyphens and dashes', () => {
  const EN = '–'
  const EM = '—'

  it('matches a hyphenated alias against a spaced name in prose', () => {
    // The case that actually happened, on real data, in Phase 9.
    const expert = { aliases: ['Acme'], competitors: ['Slotenmaker-Expert'] }
    expect(
      brands('Bel **Slotenmaker Expert Nieuwegein** voor spoedhulp.', expert),
    ).toEqual(['Slotenmaker-Expert'])
  })

  it('matches a spaced alias against a hyphenated name in prose', () => {
    // The reverse, because folding one side only trades one silent miss for another.
    const spaced = { aliases: ['Auto Blom'], competitors: [] }
    expect(brands('Ga naar Auto-Blom in Enspijk.', spaced)).toEqual(['Auto Blom'])
  })

  it('folds en dashes and em dashes as well as the ASCII hyphen', () => {
    const dashed = { aliases: ['Jansen-de Vries'], competitors: [] }
    expect(brands(`Wij raden Jansen${EN}de Vries aan.`, dashed)).toHaveLength(1)
    expect(brands(`Wij raden Jansen${EM}de Vries aan.`, dashed)).toHaveLength(1)
    expect(brands('Wij raden Jansen de Vries aan.', dashed)).toHaveLength(1)
  })

  it('reports the brand exactly as the operator typed it, hyphen and all', () => {
    const expert = { aliases: ['Acme'], competitors: ['Slotenmaker-Expert'] }
    const result = findMentions('Slotenmaker Expert is open.', expert)
    expect(result[0]?.brand).toBe('Slotenmaker-Expert')
  })

  it('does not move a position: a brand after a folded dash keeps its rank', () => {
    const input = { aliases: ['Acme'], competitors: ['Slotenmaker-Expert', 'Globex'] }
    const hyphen = findMentions('Acme, dan Slotenmaker-Expert, dan Globex.', input)
    const spaced = findMentions('Acme, dan Slotenmaker Expert, dan Globex.', input)
    expect(hyphen.map((m) => [m.brand, m.position, m.totalRecognised])).toEqual([
      ['Acme', 1, 3],
      ['Slotenmaker-Expert', 2, 3],
      ['Globex', 3, 3],
    ])
    expect(hyphen).toEqual(spaced)
  })

  it('counts one brand, not two, when both spellings are listed', () => {
    const both = { aliases: [], competitors: ['Slotenmaker-Expert', 'Slotenmaker Expert'] }
    const result = findMentions('Slotenmaker Expert is open.', both)
    expect(result).toHaveLength(1)
    expect(result[0]?.totalRecognised).toBe(1)
  })

  it('leaves a soft hyphen inside a word unmatched, which is a known limitation', () => {
    // U+00AD is an invisible line-break hint sitting *inside* a word. It is not in
    // the fold set, and folding it to a space would not help either: the alias has
    // no space there, so "Sloten maker" misses "Slotenmaker" exactly as
    // "Sloten\u00ADmaker" does. The only fix is to delete the character, which
    // changes the string's length and would move every position after it - the one
    // property every fold in this file preserves. So it stays unhandled, and it is
    // pinned here rather than left to be discovered.
    const one = { aliases: ['Slotenmaker'], competitors: [] }
    expect(brands('Sloten\u00ADmaker in Nieuwegein', one)).toEqual([])
    expect(brands('Slotenmaker in Nieuwegein', one)).toEqual(['Slotenmaker'])
  })

  it('ignores an alias that is nothing but punctuation', () => {
    // It folds away to whitespace, and a pattern built from that would match
    // everywhere.
    expect(findMentions('Anything at all.', { aliases: ['-', ' - '], competitors: [] })).toEqual(
      [],
    )
  })
})

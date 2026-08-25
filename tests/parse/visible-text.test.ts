import { describe, expect, it } from 'vitest'
import { toVisibleText } from '../../src/core/parse/visible-text.ts'

describe('toVisibleText', () => {
  it('keeps a link label and drops its target', () => {
    expect(toVisibleText('Try [Acme](https://acme.example.com) today.')).toBe(
      'Try Acme today.',
    )
  })

  it('keeps image alt text and drops the image target', () => {
    expect(toVisibleText('![Acme logo](https://cdn.example.com/acme.png) is here.')).toBe(
      'Acme logo is here.',
    )
  })

  it('does not leave a stray bang where an image was', () => {
    expect(toVisibleText('![Acme](x.png)')).not.toContain('!')
  })

  it('drops fenced code blocks entirely', () => {
    const raw = ['Before.', '```js', 'const acme = "Acme"', '```', 'After.'].join('\n')
    const visible = toVisibleText(raw)
    expect(visible).toContain('Before.')
    expect(visible).toContain('After.')
    expect(visible).not.toContain('const acme')
  })

  it('drops a tilde-fenced block', () => {
    const raw = ['Before.', '~~~', 'Acme inside code', '~~~', 'After.'].join('\n')
    expect(toVisibleText(raw)).not.toContain('Acme inside code')
  })

  it('drops an unterminated fence rather than keeping its contents', () => {
    const raw = ['Before.', '```', 'Acme inside code'].join('\n')
    expect(toVisibleText(raw)).not.toContain('Acme inside code')
  })

  it('leaves a brand that appears only in a URL out of the visible text', () => {
    // The whole point of this stage: a brand in a link target is not a mention.
    expect(toVisibleText('See [the docs](https://acme.example.com/guide).')).toBe(
      'See the docs.',
    )
  })

  it('returns an empty string for empty input', () => {
    expect(toVisibleText('')).toBe('')
  })

  it('keeps a link label that carries the brand, because a reader sees it', () => {
    // The mirror of the rule above, and the reason this stage removes targets
    // rather than whole links: a brand in the label is a mention.
    expect(toVisibleText('Try [Acme Cloud](https://example.com/x) today.')).toBe(
      'Try Acme Cloud today.',
    )
  })

  it('drops a fence that is indented inside a list item', () => {
    const raw = ['1. First:', '', '   ```', '   Acme', '   ```', '', '2. Second.'].join('\n')
    const visible = toVisibleText(raw)
    expect(visible).toContain('First:')
    expect(visible).toContain('Second.')
    expect(visible).not.toContain('Acme')
  })

  it('drops a link that lives inside a fence, fence and all', () => {
    const raw = ['Before.', '```', '[Acme](https://acme.example.com)', '```', 'After.'].join('\n')
    const visible = toVisibleText(raw)
    expect(visible).not.toContain('Acme')
    expect(visible).toContain('After.')
  })

  it('does not let a closing fence be re-read as a new unterminated one', () => {
    // The regression the two separate fence rules exist for: folding them into one
    // rule silently deleted everything after the first closed block.
    const raw = ['Intro.', '```', 'code', '```', 'Acme is discussed here.'].join('\n')
    expect(toVisibleText(raw)).toContain('Acme is discussed here.')
  })

  it('keeps inline code spans, because C8 removes fenced blocks and only those', () => {
    // Deliberate: a single-backtick span is inline prose a reader reads. Pinned so
    // that widening the rule is a decision rather than a drift.
    expect(toVisibleText('The `Acme` option is default.')).toContain('Acme')
  })

  it('keeps text either side of several fences in one answer', () => {
    const raw = ['A.', '```', 'x', '```', 'B.', '```', 'y', '```', 'C.'].join('\n')
    const visible = toVisibleText(raw)
    for (const kept of ['A.', 'B.', 'C.']) expect(visible).toContain(kept)
    for (const gone of ['x', 'y']) expect(visible).not.toMatch(new RegExp(`^\\s*${gone}\\s*$`, 'm'))
  })

  it('leaves ordinary prose exactly as it found it', () => {
    const prose = 'Acme, Globex and Initech all serve Leeds; ask for a quote.'
    expect(toVisibleText(prose)).toBe(prose)
  })

  // ---- Addresses. SPEC -> Definitions -> Visible text, widened 2026-08-25. ----
  // Each of these counted the brand as mentioned before that date, and a
  // web-searching model emits all of them.

  it('removes a bare URL in prose', () => {
    expect(toVisibleText('Details at https://acme.example.com/guide today.')).not.toContain(
      'acme',
    )
  })

  it('removes an autolink, angle brackets and all', () => {
    const visible = toVisibleText('See <https://acme.example.com/guide>.')
    expect(visible).not.toContain('acme')
    expect(visible).not.toContain('<')
  })

  it('removes a reference-link definition line entirely', () => {
    const raw = ['See [the guide][g].', '', '[g]: https://acme.example.com/guide'].join('\n')
    const visible = toVisibleText(raw)
    expect(visible).not.toContain('acme')
    // ...while the label a reader actually sees survives, without its brackets.
    expect(visible).toContain('See the guide.')
  })

  it('removes a bare www host with no scheme', () => {
    expect(toVisibleText('Visit www.acme.example.com today.')).not.toContain('acme')
  })

  it('removes an email address', () => {
    expect(toVisibleText('Write to info@acme.nl for a quote.')).not.toContain('acme')
  })

  it('keeps prose that names the brand alongside its address', () => {
    // The rule removes the address, not the sentence. A brand named in prose is
    // named however many of its addresses appear beside it.
    const visible = toVisibleText('Contact Acme at info@acme.nl or www.acme.nl.')
    expect(visible).toContain('Acme')
    expect(visible.match(/acme/gi)).toHaveLength(1)
  })

  it('removes both halves of a link whose label is itself an address', () => {
    // Named explicitly because it is the case the two rules have to cooperate on:
    // the link rule reduces this to its label, which is still an address.
    const visible = toVisibleText(
      'Source: [www.acme.example.com](https://www.acme.example.com).',
    )
    expect(visible).not.toContain('acme')
    expect(visible).toContain('Source:')
  })

  it('keeps a bare domain written as prose, so a domain may be used as an alias', () => {
    // Deliberately not removed: no scheme and no www. An operator who enters
    // "acme.com" as an alias must still have it matched.
    expect(toVisibleText('People just say acme.com when they mean them.')).toContain(
      'acme.com',
    )
  })

  it('removes a URL inside parentheses without eating the closing bracket', () => {
    const visible = toVisibleText('The guide (https://acme.example.com/g) explains it.')
    expect(visible).not.toContain('acme')
    expect(visible).toContain(')')
  })

  it('removes several addresses in one answer', () => {
    const raw = 'Try https://acme.example.com, or www.globex.example.com, or ask sales@acme.nl.'
    const visible = toVisibleText(raw)
    for (const gone of ['acme', 'globex']) expect(visible.toLowerCase()).not.toContain(gone)
  })
})

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
})

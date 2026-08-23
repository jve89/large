import { describe, expect, it } from 'vitest'
import { basisHash } from '../src/lib/hash.ts'

const base = {
  prompts: ['best crm for startups', 'crm with good api'],
  targets: [
    { provider: 'anthropic' as const, modelId: 'model-a' },
    { provider: 'openai' as const, modelId: 'model-b' },
  ],
  aliases: ['Acme', 'AcmeCo'],
  competitors: ['Globex'],
}

describe('basisHash', () => {
  it('is stable for identical input', () => {
    expect(basisHash(base)).toBe(basisHash(base))
  })

  it('changes when a prompt changes', () => {
    expect(basisHash({ ...base, prompts: ['best crm for startups', 'different'] })).not.toBe(
      basisHash(base),
    )
  })

  it('changes when prompt order changes, because prompt order is part of the basis', () => {
    expect(basisHash({ ...base, prompts: [...base.prompts].reverse() })).not.toBe(
      basisHash(base),
    )
  })

  it('changes when a model id changes', () => {
    expect(
      basisHash({
        ...base,
        targets: [base.targets[0]!, { provider: 'openai' as const, modelId: 'model-c' }],
      }),
    ).not.toBe(basisHash(base))
  })

  it('changes when the alias list changes', () => {
    expect(basisHash({ ...base, aliases: ['Acme'] })).not.toBe(basisHash(base))
  })

  it('changes when the competitor list changes', () => {
    expect(basisHash({ ...base, competitors: ['Globex', 'Initech'] })).not.toBe(
      basisHash(base),
    )
  })

  it('is unchanged by alias order, because aliases are a set and not a sequence', () => {
    expect(basisHash({ ...base, aliases: ['AcmeCo', 'Acme'] })).toBe(basisHash(base))
  })

  it('is unchanged by duplicate or whitespace-padded names', () => {
    expect(basisHash({ ...base, aliases: ['Acme', '  AcmeCo  ', 'Acme'] })).toBe(
      basisHash(base),
    )
  })
})

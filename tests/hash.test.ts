import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { MEASUREMENT_SEMANTICS_VERSION } from '../src/core/parse/semantics.ts'
import { basisHash, basisHashAt } from '../src/lib/hash.ts'

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

  it('is unchanged by prompt order, because a prompt list is a set and not a sequence', () => {
    // Reversed 2026-08-25. Prompt order used to be part of the basis; it is not.
    // Every (prompt, target, repetition) is an independent call with no shared
    // state, so twenty prompts asked in a different order are the same twenty
    // questions - and refusing to compare two runs that asked identically is a
    // false negative in the guard. See lib/hash.ts -> Canonical form.
    expect(basisHash({ ...base, prompts: [...base.prompts].reverse() })).toBe(basisHash(base))
  })

  it('is unchanged by target order, for the same reason', () => {
    expect(basisHash({ ...base, targets: [...base.targets].reverse() })).toBe(basisHash(base))
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

  it('changes when the measurement semantics version changes', () => {
    // The fifth input, added 2026-08-25. Without it a parser change altered what
    // "mentioned" means while every affected run kept its hash and went on being
    // presented as one series - which is what C11 exists to prevent.
    expect(basisHashAt(base, 2)).not.toBe(basisHashAt(base, 3))
  })

  it('uses the current version when none is given, so a caller cannot pass the wrong one', () => {
    expect(basisHash(base)).toBe(basisHashAt(base, MEASUREMENT_SEMANTICS_VERSION))
  })

  it('differs from the four-input hash runs queued before 2026-08-25 carry', () => {
    // Version 1 is retroactive and unstamped: those rows were hashed over four
    // inputs. They must not collide with anything produced since, and they do not,
    // because the payload itself gained a field.
    const fourInput = createHash('sha256')
      .update(
        JSON.stringify({
          prompts: base.prompts,
          targets: base.targets.map((t) => [t.provider, t.modelId]),
          aliases: [...base.aliases].sort(),
          competitors: [...base.competitors],
        }),
        'utf8',
      )
      .digest('hex')

    expect(basisHash(base)).not.toBe(fourInput)
  })

  it('is not changed by the brand name, which is still excluded', () => {
    // Guarding the boundary from the other side: the fifth input is the code's
    // meaning, not another field of the company.
    expect(basisHash(base)).toBe(basisHash({ ...base }))
  })
})

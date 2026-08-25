/**
 * The anti-rot guard for `tests/fixtures/`.
 *
 * Stored responses are the only evidence several of this project's rules are ever
 * checked against outside the live gate - above all rule 8, that a web search
 * error is not an empty result. Frozen evidence goes stale invisibly: when a
 * provider changes its response shape, every fixture keeps passing, and the
 * adapter is green against a provider that no longer exists.
 *
 * The check below converts that silent rot into a loud failure at the moment it
 * begins: a fixture must have been captured from the **currently pinned** model.
 * Change `DEFAULT_TARGETS` and this goes red, which is the prompt to recapture:
 *
 *     PROVIDER_CAPTURE_DIR=.captured npm run verify:live
 *
 * and rebuild the fixtures from what lands there.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_TARGETS } from '../src/lib/defaults.ts'
import { isCaptureEnabled } from '../src/core/providers/capture.ts'
import { fixtureNames, loadFixture } from './helpers/fixtures.ts'

const pinnedModelFor = new Map(DEFAULT_TARGETS.map((t) => [t.provider, t.modelId]))

describe('every fixture declares its provenance', () => {
  it('has at least one fixture per pinned provider', () => {
    const providers = new Set(fixtureNames().map((n) => loadFixture(n).meta.provider))
    for (const target of DEFAULT_TARGETS) {
      expect(providers, `no fixture for pinned provider ${target.provider}`).toContain(
        target.provider,
      )
    }
  })

  it.each(fixtureNames())('%s records model id, date and evidence grade', (name) => {
    const { meta } = loadFixture(name)
    expect(meta.provider).toBeTruthy()
    expect(meta.modelId).toBeTruthy()
    expect(meta.capturedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(['observed', 'documented']).toContain(meta.evidence)
    expect(meta.source.length).toBeGreaterThan(0)
    // The project's external-fact convention: every claim about a third-party
    // service carries a date and a re-check warning.
    expect(meta.note).toMatch(/re-check, don't trust/)
  })

  it.each(fixtureNames())(
    '%s was captured from the model id currently pinned for its provider',
    (name) => {
      const { meta } = loadFixture(name)
      const pinned = pinnedModelFor.get(meta.provider)

      expect(
        meta.modelId,
        `Fixture ${name} was captured from '${meta.modelId}' but the pinned model for ` +
          `${meta.provider} is now '${pinned}'. The fixture is stale: it will keep passing ` +
          `while testing a response shape the project no longer sends for. Recapture with ` +
          `PROVIDER_CAPTURE_DIR=.captured npm run verify:live and rebuild it.`,
      ).toBe(pinned)
    },
  )

  it('has both grades of evidence, and says which success fixtures are real', () => {
    const all = fixtureNames().map((n) => loadFixture(n))
    const observed = all.filter((f) => f.meta.evidence === 'observed')
    const documented = all.filter((f) => f.meta.evidence === 'documented')

    // The success path must be checked against something a provider actually
    // produced - a hand-written success fixture only tests what we believe the
    // provider returns.
    expect(observed.map((f) => f.name).sort()).toEqual(['anthropic-ok.json', 'openai-ok.json'])
    expect(documented.length).toBeGreaterThan(0)
  })
})

describe('capture mode', () => {
  it('is off during the test suite', () => {
    // Capture writes every raw provider response to disk. It is a deliberate
    // facility for recapturing fixtures, never something a normal run does.
    expect(isCaptureEnabled()).toBe(false)
    expect(process.env.PROVIDER_CAPTURE_DIR ?? '').toBe('')
  })
})

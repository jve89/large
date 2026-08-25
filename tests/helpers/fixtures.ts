/**
 * Loading stored provider responses, and the guard against them rotting.
 *
 * A fixture is frozen evidence, and frozen evidence rots silently. A provider
 * changes its response shape, every fixture still passes because it is stored, and
 * the adapter goes green against a provider that no longer exists. That is the
 * same class of failure as a deploy trigger reporting success while deploying
 * nothing: a mechanism that says "fine" while doing nothing.
 *
 * Two defences, both cheap:
 *
 *   1. Every fixture records the model id it was captured from, the date, and
 *      **what grade of evidence it is** - `observed` means a provider actually
 *      produced it, `documented` means the shape came from the provider's own
 *      documentation as recorded in ARCHITECTURE.md. Those are not the same thing
 *      and the directory must not flatten them.
 *   2. `tests/fixtures.test.ts` asserts each fixture's model id equals the
 *      currently pinned model id for that provider, so changing the pinned model
 *      turns rot into a red test at the moment it begins rather than months later.
 */
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import type { Provider } from '@prisma/client'

export const FIXTURE_DIR = path.join(process.cwd(), 'tests', 'fixtures')

export type Evidence = 'observed' | 'documented'

export interface FixtureMeta {
  readonly provider: Provider
  readonly modelId: string
  readonly capturedOn: string
  readonly evidence: Evidence
  readonly source: string
  readonly note: string
}

export interface Fixture<T> {
  readonly name: string
  readonly meta: FixtureMeta
  readonly response: T
}

export function fixtureNames(): string[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
}

export function loadFixture<T>(name: string): Fixture<T> {
  const file = name.endsWith('.json') ? name : `${name}.json`
  const parsed = JSON.parse(readFileSync(path.join(FIXTURE_DIR, file), 'utf8')) as {
    $meta: FixtureMeta
    response: T
  }
  if (!parsed.$meta) {
    throw new Error(
      `Fixture ${file} has no $meta block. Every fixture records the model id it was ` +
        'captured from, the date and whether it is observed or documented; a fixture ' +
        'without that cannot be checked for rot.',
    )
  }
  return { name: file, meta: parsed.$meta, response: parsed.response }
}

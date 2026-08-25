import type { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/db.ts'
import { DEFAULT_REPETITIONS, DEFAULT_TARGETS } from '../../../../../lib/defaults.ts'
import { validateEnv } from '../../../../../lib/env.ts'
import { isCompanyId, schemaErrorMessage } from '../../route.ts'

export const dynamic = 'force-dynamic'

/** SPEC C2: "more than 50 prompts" triggers the call-count warning. */
export const PROMPT_WARNING_THRESHOLD = 50

const bodySchema = z.object({
  prompts: z.array(z.string({ error: 'must be a string' }), { error: 'must be an array' }),
})

export interface NormalisedPromptList {
  /** The prompts to store, in order, exactly as they will be sent to a provider. */
  readonly prompts: string[]
  /** How many lines the operator submitted, before anything was dropped. */
  readonly submittedLines: number
  /** Every line dropped as a duplicate, in the order it was dropped. */
  readonly removedDuplicates: string[]
}

/**
 * Turns submitted lines into the stored prompt list (SPEC C2).
 *
 * Three rules, in order:
 *
 * 1. **Trim, then drop the empty ones.** "Each non-empty line becomes one prompt",
 *    and a line of spaces is not a prompt.
 * 2. **No Unicode normalisation.** Names get NFC in C1; prompt text does not. The
 *    prompt goes out unmodified (CLAUDE.md rule 6), and `lib/hash.ts` already
 *    NFC-normalises when it computes `basisHash`, so the basis is stable without
 *    editing the operator's characters on the way in.
 * 3. **De-duplicate on the exact trimmed string.** Never case-insensitively and
 *    never with internal whitespace collapsed: two prompts differing in case or
 *    in spacing are two different prompts to a provider, so they are two different
 *    measurements and both are kept.
 *
 * Rule 3 is the one that differs from C1, which de-duplicates aliases
 * case-insensitively. It is deliberate. A duplicate prompt is never something the
 * operator wants: it double-weights one question in that run's mention rate, which
 * is a corrupted measurement and not merely an expensive one. What is removed is
 * reported back line by line - the removal is never silent.
 */
export function normalisePrompts(lines: readonly string[]): NormalisedPromptList {
  const seen = new Set<string>()
  const prompts: string[] = []
  const removedDuplicates: string[] = []

  for (const line of lines) {
    const text = line.trim()
    if (!text) continue
    if (seen.has(text)) {
      removedDuplicates.push(text)
      continue
    }
    seen.add(text)
    prompts.push(text)
  }

  return { prompts, submittedLines: lines.length, removedDuplicates }
}

/**
 * The over-50 warning (SPEC C2).
 *
 * It names three numbers and every one of them is read from `lib/defaults.ts`:
 * the resulting call count, and both figures that count was computed from. No
 * literal appears here, so changing a default cannot leave this text quietly
 * stale.
 *
 * It says it is the default case because it has to: this endpoint cannot know the
 * N or the target list of a future run - those are chosen when the run is started
 * - so the figure is an illustration of the default configuration and not a
 * prediction about any particular run.
 */
export function promptLimitWarning(promptCount: number): string {
  const targetCount = DEFAULT_TARGETS.length
  const calls = promptCount * targetCount * DEFAULT_REPETITIONS

  return (
    `${promptCount} prompts is more than ${PROMPT_WARNING_THRESHOLD}. ` +
    `In the default case - the default N of ${DEFAULT_REPETITIONS} repetitions ` +
    `and the default target list of ${targetCount} targets - one run over this ` +
    `list is ${calls} provider calls, each of which costs real money. ` +
    `This endpoint cannot know the N or the targets of a future run; they are ` +
    `chosen when the run is started. The figure above is therefore the default ` +
    `case and not a prediction. The list has been saved.`
  )
}

/**
 * The de-duplication report (SPEC C2).
 *
 * Names how many lines came in, how many prompts were stored, and which specific
 * lines were removed - not a vague "duplicates were removed".
 */
export function duplicateNotice(list: NormalisedPromptList): string {
  const removed = list.removedDuplicates
  const quoted = removed.map((text) => `"${text}"`).join(', ')

  return (
    `${list.submittedLines} lines submitted, ${list.prompts.length} prompts ` +
    `stored. ${removed.length} duplicate ` +
    `${removed.length === 1 ? 'line was' : 'lines were'} removed: ${quoted}. ` +
    `A duplicate prompt is not two observations - it double-weights one question ` +
    `in that run's mention rate - so identical lines are stored once. ` +
    `De-duplication is on the exact trimmed text: prompts differing in case or ` +
    `in internal spacing are different prompts to a provider and are all kept.`
  )
}

/**
 * Replaces a company's stored prompt list, atomically. Returns false when the
 * company does not exist.
 *
 * **Wholesale replacement against a unique constraint.** `Prompt` carries
 * UNIQUE (companyId, order). Updating the existing rows in place collides with
 * itself the moment the new list is shorter, longer or merely reordered, so the
 * old rows are deleted and the new ones inserted, in that order, inside one
 * transaction.
 *
 * The transaction first takes a row lock on the company. Without it two concurrent
 * saves each delete rows the other cannot see and then both insert `order = 0`,
 * and the loser gets a raw unique violation instead of a replaced list. It doubles
 * as the existence check.
 *
 * **The same lock is what makes a run's snapshot coherent** (SPEC C3): `queueRun`
 * reads the company and its prompts as two separate SQL statements - verified,
 * Prisma issues an `include` as two queries - and PostgreSQL's default READ
 * COMMITTED gives each statement its own snapshot. Because this function is the
 * only writer of `Prompt` and it takes the lock, a run can never record aliases
 * from before a save and prompts from after it. Any future writer of `Prompt` must
 * take this lock too, or that guarantee lapses silently.
 *
 * `prisma` is a parameter rather than the singleton so that a test can drive two
 * genuinely concurrent callers on separate connections; see
 * tests/helpers/concurrency.ts.
 *
 * **This cannot disturb an existing run** (CLAUDE.md rule 10). A run holds
 * `RunPrompt`, a copy taken at queue time, and nothing references `Prompt`.
 */
export async function replacePromptList(
  client: PrismaClient,
  companyId: string,
  prompts: readonly string[],
): Promise<boolean> {
  // An empty list is a valid save: SPEC -> Explicitly NOT in scope says prompts
  // are removed by saving a shorter list, so there has to be a way to clear one.
  // C3 is what refuses to queue a run against a company with no prompts.
  return client.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Company" WHERE id = ${companyId}::uuid FOR UPDATE
    `
    if (locked.length === 0) return false

    await tx.prompt.deleteMany({ where: { companyId } })
    if (prompts.length > 0) {
      await tx.prompt.createMany({
        data: prompts.map((text, order) => ({ companyId, text, order })),
      })
    }
    return true
  })
}

/**
 * PUT /api/companies/:companyId/prompts - replace the whole prompt list (SPEC C2).
 *
 * **Wholesale replacement against a unique constraint.** `Prompt` carries
 * UNIQUE (companyId, order). Updating the existing rows in place collides with
 * itself the moment the new list is shorter, longer or merely reordered, so the
 * old rows are deleted and the new ones inserted, in that order, inside one
 * transaction.
 *
 * The transaction first takes a row lock on the company. Without it two
 * concurrent saves each delete rows the other cannot see and then both insert
 * `order = 0`, and the loser gets a raw unique-violation instead of a replaced
 * list. It doubles as the existence check.
 *
 * **This cannot disturb an existing run** (CLAUDE.md rule 10). A run holds
 * `RunPrompt`, a copy taken at queue time, and nothing references `Prompt`, so
 * deleting every row here leaves every stored run exactly as it was. Editing the
 * prompt list changes what the *next* run measures, never what a past run
 * measured.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
): Promise<NextResponse> {
  validateEnv('web')

  const { companyId } = await context.params

  if (!isCompanyId(companyId)) {
    return NextResponse.json({ error: 'Unknown company' }, { status: 404 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: schemaErrorMessage(parsed.error) }, { status: 400 })
  }

  const list = normalisePrompts(parsed.data.prompts)

  const replaced = await replacePromptList(prisma, companyId, list.prompts)

  if (!replaced) {
    return NextResponse.json({ error: 'Unknown company' }, { status: 404 })
  }

  return NextResponse.json({
    count: list.prompts.length,
    submittedLines: list.submittedLines,
    prompts: list.prompts,
    duplicatesRemoved: list.removedDuplicates,
    // Both can appear at once: a list of 60 lines with two duplicates in it
    // carries the de-duplication report and the call-count warning together.
    ...(list.removedDuplicates.length > 0 ? { notice: duplicateNotice(list) } : {}),
    ...(list.prompts.length > PROMPT_WARNING_THRESHOLD
      ? { warning: promptLimitWarning(list.prompts.length) }
      : {}),
  })
}

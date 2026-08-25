import { Provider } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { queueRun } from '../../../core/run/queue.ts'
import { prisma } from '../../../lib/db.ts'
import {
  DEFAULT_REPETITIONS,
  DEFAULT_TARGETS,
  MAX_REPETITIONS,
} from '../../../lib/defaults.ts'
import { validateEnv } from '../../../lib/env.ts'
import { isCompanyId } from '../companies/route.ts'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  companyId: z.string().min(1),
  /**
   * `MAX_REPETITIONS` is a cost guardrail rather than a spec rule - see the note
   * on it in lib/defaults.ts. The lower bound of 1 mirrors the database's
   * CHECK >= 1, which is normative.
   */
  repetitions: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_REPETITIONS)
    .default(DEFAULT_REPETITIONS),
  targets: z
    .array(
      z.object({
        // Derived from the Prisma enum, never a literal list: a provider name
        // hard-coded outside src/core/providers/ is CLAUDE.md rule 9, and a
        // hand-written list here would silently reject a third provider that the
        // schema, the registry and the target list all already accept.
        provider: z.enum(Provider),
        modelId: z.string().min(1),
      }),
    )
    .min(1)
    .default([...DEFAULT_TARGETS]),
})

/**
 * POST /api/runs - queue a run (SPEC C3).
 *
 * This handler is the HTTP boundary only: it parses and validates the request and
 * maps the outcome to a status code. The capability itself is
 * `src/core/run/queue.ts`, which `scripts/verify-live.ts` calls too - so the live
 * gate exercises the same code path this endpoint does rather than imitating it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  validateEnv('web')

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 },
    )
  }

  const { companyId, repetitions, targets } = parsed.data

  // A malformed id cannot match a row. Without this guard Prisma's uuid cast
  // throws out of the handler and the client gets a 500 - the same answer the
  // other three handlers on the company resource now give.
  if (!isCompanyId(companyId)) {
    return NextResponse.json({ error: 'Unknown company' }, { status: 404 })
  }

  const result = await queueRun({ prisma, companyId, repetitions, targets })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.reason === 'unknown-company' ? 404 : 400 },
    )
  }

  return NextResponse.json({ runId: result.runId, status: result.status }, { status: 201 })
}

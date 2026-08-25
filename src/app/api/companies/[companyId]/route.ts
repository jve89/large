import { NextResponse } from 'next/server'
import { z } from 'zod'
import { groupIntoSeries } from '../../../../lib/comparability.ts'
import { prisma } from '../../../../lib/db.ts'
import { validateEnv } from '../../../../lib/env.ts'
import { isCompanyId, normaliseNames, schemaErrorMessage } from '../route.ts'

export const dynamic = 'force-dynamic'

/**
 * Every field is optional, but a `name` that is present must not be empty — the
 * same rule as creation, because C1 states it for submission **and** editing.
 */
const patchSchema = z.object({
  name: z.string({ error: 'must be a string' }).trim().min(1, 'must not be empty').optional(),
  aliases: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
})

/** GET /api/companies/:companyId — the company with its prompts and its runs. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ companyId: string }> },
): Promise<NextResponse> {
  validateEnv('web')

  const { companyId } = await context.params

  // A malformed id cannot match a row; without this guard Prisma's uuid cast
  // throws out of the handler and the client gets a 500 instead of a 404.
  if (!isCompanyId(companyId)) {
    return NextResponse.json({ error: 'Unknown company' }, { status: 404 })
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      prompts: { orderBy: { order: 'asc' } },
      runs: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!company) {
    return NextResponse.json({ error: 'Unknown company' }, { status: 404 })
  }

  const { series, basisChanged } = groupIntoSeries(company.runs)

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      aliases: company.aliases,
      competitors: company.competitors,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    },
    prompts: company.prompts.map((p) => ({ id: p.id, text: p.text, order: p.order })),
    // basisHash is what the comparability guard (C11) compares runs on.
    runs: company.runs.map((run) => ({
      id: run.id,
      status: run.status,
      repetitions: run.repetitions,
      basisHash: run.basisHash,
      createdAt: run.createdAt,
      finishedAt: run.finishedAt,
    })),
    // C11. A client reading `runs` alone would have to re-derive which of them may
    // be compared; this states it, and `basisChanged` is the flag the capability's
    // "SHALL state that the measurement basis changed" hangs off.
    comparability: {
      basisChanged,
      series: series.map((group) => ({
        basisHash: group.basisHash,
        ordinal: group.ordinal,
        runIds: group.runs.map((run) => run.id),
      })),
    },
  })
}

/**
 * PATCH /api/companies/:companyId — edit name, aliases or competitors (SPEC C1).
 *
 * This **must not touch any existing run**. It cannot: a run holds its own
 * snapshot of the brand name, aliases and competitors taken at queue time, and
 * nothing here writes to Run, RunPrompt, RunTarget or Answer (CLAUDE.md rule 10).
 * Editing a company changes what the *next* run measures, never what a past run
 * measured.
 */
export async function PATCH(
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

  const parsed = patchSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: schemaErrorMessage(parsed.error) }, { status: 400 })
  }

  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Unknown company' }, { status: 404 })
  }

  const { name, aliases, competitors } = parsed.data

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(aliases !== undefined ? { aliases: normaliseNames(aliases) } : {}),
      ...(competitors !== undefined ? { competitors: normaliseNames(competitors) } : {}),
    },
    select: {
      id: true,
      name: true,
      aliases: true,
      competitors: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ company })
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../lib/db.ts'
import { validateEnv } from '../../../lib/env.ts'

export const dynamic = 'force-dynamic'

/**
 * Aliases and competitors are lists of names, normalised on the way in: Unicode
 * NFC, trimmed, blanks dropped, duplicates dropped case-insensitively.
 *
 * **Order is preserved**, and that matters: the first alias is the label a mention
 * is recorded under (src/core/parse/mentions.ts), so re-ordering the list is a
 * presentation choice the operator gets to make. Sorting here would take it away.
 */
export function normaliseNames(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.normalize('NFC').trim()
    if (!trimmed) continue
    const key = trimmed.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

const createSchema = z.object({
  name: z.string({ error: 'must be a string' }).trim().min(1, 'must not be empty'),
  aliases: z.array(z.string()).optional().default([]),
  competitors: z.array(z.string()).optional().default([]),
})

export function schemaErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')
}

const companyIdSchema = z.uuid()

/**
 * Every handler on the company resource guards its path parameter with this, so
 * that all of them answer a malformed id the same way: 404, "unknown company".
 *
 * Without it Prisma's uuid cast throws a PrismaClientKnownRequestError out of the
 * handler and Next renders an unhandled exception as a 500. It lives here rather
 * than in one route because the three handlers disagreeing about one bad input is
 * worse than any particular answer to it.
 */
export function isCompanyId(value: string): boolean {
  return companyIdSchema.safeParse(value).success
}

/** GET /api/companies — the list behind screen 1. */
export async function GET(): Promise<NextResponse> {
  validateEnv('web')

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { runs: true } } },
  })

  return NextResponse.json({
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      aliases: company.aliases,
      competitors: company.competitors,
      runCount: company._count.runs,
    })),
  })
}

/**
 * POST /api/companies — create a company (SPEC C1).
 *
 * IF the name is empty, the request is rejected and **nothing is persisted**. An
 * empty competitor list is valid: the run then measures presence and a position
 * of 1 of 1.
 */
export async function POST(request: Request): Promise<NextResponse> {
  validateEnv('web')

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: schemaErrorMessage(parsed.error) }, { status: 400 })
  }

  const company = await prisma.company.create({
    data: {
      name: parsed.data.name,
      aliases: normaliseNames(parsed.data.aliases),
      competitors: normaliseNames(parsed.data.competitors),
    },
    select: { id: true },
  })

  return NextResponse.json({ id: company.id }, { status: 201 })
}

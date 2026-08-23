import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../lib/db.ts'
import { DEFAULT_REPETITIONS, DEFAULT_TARGETS } from '../../../lib/defaults.ts'
import { validateEnv } from '../../../lib/env.ts'
import { basisHash } from '../../../lib/hash.ts'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  companyId: z.string().min(1),
  repetitions: z.coerce.number().int().min(1).max(50).default(DEFAULT_REPETITIONS),
  targets: z
    .array(
      z.object({
        provider: z.enum(['anthropic', 'openai']),
        modelId: z.string().min(1),
      }),
    )
    .min(1)
    .default([...DEFAULT_TARGETS]),
})

/**
 * Queues a run (SPEC C3).
 *
 * The run carries an **immutable snapshot** of the prompt texts, the target list,
 * the brand name, the aliases and the competitor list. Editing the company
 * afterwards must not change any existing run (CLAUDE.md rule 10) — which is why
 * RunPrompt is a copy and never a reference to Prompt.
 *
 * Returns without waiting for the measurement: the trigger is a database row, and
 * the worker claims it.
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

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { prompts: { orderBy: { order: 'asc' } } },
  })

  if (!company) {
    return NextResponse.json({ error: 'Unknown company' }, { status: 404 })
  }

  if (company.prompts.length === 0) {
    return NextResponse.json(
      { error: 'This company has no prompts; nothing would be measured.' },
      { status: 400 },
    )
  }

  const promptTexts = company.prompts.map((prompt) => prompt.text)

  // basisHash covers exactly four inputs. The brand NAME is snapshotted but not
  // hashed: renaming a company does not change what was measured, while changing
  // an alias does. N is excluded and displayed beside every figure instead.
  const hash = basisHash({
    prompts: promptTexts,
    targets,
    aliases: company.aliases,
    competitors: company.competitors,
  })

  const run = await prisma.run.create({
    data: {
      companyId: company.id,
      status: 'queued',
      repetitions,
      brandName: company.name,
      brandAliases: company.aliases,
      brandCompetitors: company.competitors,
      basisHash: hash,
      targets: {
        create: targets.map((target) => ({
          provider: target.provider,
          modelId: target.modelId,
        })),
      },
      prompts: {
        create: promptTexts.map((text, order) => ({ text, order })),
      },
    },
    select: { id: true, status: true },
  })

  return NextResponse.json({ runId: run.id, status: run.status }, { status: 201 })
}

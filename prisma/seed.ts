/**
 * Seed data for the walking skeleton.
 *
 * Phase 0's slice is "one route inserts a queued run" — singular. The company and
 * prompt a run needs therefore come from here rather than from a companies API,
 * which is Phase 1 and Phase 2 work.
 *
 * Idempotent: running it twice leaves one company with one prompt. It never
 * touches an existing run, because runs are immutable once queued (CLAUDE.md
 * rule 10).
 */
import path from 'node:path'

try {
  process.loadEnvFile(path.join(process.cwd(), '.env'))
} catch {
  // No .env on disk; fall through to the ambient environment.
}

const { prisma } = await import('../src/lib/db.ts')

const DEMO_COMPANY = 'Skeleton demo'
const DEMO_PROMPT = 'What are the best team chat tools for a small company?'

async function main(): Promise<void> {
  const existing = await prisma.company.findFirst({ where: { name: DEMO_COMPANY } })

  const company =
    existing ??
    (await prisma.company.create({
      data: {
        name: DEMO_COMPANY,
        aliases: ['Slack'],
        competitors: ['Microsoft Teams', 'Discord', 'Google Chat', 'Mattermost'],
      },
    }))

  // The prompt list is replaced wholesale, which is how a prompt list is saved
  // everywhere in this product.
  await prisma.prompt.deleteMany({ where: { companyId: company.id } })
  await prisma.prompt.create({
    data: { companyId: company.id, text: DEMO_PROMPT, order: 0 },
  })

  console.log(`Seeded company ${company.id} (${company.name}) with 1 prompt.`)
}

try {
  await main()
} finally {
  await prisma.$disconnect()
}

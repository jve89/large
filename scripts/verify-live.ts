/**
 * The live verification gate (SPEC C14).
 *
 * Performs one real end-to-end run of one prompt against both targets at N=1,
 * through the real queue, the real worker code, the real adapters and the real
 * parser. No fixture, no stub, no hard-coded answer anywhere on this path — that
 * is the entire point: an adapter that silently turned a web search error into an
 * answer with zero citations would pass every unit test and fail here.
 *
 * It costs two real provider calls each time it runs.
 *
 * Exits non-zero if a key is missing, if the run does not reach `completed`, if
 * fewer than two successful answers were stored, if any stored answer has no
 * citation, or if the parser produced no result.
 */
import path from 'node:path'

try {
  process.loadEnvFile(path.join(process.cwd(), '.env'))
} catch {
  // No .env on disk; fall through to the ambient environment (CI, Railway).
}

const { assertDatabaseMajorVersion, prisma } = await import('../src/lib/db.ts')
const { validateEnv } = await import('../src/lib/env.ts')
const { DEFAULT_TARGETS } = await import('../src/lib/defaults.ts')
const { basisHash } = await import('../src/lib/hash.ts')
const { processNextRun } = await import('../src/worker/index.ts')

const COMPANY_NAME = 'verify-live'
const PROMPT = 'What are the best team chat tools for a small company?'
const ALIASES = ['Slack']
const COMPETITORS = ['Microsoft Teams', 'Discord', 'Google Chat', 'Mattermost']

/** Wall-clock ceiling, so a hung provider fails the gate instead of hanging CI. */
const TIMEOUT_MS = 10 * 60 * 1000

const failures: string[] = []

function check(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok    ${message}`)
  } else {
    console.error(`  FAIL  ${message}`)
    failures.push(message)
  }
}

async function main(): Promise<void> {
  const env = validateEnv('script')
  await assertDatabaseMajorVersion()
  console.log('verify:live — environment and database version confirmed.')

  // One prompt, both targets, N=1.
  const company =
    (await prisma.company.findFirst({ where: { name: COMPANY_NAME } })) ??
    (await prisma.company.create({
      data: { name: COMPANY_NAME, aliases: ALIASES, competitors: COMPETITORS },
    }))

  await prisma.company.update({
    where: { id: company.id },
    data: { aliases: ALIASES, competitors: COMPETITORS },
  })
  await prisma.prompt.deleteMany({ where: { companyId: company.id } })
  await prisma.prompt.create({ data: { companyId: company.id, text: PROMPT, order: 0 } })

  const targets = [...DEFAULT_TARGETS]

  const run = await prisma.run.create({
    data: {
      companyId: company.id,
      status: 'queued',
      repetitions: 1,
      brandName: company.name,
      brandAliases: ALIASES,
      brandCompetitors: COMPETITORS,
      basisHash: basisHash({
        prompts: [PROMPT],
        targets,
        aliases: ALIASES,
        competitors: COMPETITORS,
      }),
      targets: {
        create: targets.map((t) => ({ provider: t.provider, modelId: t.modelId })),
      },
      prompts: { create: [{ text: PROMPT, order: 0 }] },
    },
    select: { id: true },
  })

  console.log(`verify:live — queued run ${run.id}; ${targets.length} targets at N=1.`)
  console.log('verify:live — this spends real provider calls.')

  const deadline = Date.now() + TIMEOUT_MS
  let finalStatus: string | null = null

  while (Date.now() < deadline) {
    const processed = await processNextRun({
      prisma,
      credentials: {
        anthropicApiKey: env.ANTHROPIC_API_KEY!,
        openaiApiKey: env.OPENAI_API_KEY!,
      },
      concurrencyPerProvider: env.PROVIDER_CONCURRENCY,
      coverageThreshold: env.COVERAGE_THRESHOLD,
      staleRunSeconds: env.STALE_RUN_SECONDS,
      maxReclaims: env.MAX_RECLAIMS,
    })

    if (processed?.runId === run.id) {
      finalStatus = processed.status
      break
    }
    if (!processed) await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log('\nverify:live — assertions:')

  check(finalStatus !== null, 'the run reached a terminal status before the timeout')
  check(finalStatus === 'completed', `the run completed (was: ${finalStatus ?? 'unfinished'})`)

  const answers = await prisma.answer.findMany({
    where: { runId: run.id },
    include: { citations: true, mentions: true },
  })

  const successful = answers.filter((a) => a.status === 'ok')

  check(
    successful.length >= 2,
    `at least two successful answers were stored (got ${successful.length} of ${answers.length})`,
  )

  const withoutCitations = successful.filter((a) => a.citations.length === 0)
  check(
    successful.length > 0 && withoutCitations.length === 0,
    `every successful answer carries at least one citation (${withoutCitations.length} without)`,
  )

  // "The parser produced a result" — at least one recognised brand was found
  // somewhere in the run. With five well-known chat tools in the basis, a run
  // where none appears means the parser is broken, not that the answer was odd.
  const totalMentions = successful.reduce((sum, a) => sum + a.mentions.length, 0)
  check(totalMentions > 0, `the parser produced a mention result (${totalMentions} mentions)`)

  for (const answer of answers) {
    const target = await prisma.runTarget.findUnique({ where: { id: answer.runTargetId } })
    console.log(
      `        ${target?.provider}:${target?.modelId} — ${answer.status}` +
        (answer.status === 'ok'
          ? ` · ${answer.citations.length} citations · ${answer.mentions.length} mentions` +
            ` · ${answer.searchCount ?? 0} searches · ${answer.costMicros ?? 0n} micro-dollars` +
            ` · ${answer.latencyMs ?? 0}ms`
          : ` · ${answer.failureReason ?? 'no reason recorded'}`),
    )
  }

  if (failures.length > 0) {
    console.error(`\nverify:live FAILED — ${failures.length} assertion(s) did not hold.`)
    process.exitCode = 1
    return
  }

  console.log('\nverify:live passed.')
}

try {
  await main()
} catch (error) {
  console.error('verify:live FAILED with an error:', error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}

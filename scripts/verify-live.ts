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
 * fewer than two successful answers were stored, if an answer that **ran a web
 * search** carries no citation, if **no** successful answer carries one, or if the
 * parser produced no result.
 *
 * *The citation assertion was weakened deliberately on 2026-08-28 and the reason
 * is at the assertion itself: Phase 9 produced 11 successful answers with no
 * citations at all, none of which was a defect.*
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
const { queueRun } = await import('../src/core/run/queue.ts')
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

  // Queued through the same function POST /api/runs calls (SPEC C3). The gate has
  // to go through the real queue rather than insert its own row: a gate that
  // imitates the code path it is meant to prove can only ever pass.
  const queued = await queueRun({
    prisma,
    companyId: company.id,
    repetitions: 1,
    targets,
  })

  if (!queued.ok) {
    throw new Error(`verify:live could not queue a run: ${queued.message}`)
  }
  const run = { id: queued.runId }

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

  // What this gate is for: an adapter that silently turned a web search error into
  // a successful answer with zero citations. Until 2026-08-28 the assertion was
  // "every successful answer carries at least one citation", and Phase 9 falsified
  // it - **11 of 354 successful answers legitimately carried none**, every one a
  // complete answer a model gave from its own knowledge without searching at all
  // (`PHASE-9.md` -> 22.1). The gate had never failed on one only because its
  // single prompt happens to provoke a search every time, which is luck rather
  // than design, and a gate that can fail with no defect present is eventually
  // "fixed" by weakening something real.
  //
  // Two assertions replace it, and between them they cover the failure mode
  // without asserting anything reality has contradicted.
  const searched = successful.filter((a) => (a.searchCount ?? 0) > 0)
  const searchedWithoutCitations = searched.filter((a) => a.citations.length === 0)

  // 1. A search that ran and produced no citable source is the exact signature of
  //    the defect: the adapter reported a successful answer where the provider had
  //    returned a search error. An answer that never searched is not this.
  check(
    searchedWithoutCitations.length === 0,
    `every successful answer that ran a web search carries a citation ` +
      `(${searched.length} searched, ${searchedWithoutCitations.length} of them without)`,
  )

  // 2. ...and the pipeline actually stores citations end to end, which assertion 1
  //    alone would satisfy vacuously if every answer happened to search zero times.
  const withCitations = successful.filter((a) => a.citations.length > 0)
  check(
    withCitations.length > 0,
    `at least one successful answer carries a citation ` +
      `(${withCitations.length} of ${successful.length})`,
  )

  // Reported, never asserted on: a successful answer with no searches and no
  // citations is a real and legitimate result, and the count is worth seeing.
  const unsearched = successful.length - searched.length
  if (unsearched > 0) {
    console.log(
      `        note: ${unsearched} successful answer(s) ran no web search — ` +
        'answered from the model\'s own knowledge, which is legitimate and not asserted on',
    )
  }

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

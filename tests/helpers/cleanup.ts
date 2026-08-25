/**
 * The one place that knows how to remove a test company.
 *
 * It exists because getting it wrong is silent and its residue is indistinguishable
 * from a real defect. `Run.companyId` is `ON DELETE RESTRICT`, so deleting a
 * company that has runs throws `23001` and leaves everything behind; everything
 * else - prompts, targets, answers, citations, mentions - cascades. A teardown
 * that deletes the company first therefore fails *after* the tests have passed,
 * where a failing teardown reads as noise rather than as data loss.
 *
 * On 2026-08-25 a throwaway experiment did exactly that. It left two `failed` runs
 * whose reason was "no target reached the coverage threshold" - the precise
 * signature the shutdown-defect audit had just been written to look for. A
 * detector its own fixtures trigger is not a detector, so the fix is not to
 * remember the order but to have one function that cannot get it wrong.
 *
 * `sweepByPrefix` is the stronger form and is what new files should use: it
 * removes every company whose name starts with the prefix, so residue from an
 * earlier crashed run of the same file is cleared on the next one rather than
 * accumulating. Teardown becomes idempotent and self-healing.
 */
import type { PrismaClient } from '@prisma/client'

/** Removes these companies and their runs, in the order the constraints require. */
export async function deleteCompanies(
  prisma: PrismaClient,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return
  const where = { companyId: { in: [...ids] } }
  await prisma.run.deleteMany({ where })
  await prisma.prompt.deleteMany({ where })
  await prisma.company.deleteMany({ where: { id: { in: [...ids] } } })
}

/**
 * Removes every company whose name starts with `prefix`, and their runs.
 *
 * Prefer this to `deleteCompanies` in a new test file: it does not depend on the
 * file having tracked what it created, so a run that crashed before its teardown
 * leaves nothing for the next run - or for an audit - to trip over.
 */
export async function sweepByPrefix(prisma: PrismaClient, prefix: string): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  })
  await deleteCompanies(
    prisma,
    companies.map((company) => company.id),
  )
}

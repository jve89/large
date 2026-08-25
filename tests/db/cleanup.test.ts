/**
 * The teardown helper, driven against the constraint that broke.
 *
 * `Run.companyId` is `ON DELETE RESTRICT`. Deleting a company that still has runs
 * raises `23001` and removes nothing, and because that happens in an `afterAll` it
 * surfaces as a noisy teardown rather than as data left behind. On 2026-08-25 a
 * throwaway experiment did exactly that and left two `failed` runs carrying
 * "no target reached the coverage threshold" - the exact signature the audit for
 * the shutdown defect had just been written to look for.
 *
 * So this asserts both halves: the helper removes a company that has runs, and the
 * naive order it replaces still throws. The second is the one that matters - it is
 * what stops someone "simplifying" the helper back into the bug.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { prisma } from '../../src/lib/db.ts'
import { sweepByPrefix } from '../helpers/cleanup.ts'

const PREFIX = `test-cleanup-${process.pid}-`

async function companyWithARun(name: string): Promise<string> {
  const company = await prisma.company.create({
    data: { name: `${PREFIX}${name}`, aliases: ['Acme'], competitors: [] },
  })
  await prisma.run.create({
    data: {
      companyId: company.id,
      status: 'completed',
      repetitions: 1,
      brandName: `${PREFIX}${name}`,
      basisHash: `cleanup-${Math.random().toString(36).slice(2)}`,
      prompts: { create: [{ text: 'p', order: 0 }] },
      targets: { create: [{ provider: 'anthropic', modelId: 'claude-sonnet-5' }] },
    },
  })
  return company.id
}

afterAll(async () => {
  await sweepByPrefix(prisma, PREFIX)
  await prisma.$disconnect()
})

describe('sweepByPrefix', () => {
  it('removes a company that still has runs', async () => {
    const id = await companyWithARun('has-runs')
    expect(await prisma.run.count({ where: { companyId: id } })).toBe(1)

    await sweepByPrefix(prisma, PREFIX)

    expect(await prisma.company.count({ where: { id } })).toBe(0)
    expect(await prisma.run.count({ where: { companyId: id } })).toBe(0)
  })

  it('is idempotent, so residue from a crashed earlier run is cleared', async () => {
    await companyWithARun('crashed-once')
    await sweepByPrefix(prisma, PREFIX)
    // The second call is the one a later run of the same file makes.
    await expect(sweepByPrefix(prisma, PREFIX)).resolves.toBeUndefined()
    expect(await prisma.company.count({ where: { name: { startsWith: PREFIX } } })).toBe(0)
  })

  it('deleting the company first still throws, which is why the helper exists', async () => {
    const id = await companyWithARun('naive-order')

    await expect(prisma.company.delete({ where: { id } })).rejects.toThrow()

    // Nothing was removed by the failed attempt.
    expect(await prisma.company.count({ where: { id } })).toBe(1)
    await sweepByPrefix(prisma, PREFIX)
  })
})

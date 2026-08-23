import Link from 'next/link'
import { prisma } from '../../lib/db.ts'

// Data is per-request; nothing here is static.
export const dynamic = 'force-dynamic'

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { runs: true, prompts: true } } },
  })

  return (
    <main>
      <h1 className="text-2xl font-semibold">Companies</h1>

      {companies.length === 0 ? (
        <p className="mt-6 text-neutral-600">
          No companies yet. Phase 1 adds the create form; for now the skeleton demo
          company comes from <code className="font-mono">npm run db:seed</code>.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
          {companies.map((company) => (
            <li key={company.id} className="py-3">
              <Link
                href={`/companies/${company.id}`}
                className="font-medium underline underline-offset-4"
              >
                {company.name}
              </Link>
              <span className="ml-3 text-sm text-neutral-600">
                {company._count.prompts} prompts · {company._count.runs} runs
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

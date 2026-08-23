import Link from 'next/link'
import { CompanyForm } from '../../components/company-form.tsx'
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

      <section className="mt-8">
        <h2 className="text-lg font-medium">Add a company</h2>
        <CompanyForm />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">
          {companies.length === 0 ? 'No companies yet' : 'Companies'}
        </h2>

        {companies.length === 0 ? (
          <p className="mt-2 text-neutral-600">
            Add one above to get started.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-200 border-y border-neutral-200">
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
                {company.aliases.length > 0 ? (
                  <p className="mt-1 text-sm text-neutral-600">
                    Aliases: {company.aliases.join(', ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StartRunDialog } from '../../../components/start-run-dialog.tsx'
import { prisma } from '../../../lib/db.ts'

export const dynamic = 'force-dynamic'

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      prompts: { orderBy: { order: 'asc' } },
      runs: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!company) notFound()

  return (
    <main>
      <Link href="/companies" className="text-sm underline underline-offset-4">
        ← Companies
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{company.name}</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Aliases: {company.aliases.join(', ') || '—'} · Competitors:{' '}
        {company.competitors.join(', ') || '—'}
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Prompts</h2>
        {company.prompts.length === 0 ? (
          <p className="mt-2 text-neutral-600">
            No prompts. A run cannot be started without at least one.
          </p>
        ) : (
          <ol className="mt-2 list-decimal space-y-1 pl-6">
            {company.prompts.map((prompt) => (
              <li key={prompt.id}>{prompt.text}</li>
            ))}
          </ol>
        )}
        {company.prompts.length > 0 ? <StartRunDialog companyId={company.id} /> : null}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Runs</h2>
        {company.runs.length === 0 ? (
          <p className="mt-2 text-neutral-600">No runs yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-200 border-y border-neutral-200">
            {company.runs.map((run) => (
              <li key={run.id} className="flex items-baseline justify-between py-3">
                <Link href={`/runs/${run.id}`} className="underline underline-offset-4">
                  {run.createdAt.toISOString()}
                </Link>
                <span className="text-sm text-neutral-600">
                  {run.status} · N={run.repetitions} · basis {run.basisHash.slice(0, 12)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

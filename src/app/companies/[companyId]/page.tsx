import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CompanyForm } from '../../../components/company-form.tsx'
import { PromptEditor } from '../../../components/prompt-editor.tsx'
import { StartRunDialog } from '../../../components/start-run-dialog.tsx'
import { groupIntoSeries } from '../../../lib/comparability.ts'
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

  // C11's surface. Four rows descending by date read as a series whether or not
  // anything calls them one; this is what stops them being read as a single line
  // when they were not measuring the same thing.
  const { series, basisChanged } = groupIntoSeries(company.runs)

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

      <details className="mt-4">
        <summary className="cursor-pointer text-sm underline underline-offset-4">
          Edit name, aliases or competitors
        </summary>
        <CompanyForm
          company={{
            id: company.id,
            name: company.name,
            aliases: company.aliases,
            competitors: company.competitors,
            website: company.website,
          }}
        />
      </details>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Prompts</h2>
        {company.prompts.length === 0 ? (
          <p className="mt-2 text-neutral-600">
            No prompts. A run cannot be started without at least one.
          </p>
        ) : null}
        <PromptEditor
          companyId={company.id}
          prompts={company.prompts.map((prompt) => prompt.text)}
        />
        {company.prompts.length > 0 ? (
          <StartRunDialog companyId={company.id} promptCount={company.prompts.length} />
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Runs</h2>
        {company.runs.length === 0 ? (
          <p className="mt-2 text-neutral-600">No runs yet.</p>
        ) : (
          <>
            {basisChanged ? (
              <p data-basis-changed className="mt-2 text-sm text-amber-700">
                The measurement basis changed. These {company.runs.length} runs were
                measured on {series.length} different bases and are{' '}
                <span className="font-medium">not one series</span>: a figure from one
                group cannot be compared with a figure from another, because they did not
                ask the same questions of the same targets about the same names. Each
                group below is internally comparable.
              </p>
            ) : (
              <p data-basis-changed="false" className="mt-2 text-sm text-neutral-600">
                All {company.runs.length} run{company.runs.length === 1 ? '' : 's'} share one
                measurement basis and are comparable with each other.
              </p>
            )}

            {series.map((group) => (
              <div key={group.basisHash} data-series={group.basisHash} className="mt-4">
                <p className="text-sm font-medium">
                  Series {group.ordinal} of {series.length} · basis{' '}
                  <code className="font-mono">{group.basisHash.slice(0, 12)}</code> ·{' '}
                  {group.runs.length} run{group.runs.length === 1 ? '' : 's'}
                </p>
                <ul className="mt-1 divide-y divide-neutral-200 border-y border-neutral-200">
                  {group.runs.map((run) => (
                    <li key={run.id} className="flex items-baseline justify-between py-3">
                      <Link href={`/runs/${run.id}`} className="underline underline-offset-4">
                        {run.createdAt.toISOString()}
                      </Link>
                      <span className="text-sm text-neutral-600">
                        {run.status} · N={run.repetitions}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </section>
    </main>
  )
}

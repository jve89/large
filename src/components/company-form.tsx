'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Create or edit a company (SPEC C1).
 *
 * Aliases and competitors are entered one per line rather than comma-separated,
 * because a brand name may contain a comma and never contains a newline.
 *
 * Editing here cannot disturb an existing run: a run carries its own snapshot of
 * the brand name, aliases and competitors, taken when it was queued. The form
 * says so, because the operator needs to know that fixing a typo does not
 * retroactively change a measurement he has already shown a client.
 */
export interface CompanyFormValues {
  readonly id?: string
  readonly name: string
  readonly aliases: readonly string[]
  readonly competitors: readonly string[]
  /** The client's own site. Optional; absent means "not recorded" (Phase 13). */
  readonly website?: string | null
}

function toLines(values: readonly string[]): string {
  return values.join('\n')
}

function fromLines(value: string): string[] {
  return value.split('\n')
}

export function CompanyForm({
  company,
  onDone,
}: {
  company?: CompanyFormValues
  onDone?: () => void
}) {
  const router = useRouter()
  const isEdit = Boolean(company?.id)

  const [name, setName] = useState(company?.name ?? '')
  const [aliases, setAliases] = useState(toLines(company?.aliases ?? []))
  const [competitors, setCompetitors] = useState(toLines(company?.competitors ?? []))
  const [website, setWebsite] = useState(company?.website ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const body = JSON.stringify({
      name,
      aliases: fromLines(aliases),
      competitors: fromLines(competitors),
      website,
    })

    try {
      const response = await fetch(
        isEdit ? `/api/companies/${company?.id}` : '/api/companies',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body,
        },
      )
      const payload: unknown = await response.json()

      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : `Request failed with ${response.status}`
        throw new Error(message)
      }

      if (!isEdit) {
        setName('')
        setAliases('')
        setCompetitors('')
        setWebsite('')
      }
      onDone?.()
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <label htmlFor="company-name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="company-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          placeholder="Acme Ltd"
        />
      </div>

      <div>
        <label htmlFor="company-website" className="block text-sm font-medium">
          Website <span className="font-normal text-neutral-600">(optional)</span>
        </label>
        <input
          id="company-website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          placeholder="acme.nl"
        />
        <p className="mt-1 text-xs text-neutral-600">
          Used only to mark which cited sources are the client&rsquo;s own. It is not
          part of the measurement basis, so adding or changing it never breaks a
          series &mdash; but the marking is applied when a run is read, so it marks
          against whatever is recorded here now. Enter the apex:{' '}
          <span className="font-mono">acme.nl</span> also marks{' '}
          <span className="font-mono">shop.acme.nl</span>, while{' '}
          <span className="font-mono">blog.acme.nl</span> marks only itself.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="company-aliases" className="block text-sm font-medium">
            Brand aliases <span className="font-normal text-neutral-600">(one per line)</span>
          </label>
          <textarea
            id="company-aliases"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-neutral-600">
            Every spelling the brand is named by. The first one labels its mentions.
            There is no stemming: add &ldquo;Acmes&rdquo; yourself if you want the
            plural counted.
          </p>
        </div>

        <div>
          <label htmlFor="company-competitors" className="block text-sm font-medium">
            Competitors <span className="font-normal text-neutral-600">(one per line)</span>
          </label>
          <textarea
            id="company-competitors"
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-neutral-600">
            Leaving this empty is valid; the run then measures presence and a
            position of 1 of 1.
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded border border-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add company'}
        </button>
        {isEdit ? (
          <span className="text-xs text-neutral-600">
            Existing runs are unaffected — each one measured against its own snapshot.
          </span>
        ) : null}
      </div>
    </form>
  )
}

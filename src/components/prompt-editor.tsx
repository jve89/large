'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * The prompt list, one prompt per line (SPEC C2).
 *
 * One per line rather than comma-separated, for the same reason the alias field
 * is: a buying-moment prompt frequently contains a comma and never contains a
 * newline.
 *
 * Two things come back from a save and both are shown rather than swallowed:
 * the de-duplication report, which names the specific lines that were removed,
 * and the over-50 call-count warning. Either can appear alone; both can appear
 * at once. After a save the textarea is reset to the list that was actually
 * stored, so what is on screen is what a run would send - never what was typed.
 */
export function PromptEditor({
  companyId,
  prompts,
}: {
  companyId: string
  prompts: readonly string[]
}) {
  const router = useRouter()

  const [text, setText] = useState(prompts.join('\n'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const lineCount = text.split('\n').filter((line) => line.trim().length > 0).length

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    setWarning(null)
    setSaved(null)

    try {
      const response = await fetch(`/api/companies/${companyId}/prompts`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompts: text.split('\n') }),
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : `Request failed with ${response.status}`
        throw new Error(message)
      }

      const body = payload as {
        count: number
        prompts: string[]
        notice?: string
        warning?: string
      }

      // Show what was stored, not what was typed: blank lines are gone and
      // duplicates have been removed, and the operator needs to see that.
      setText(body.prompts.join('\n'))
      setSaved(
        body.count === 1 ? '1 prompt saved.' : `${body.count} prompts saved.`,
      )
      setNotice(body.notice ?? null)
      setWarning(body.warning ?? null)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div>
        <label htmlFor="prompt-list" className="block text-sm font-medium">
          Prompts <span className="font-normal text-neutral-600">(one per line)</span>
        </label>
        <textarea
          id="prompt-list"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 font-mono text-sm"
          placeholder={'Who is the best plumber in Utrecht?\nWhich plumbers do emergency call-outs in Utrecht?'}
        />
        <p className="mt-1 text-xs text-neutral-600">
          {lineCount === 1 ? '1 non-empty line' : `${lineCount} non-empty lines`}. Saving
          replaces the whole list. Blank lines are dropped and identical lines are
          stored once. Existing runs are unaffected — each measured its own copy.
        </p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="text-sm text-neutral-900">{saved}</p> : null}
      {notice ? (
        <p className="rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
          {notice}
        </p>
      ) : null}
      {warning ? (
        <p className="rounded border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warning}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded border border-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save prompt list'}
      </button>
    </form>
  )
}

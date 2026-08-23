/**
 * Citation normalisation (SPEC C7).
 *
 * A brand that appears only in a citation is **not** a mention — matching happens
 * on visible text only. Citations are stored for their own sake: which sources the
 * model cited when it answered.
 *
 * The provider-specific detection of a web search **error object** lives in each
 * adapter, because only the adapter knows its provider's response shape. What
 * lives here is the consequence: an attempt that produced an error object is
 * `{ ok: false }` and is never an answer that happens to carry zero citations.
 */
import type { ProviderCitation } from '../providers/types.ts'

export interface RawCitation {
  readonly url?: string | null
  readonly title?: string | null
}

function normaliseUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    // A trailing hash is noise for "which source was cited"; a query string is not.
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Normalises and de-duplicates the citations of one answer, preserving the order
 * in which the provider first reported each source.
 */
export function normaliseCitations(raw: readonly RawCitation[]): ProviderCitation[] {
  const seen = new Set<string>()
  const out: ProviderCitation[] = []

  for (const entry of raw) {
    if (!entry?.url) continue
    const url = normaliseUrl(entry.url)
    if (!url || seen.has(url)) continue
    seen.add(url)
    const title = entry.title?.trim()
    out.push({ url, title: title ? title : null })
  }

  return out
}

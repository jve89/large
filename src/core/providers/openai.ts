/**
 * OpenAI adapter (Responses API).
 *
 * Sends the prompt unmodified with the server-side `web_search` tool enabled: no
 * system prompt, no sampling parameters, no length instruction.
 * `max_output_tokens` is the only other parameter and exists solely so an answer
 * is never truncated.
 *
 * All prices come from pricing.ts. Nothing here inlines a rate.
 */
import OpenAI from 'openai'
import { normaliseCitations, type RawCitation } from '../parse/citations.ts'
import { captureProviderResponse, logFailureEvidence } from './capture.ts'
import { costMicrosFor } from './pricing.ts'
import { MAX_OUTPUT_TOKENS, type ProviderAdapter, type ProviderResult } from './types.ts'

function isRetryableHttpStatus(status: number | undefined): boolean {
  return status === 408 || status === 429 || (status !== undefined && status >= 500)
}

/**
 * Turns a completed OpenAI `Response` into a `ProviderResult`.
 *
 * **Pure, and separate from the SDK call on purpose** - see the matching note in
 * anthropic.ts. The transport half of `ask()` keeps the request, the error handling
 * and the latency clock; this half interprets what came back, so a stored response
 * can be replayed through it without an HTTP request.
 */
export function interpretOpenAiResponse(
  response: OpenAI.Responses.Response,
  modelId: string,
  latencyMs: number,
): ProviderResult {
  let searchCount = 0
  let text = ''
  const rawCitations: RawCitation[] = []

  for (const item of response.output) {
    if (item.type === 'web_search_call') {
      searchCount += 1
      // A search that did not complete is a search failure, not an answer that
      // happens to carry no citations (SPEC C7, CLAUDE.md rule 8).
      if (item.status !== 'completed') {
        return {
          ok: false,
          reason: `web search failed: status ${item.status}`,
          retryable: item.status === 'in_progress' || item.status === 'searching',
        }
      }
      continue
    }

    if (item.type !== 'message') continue
    for (const part of item.content) {
      if (part.type !== 'output_text') continue
      text += part.text
      for (const annotation of part.annotations ?? []) {
        if (annotation.type !== 'url_citation') continue
        rawCitations.push({ url: annotation.url, title: annotation.title })
      }
    }
  }

  // A truncated answer can cut off a brand, which would then be counted as not
  // mentioned. It is a failed attempt, never a successful one.
  if (response.status === 'incomplete') {
    const reason = response.incomplete_details?.reason ?? 'unknown'
    return { ok: false, reason: `answer incomplete: ${reason}`, retryable: false }
  }

  if (response.status !== 'completed') {
    return {
      ok: false,
      reason: `response status ${response.status ?? 'unknown'}`,
      retryable: response.status === 'in_progress' || response.status === 'queued',
    }
  }

  const usage = {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    searchCount,
  }

  return {
    ok: true,
    text,
    citations: normaliseCitations(rawCitations),
    usage,
    costMicros: costMicrosFor({ provider: 'openai', modelId }, usage),
    latencyMs,
  }
}

export function createOpenAiAdapter(modelId: string, apiKey: string): ProviderAdapter {
  const client = new OpenAI({ apiKey, maxRetries: 0 })

  return {
    provider: 'openai',
    modelId,

    async ask(prompt: string, signal: AbortSignal): Promise<ProviderResult> {
      const startedAt = Date.now()

      let response: OpenAI.Responses.Response
      try {
        response = await client.responses.create(
          {
            model: modelId,
            input: prompt,
            max_output_tokens: MAX_OUTPUT_TOKENS,
            tools: [{ type: 'web_search' }],
          },
          { signal },
        )
      } catch (error) {
        const status = error instanceof OpenAI.APIError ? error.status : undefined
        return {
          ok: false,
          reason: `openai request failed${status ? ` (HTTP ${status})` : ''}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          retryable: isRetryableHttpStatus(status) || !(error instanceof OpenAI.APIError),
        }
      }

      const latencyMs = Date.now() - startedAt

      captureProviderResponse('openai', modelId, response)

      const result = interpretOpenAiResponse(response, modelId, latencyMs)

      // The interpret function above is pure. Evidence logging lives here, on the
      // transport side, because nothing in the data model retains a raw provider
      // response - a failed Answer stores only a short reason - so without this the
      // first real search error in production would leave nothing to build an
      // observed fixture from. Retaining it properly needs a column, and that is a
      // stop-and-ask.
      if (!result.ok) logFailureEvidence('openai', modelId, result.reason, response)

      return result
    },
  }
}

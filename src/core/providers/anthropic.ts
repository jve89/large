/**
 * Anthropic adapter.
 *
 * Sends the prompt unmodified with the server-side web search tool enabled: no
 * system prompt, no temperature or top_p, no length instruction. `max_tokens` is
 * the only other parameter and exists solely so an answer is never truncated.
 *
 * `allowed_callers: ['direct']` turns off dynamic filtering, which
 * `web_search_20260209` would otherwise apply by default. Dynamic filtering has
 * Claude write and run code to filter search results before they reach its
 * context; OpenAI has no equivalent, so leaving it on would measure the two
 * targets differently and make them incomparable.
 *
 * All prices come from pricing.ts. Nothing here inlines a rate.
 */
import Anthropic from '@anthropic-ai/sdk'
import { normaliseCitations, type RawCitation } from '../parse/citations.ts'
import { captureProviderResponse, logFailureEvidence } from './capture.ts'
import { costMicrosFor } from './pricing.ts'
import { MAX_OUTPUT_TOKENS, type ProviderAdapter, type ProviderResult } from './types.ts'

/** Confirmed against the tool documentation (as researched 2026-08-23; re-check, don't trust). */
export const ANTHROPIC_WEB_SEARCH_TOOL = 'web_search_20260209' as const

/**
 * Search error codes that reflect a transient condition rather than a bad request.
 * Everything else is permanent: retrying it would spend money for the same answer.
 */
const RETRYABLE_SEARCH_ERRORS = new Set(['too_many_requests', 'unavailable'])

/** HTTP statuses worth another attempt: rate limit, timeout, 5xx (SPEC C6). */
function isRetryableHttpStatus(status: number | undefined): boolean {
  return status === 408 || status === 429 || (status !== undefined && status >= 500)
}

/**
 * Turns a completed Anthropic `Message` into a `ProviderResult`.
 *
 * **Pure, and separate from the SDK call on purpose.** The transport half of
 * `ask()` keeps the request, the error handling and the latency clock; everything
 * that *interprets* what came back lives here, so a stored response can be replayed
 * through it without an HTTP request. Before this split there was no door a fixture
 * could come through, and `tests/fixtures/` sat empty while the most important rule
 * in the pack - rule 8, a search error is not an empty result - was checked only by
 * the live gate.
 */
export function interpretAnthropicMessage(
  message: Anthropic.Messages.Message,
  modelId: string,
  latencyMs: number,
): ProviderResult {
  // A web search error arrives as HTTP 200 with an error object in place of the
  // result list. An adapter that only caught exceptions would record this as a
  // successful answer with zero citations (SPEC C7, CLAUDE.md rule 8).
  for (const block of message.content) {
    if (block.type !== 'web_search_tool_result') continue
    const content: unknown = block.content
    if (
      typeof content === 'object' &&
      content !== null &&
      !Array.isArray(content) &&
      (content as { type?: unknown }).type === 'web_search_tool_result_error'
    ) {
      const code = String((content as { error_code?: unknown }).error_code ?? 'unknown')
      return {
        ok: false,
        reason: `web search failed: ${code}`,
        retryable: RETRYABLE_SEARCH_ERRORS.has(code),
      }
    }
  }

  // A truncated answer can cut off a brand, which would then be counted as not
  // mentioned. It is a failed attempt, never a successful one.
  if (message.stop_reason === 'max_tokens') {
    return {
      ok: false,
      reason: `answer truncated at max_tokens (${MAX_OUTPUT_TOKENS})`,
      retryable: false,
    }
  }

  // The turn was paused mid-search and would need to be continued. Phase 0 does
  // not continue turns, so the answer is incomplete and must not be measured.
  if (message.stop_reason === 'pause_turn') {
    return { ok: false, reason: 'provider paused the turn before completing', retryable: true }
  }

  let text = ''
  const rawCitations: RawCitation[] = []

  for (const block of message.content) {
    if (block.type !== 'text') continue
    text += block.text
    for (const citation of block.citations ?? []) {
      if (citation.type !== 'web_search_result_location') continue
      rawCitations.push({ url: citation.url, title: citation.title })
    }
  }

  const usage = {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    searchCount: message.usage.server_tool_use?.web_search_requests ?? 0,
  }

  return {
    ok: true,
    text,
    citations: normaliseCitations(rawCitations),
    usage,
    costMicros: costMicrosFor({ provider: 'anthropic', modelId }, usage),
    latencyMs,
  }
}

export function createAnthropicAdapter(modelId: string, apiKey: string): ProviderAdapter {
  const client = new Anthropic({ apiKey, maxRetries: 0 })

  return {
    provider: 'anthropic',
    modelId,

    async ask(prompt: string, signal: AbortSignal): Promise<ProviderResult> {
      const startedAt = Date.now()

      let message: Anthropic.Messages.Message
      try {
        // Streamed, then reassembled. `max_tokens` is deliberately the model's
        // maximum so an answer is never truncated, and at that ceiling the SDK
        // refuses a non-streaming request because it could exceed ten minutes.
        // Streaming costs exactly the same; `finalMessage()` returns the same
        // assembled Message shape a non-streaming call would have returned, so
        // nothing below this line has to know the difference.
        message = await client.messages
          .stream(
            {
              model: modelId,
              max_tokens: MAX_OUTPUT_TOKENS,
              messages: [{ role: 'user', content: prompt }],
              tools: [
                {
                  type: ANTHROPIC_WEB_SEARCH_TOOL,
                  name: 'web_search',
                  allowed_callers: ['direct'],
                },
              ],
            },
            { signal },
          )
          .finalMessage()
      } catch (error) {
        const status = error instanceof Anthropic.APIError ? error.status : undefined
        return {
          ok: false,
          reason: `anthropic request failed${status ? ` (HTTP ${status})` : ''}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          retryable: isRetryableHttpStatus(status) || !(error instanceof Anthropic.APIError),
        }
      }

      const latencyMs = Date.now() - startedAt

      captureProviderResponse('anthropic', modelId, message)

      const result = interpretAnthropicMessage(message, modelId, latencyMs)

      // The interpret function above is pure. Evidence logging lives here, on the
      // transport side, because nothing in the data model retains a raw provider
      // response - a failed Answer stores only a short reason - so without this the
      // first real search error in production would leave nothing to build an
      // observed fixture from. Retaining it properly needs a column, and that is a
      // stop-and-ask.
      if (!result.ok) logFailureEvidence('anthropic', modelId, result.reason, message)

      return result
    },
  }
}

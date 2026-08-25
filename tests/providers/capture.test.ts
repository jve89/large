/**
 * The capture facility and the failure-evidence log.
 *
 * These exist because of a gap in the data model, not a gap in the code: a failed
 * `Answer` stores `failureReason`, a short string, and nothing of the raw provider
 * response. Without evidence in the log, the first real web-search error this
 * system ever sees in production would teach us nothing, and every error fixture
 * in tests/fixtures/ would stay `documented` rather than becoming `observed`.
 * Retaining the response properly needs a column, and that is a stop-and-ask.
 *
 * **Scope, stated plainly.** `logFailureEvidence` is wired into the *interpret*
 * side of each adapter - the failures that arrive as a well-formed HTTP 200 whose
 * body says the search failed, which are exactly the ones a fixture could be built
 * from. A transport failure (a 401, a timeout) is thrown by the SDK and caught
 * before interpretation, and has no response body to retain; its exception message
 * is already the whole of the evidence and is stored as the answer's
 * `failureReason`.
 */
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  captureProviderResponse,
  isCaptureEnabled,
  logFailureEvidence,
} from '../../src/core/providers/capture.ts'

const dirs: string[] = []

function withCaptureDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'large-capture-'))
  dirs.push(dir)
  process.env.PROVIDER_CAPTURE_DIR = dir
  return dir
}

afterEach(() => {
  delete process.env.PROVIDER_CAPTURE_DIR
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe('capture mode is off unless asked for', () => {
  it('reports disabled and writes nothing when the variable is unset', () => {
    expect(isCaptureEnabled()).toBe(false)
    // A no-op even when handed a response: this sits on the hot path of every
    // provider call.
    expect(() => captureProviderResponse('anthropic', 'claude-sonnet-5', { a: 1 })).not.toThrow()
  })

  it('treats an empty string as unset', () => {
    process.env.PROVIDER_CAPTURE_DIR = '   '
    expect(isCaptureEnabled()).toBe(false)
  })
})

describe('capture mode writes raw responses when enabled', () => {
  it('writes one file per response, naming the provider and model', () => {
    const dir = withCaptureDir()
    expect(isCaptureEnabled()).toBe(true)

    captureProviderResponse('anthropic', 'claude-sonnet-5', { type: 'message', content: [] })
    captureProviderResponse('openai', 'gpt-5.6-terra', { status: 'completed', output: [] })

    const files = readdirSync(dir).sort()
    expect(files.some((f) => f.startsWith('anthropic-claude-sonnet-5-'))).toBe(true)
    expect(files.some((f) => f.startsWith('openai-gpt-5.6-terra-'))).toBe(true)

    const anthropicFile = files.find((f) => f.startsWith('anthropic-'))!
    const written = JSON.parse(readFileSync(path.join(dir, anthropicFile), 'utf8')) as {
      provider: string
      modelId: string
      response: unknown
    }
    expect(written.provider).toBe('anthropic')
    expect(written.modelId).toBe('claude-sonnet-5')
    expect(written.response).toEqual({ type: 'message', content: [] })
  })

  it('never throws when the directory cannot be created', () => {
    // A capture failure must not turn a paid-for answer into a failed attempt.
    //
    // The unwritable path is built by putting a *file* where a directory would
    // have to be, so mkdir fails with ENOTDIR immediately and identically on every
    // platform. An earlier version of this test used a path under /proc, which
    // fails instantly on macOS and **blocks indefinitely on Linux** - it hung CI
    // for eighteen minutes with no output at all.
    const parent = mkdtempSync(path.join(tmpdir(), 'large-capture-blocked-'))
    dirs.push(parent)
    const notADirectory = path.join(parent, 'i-am-a-file')
    writeFileSync(notADirectory, 'not a directory')
    process.env.PROVIDER_CAPTURE_DIR = path.join(notADirectory, 'nested')

    expect(() => captureProviderResponse('openai', 'gpt-5.6-terra', { a: 1 })).not.toThrow()
    expect(() =>
      logFailureEvidence('openai', 'gpt-5.6-terra', 'reason', { a: 1 }),
    ).not.toThrow()
  })
})

describe('failure evidence', () => {
  it('writes the reason and the raw response to stderr', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logFailureEvidence('anthropic', 'claude-sonnet-5', 'web search failed: too_many_requests', {
      type: 'message',
      content: [{ type: 'web_search_tool_result', content: { type: 'web_search_tool_result_error' } }],
    })

    expect(warn).toHaveBeenCalledTimes(1)
    const logged = String(warn.mock.calls[0]?.[0])
    expect(logged).toContain('anthropic:claude-sonnet-5')
    expect(logged).toContain('too_many_requests')
    // The shape has to be in there, or it cannot become a fixture later.
    expect(logged).toContain('web_search_tool_result_error')
  })

  it('truncates a very large response rather than flooding the log', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logFailureEvidence('openai', 'gpt-5.6-terra', 'web search failed', {
      big: 'x'.repeat(50_000),
    })
    const logged = String(warn.mock.calls[0]?.[0])
    expect(logged).toContain('truncated from')
    expect(logged.length).toBeLessThan(10_000)
  })

  it('survives a response that cannot be serialised', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => logFailureEvidence('openai', 'gpt-5.6-terra', 'reason', circular)).not.toThrow()
  })

  it('also appends to failures.jsonl when capture mode is on', () => {
    const dir = withCaptureDir()
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    logFailureEvidence('openai', 'gpt-5.6-terra', 'web search failed: status failed', {
      status: 'incomplete',
    })
    logFailureEvidence('anthropic', 'claude-sonnet-5', 'answer truncated', { stop_reason: 'max_tokens' })

    const file = path.join(dir, 'failures.jsonl')
    expect(existsSync(file)).toBe(true)
    const lines = readFileSync(file, 'utf8').trim().split('\n')
    expect(lines).toHaveLength(2)

    const first = JSON.parse(lines[0]!) as { provider: string; reason: string; response: unknown }
    expect(first.provider).toBe('openai')
    expect(first.reason).toContain('web search failed')
    expect(first.response).toEqual({ status: 'incomplete' })
  })
})

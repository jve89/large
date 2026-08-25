/**
 * CLAUDE.md Rule A applied to the two side effects inside `ask()`.
 *
 * `capture.test.ts` proves `captureProviderResponse` and `logFailureEvidence`
 * work. It proves nothing about whether anything calls them - and for most of
 * Phase 5 the honest answer was "no test does". That is the characteristic defect
 * of this codebase: the part works, the seam does not, and nothing looks at seams.
 * It has already cost four incidents - an empty Railway trigger list, a stub
 * adapter never wired into `processNextRun`, a commit CI never ran, and these two
 * call sites.
 *
 * So this file drives the **caller**. The provider SDK is replaced at the module
 * boundary, a stored response is handed back, and the assertions are about what
 * `ask()` caused to happen elsewhere: evidence on stderr, a file in the capture
 * directory. If someone deletes the one-line call in `ask()`, every test in
 * capture.test.ts still passes and these fail.
 *
 * Stubbing the SDK is the correct boundary here. "No fixture, no stub" binds the
 * Phase 0 skeleton path and `verify:live`, which exist to prove the real provider
 * is reached. What is under test here is our own wiring, and the response fed in
 * is a stored one from `tests/fixtures/`.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadFixture } from '../helpers/fixtures.ts'

/**
 * Mutable state the mocked SDKs read. `vi.mock` factories are hoisted above the
 * imports, so this has to be created with `vi.hoisted`.
 */
const sdk = vi.hoisted(() => ({
  anthropicMessage: null as unknown,
  anthropicThrows: null as Error | null,
  openaiResponse: null as unknown,
  openaiThrows: null as Error | null,
}))

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status: number | undefined
    constructor(message: string, status?: number) {
      super(message)
      this.status = status
    }
  }
  class Anthropic {
    static APIError = APIError
    messages = {
      stream: () => ({
        finalMessage: async () => {
          if (sdk.anthropicThrows) throw sdk.anthropicThrows
          return sdk.anthropicMessage
        },
      }),
    }
  }
  return { default: Anthropic, APIError }
})

vi.mock('openai', () => {
  class APIError extends Error {
    status: number | undefined
    constructor(message: string, status?: number) {
      super(message)
      this.status = status
    }
  }
  class OpenAI {
    static APIError = APIError
    responses = {
      create: async () => {
        if (sdk.openaiThrows) throw sdk.openaiThrows
        return sdk.openaiResponse
      },
    }
  }
  return { default: OpenAI, APIError }
})

const { createAnthropicAdapter } = await import('../../src/core/providers/anthropic.ts')
const { createOpenAiAdapter } = await import('../../src/core/providers/openai.ts')

const dirs: string[] = []

function withCaptureDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'large-seam-'))
  dirs.push(dir)
  process.env.PROVIDER_CAPTURE_DIR = dir
  return dir
}

beforeEach(() => {
  sdk.anthropicMessage = null
  sdk.anthropicThrows = null
  sdk.openaiResponse = null
  sdk.openaiThrows = null
})

afterEach(() => {
  delete process.env.PROVIDER_CAPTURE_DIR
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

const signal = new AbortController().signal

describe('ask() reaches logFailureEvidence when a response-shaped failure comes back', () => {
  it('Anthropic: a stored web-search error object leaves evidence on stderr', async () => {
    const fixture = loadFixture<unknown>('anthropic-search-error')
    sdk.anthropicMessage = fixture.response
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const adapter = createAnthropicAdapter('claude-sonnet-5', 'unused-key')
    const result = await adapter.ask('a prompt', signal)

    expect(result.ok).toBe(false)

    // The seam: ask() must have called logFailureEvidence. Deleting that one line
    // leaves capture.test.ts entirely green and fails this.
    expect(warn).toHaveBeenCalledTimes(1)
    const logged = String(warn.mock.calls[0]?.[0])
    expect(logged).toContain('[provider-failure]')
    expect(logged).toContain('anthropic:claude-sonnet-5')
    expect(logged).toContain('too_many_requests')
    // The raw shape has to be in the log, or a real failure could never become an
    // observed fixture.
    expect(logged).toContain('web_search_tool_result_error')
  })

  it('OpenAI: a stored failed web_search_call leaves evidence on stderr', async () => {
    const fixture = loadFixture<unknown>('openai-search-error')
    sdk.openaiResponse = fixture.response
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const adapter = createOpenAiAdapter('gpt-5.6-terra', 'unused-key')
    const result = await adapter.ask('a prompt', signal)

    expect(result.ok).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
    const logged = String(warn.mock.calls[0]?.[0])
    expect(logged).toContain('openai:gpt-5.6-terra')
    expect(logged).toContain('web search failed')
  })

  it('Anthropic: a truncated answer also leaves evidence', async () => {
    const fixture = loadFixture<unknown>('anthropic-truncated')
    sdk.anthropicMessage = fixture.response
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await createAnthropicAdapter('claude-sonnet-5', 'k').ask('p', signal)

    expect(result.ok).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('truncated')
  })

  it('logs nothing at all when the answer succeeded', async () => {
    const fixture = loadFixture<unknown>('anthropic-ok')
    sdk.anthropicMessage = fixture.response
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await createAnthropicAdapter('claude-sonnet-5', 'k').ask('p', signal)

    expect(result.ok).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })

  /**
   * The boundary stated in capture.test.ts, proved here rather than asserted: a
   * transport failure is thrown by the SDK and caught before interpretation, so
   * there is no response body to retain and no evidence is logged. Its message is
   * the whole of the evidence and becomes the answer's `failureReason`.
   */
  it('does not log evidence for a transport error, which has no response body', async () => {
    const { APIError } = (await import('@anthropic-ai/sdk')) as unknown as {
      APIError: new (m: string, s?: number) => Error
    }
    sdk.anthropicThrows = new APIError('401 API key is invalid', 401)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await createAnthropicAdapter('claude-sonnet-5', 'k').ask('p', signal)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('401')
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('ask() reaches captureProviderResponse', () => {
  it('writes the raw response to the capture directory when capture is on', async () => {
    const dir = withCaptureDir()
    const fixture = loadFixture<unknown>('anthropic-ok')
    sdk.anthropicMessage = fixture.response

    const result = await createAnthropicAdapter('claude-sonnet-5', 'k').ask('p', signal)
    expect(result.ok).toBe(true)

    const files = readdirSync(dir)
    expect(files, 'ask() did not call captureProviderResponse').toHaveLength(1)

    const written = JSON.parse(readFileSync(path.join(dir, files[0]!), 'utf8')) as {
      provider: string
      modelId: string
      response: { type?: string }
    }
    expect(written.provider).toBe('anthropic')
    expect(written.modelId).toBe('claude-sonnet-5')
    // What lands on disk is the response as the provider returned it - that is the
    // whole point of recapture.
    expect(written.response).toEqual(fixture.response)
  })

  it('captures a failed response too, so a real failure can become a fixture', async () => {
    const dir = withCaptureDir()
    const fixture = loadFixture<unknown>('openai-search-error')
    sdk.openaiResponse = fixture.response
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await createOpenAiAdapter('gpt-5.6-terra', 'k').ask('p', signal)
    expect(result.ok).toBe(false)

    const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'failures.jsonl')
    expect(files).toHaveLength(1)

    // ...and the failure line too, which is the record that upgrades a
    // `documented` fixture to an `observed` one.
    const failures = readFileSync(path.join(dir, 'failures.jsonl'), 'utf8').trim().split('\n')
    expect(failures).toHaveLength(1)
    expect(JSON.parse(failures[0]!)).toMatchObject({ provider: 'openai' })
  })

  it('writes nothing when capture is off', async () => {
    const fixture = loadFixture<unknown>('anthropic-ok')
    sdk.anthropicMessage = fixture.response
    // No PROVIDER_CAPTURE_DIR: the default on every real run.
    const result = await createAnthropicAdapter('claude-sonnet-5', 'k').ask('p', signal)
    expect(result.ok).toBe(true)
  })
})

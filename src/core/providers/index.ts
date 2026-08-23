/**
 * The adapter registry — configuration-driven, so a third provider is a new file
 * and a list entry, never a change to a caller (CLAUDE.md rule 9).
 *
 * This is the only module that knows which concrete adapter belongs to which
 * provider. Everything upstream works with `Target` and `ProviderAdapter`.
 */
import type { Provider } from '@prisma/client'
import { createAnthropicAdapter } from './anthropic.ts'
import { createOpenAiAdapter } from './openai.ts'
import type { ProviderAdapter, Target } from './types.ts'

export interface ProviderCredentials {
  readonly anthropicApiKey: string
  readonly openaiApiKey: string
}

type AdapterFactory = (modelId: string, credentials: ProviderCredentials) => ProviderAdapter

const FACTORIES: Record<Provider, AdapterFactory> = {
  anthropic: (modelId, credentials) =>
    createAnthropicAdapter(modelId, credentials.anthropicApiKey),
  openai: (modelId, credentials) => createOpenAiAdapter(modelId, credentials.openaiApiKey),
}

/**
 * Returns the adapter for one target. Adapters are cheap to construct, so they are
 * created per call rather than cached — nothing here holds state between attempts.
 */
export function adapterFor(target: Target, credentials: ProviderCredentials): ProviderAdapter {
  const factory = FACTORIES[target.provider]
  if (!factory) {
    throw new Error(
      `No adapter registered for provider '${target.provider}'. Add one in ` +
        'src/core/providers/ and register it here.',
    )
  }
  return factory(target.modelId, credentials)
}

export function isKnownProvider(value: string): value is Provider {
  return Object.hasOwn(FACTORIES, value)
}

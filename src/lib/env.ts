/**
 * Environment validation (SPEC C13).
 *
 * Validation is **role-aware**. Web, worker and scripts share one schema but not
 * one set of requirements: the provider API keys are required for the worker and
 * for scripts, and are deliberately NOT required for the web process, which never
 * calls a provider. A single schema demanding them everywhere would put the web
 * service into a restart loop on a host where only the worker holds the keys.
 *
 * The role is an **argument, never an environment variable**. Each entrypoint
 * passes its own: src/app/layout.tsx and the route handlers pass 'web',
 * src/worker/index.ts passes 'worker', scripts/verify-live.ts passes 'script'.
 * A variable could be set wrongly on a service; an argument cannot.
 */
import { z } from 'zod'

export type ProcessRole = 'web' | 'worker' | 'script'

/** Settings shared by every role. Each has a default, so none can be "missing". */
const tuning = {
  /**
   * Per provider, per worker process. With two providers and one worker that is
   * at most eight calls in flight. Known limitation: with W workers the effective
   * limit is W x this, because each process counts only itself.
   */
  PROVIDER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(4),
  /** A target below this coverage has its figures labelled unreliable (SPEC C10). */
  COVERAGE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
  WORKER_POLL_MS: z.coerce.number().int().min(100).max(60_000).default(2000),
  /** A `running` run whose heartbeat is older than this may be reclaimed (C15). */
  STALE_RUN_SECONDS: z.coerce.number().int().min(15).max(3600).default(120),
  /** Past this many reclaims a run is failed rather than retried forever (C15). */
  MAX_RECLAIMS: z.coerce.number().int().min(0).max(20).default(3),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
}

const REQUIRED_URL = z
  .string({ error: 'must be set' })
  .min(1, 'must not be empty')

const REQUIRED_KEY = z
  .string({ error: 'must be set' })
  .min(1, 'must not be empty')

function schemaForRole(role: ProcessRole) {
  const providerKeysRequired = role === 'worker' || role === 'script'
  return z.object({
    DATABASE_URL: REQUIRED_URL,
    ANTHROPIC_API_KEY: providerKeysRequired ? REQUIRED_KEY : z.string().optional(),
    OPENAI_API_KEY: providerKeysRequired ? REQUIRED_KEY : z.string().optional(),
    ...tuning,
  })
}

export type Env = z.infer<ReturnType<typeof schemaForRole>>

const cache = new Map<ProcessRole, Env>()

/**
 * Validates the environment for one process role and returns it typed.
 *
 * Throws at startup naming every offending variable. It never returns a partially
 * valid environment — a process must not start in a degraded state (SPEC C13).
 */
export function validateEnv(role: ProcessRole): Env {
  const cached = cache.get(role)
  if (cached) return cached

  const parsed = schemaForRole(role).safeParse(process.env)

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .sort()
      .join('\n')
    throw new Error(
      `Environment validation failed for the '${role}' process.\n` +
        `${problems}\n` +
        `Declare every variable in .env.example and set it before starting.`,
    )
  }

  cache.set(role, parsed.data)
  return parsed.data
}

/** Test seam: forget cached results so a test can vary process.env. */
export function resetEnvCache(): void {
  cache.clear()
}

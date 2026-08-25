import path from 'node:path'
import { defineConfig } from 'vitest/config'

// The API tests talk to a real PostgreSQL, because the rules they check —
// "nothing is persisted", "existing runs are untouched" — are statements about
// the database and cannot be verified against a mock. DATABASE_URL comes from
// .env locally and from the environment in CI.
try {
  process.loadEnvFile(path.join(process.cwd(), '.env'))
} catch {
  // No .env on disk; CI supplies the variable directly.
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      NODE_ENV: process.env.NODE_ENV ?? 'test',
    },
    // Route handlers share one Prisma client and one database; running files in
    // parallel would let one test's cleanup delete another's fixtures.
    fileParallelism: false,
    // A hanging suite is worse than a failing one. A test that blocked forever -
    // an fs call that returns instantly on macOS and never returns on Linux, say -
    // once stalled CI for eighteen minutes with no output at all, which is
    // indistinguishable from a slow runner until someone goes looking. These turn
    // any such hang into a named, located failure.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})

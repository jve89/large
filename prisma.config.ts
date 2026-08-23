// Prisma 7 no longer accepts `url` inside the datasource block of schema.prisma
// and no longer loads .env by itself. Both jobs are done here instead.
//
// Node 22 reads the .env file natively (process.loadEnvFile), so this costs no
// dotenv dependency. Absence of the file is not an error: on CI and on Railway
// the variables come from the environment. lib/env.ts is the thing that fails
// loudly when a variable required for the running role is actually missing
// (SPEC C13) — this file must not duplicate that judgement.
import path from 'node:path'
import { defineConfig } from 'prisma/config'

try {
  process.loadEnvFile(path.join(process.cwd(), '.env'))
} catch {
  // No .env on disk; fall through to the ambient environment.
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})

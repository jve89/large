/**
 * Prisma client singleton, plus the PostgreSQL major-version guard.
 *
 * Prisma 7 no longer reads a connection URL from schema.prisma; it takes a driver
 * adapter instead. The URL therefore arrives here, from the environment that
 * lib/env.ts has already validated for the calling role.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

/**
 * The pinned PostgreSQL major version (ARCHITECTURE.md -> Stack). Nothing else in
 * this project verifies that the Railway plugin and the CI service container
 * actually provide it, which would otherwise make PostgreSQL the only pinned
 * dependency trusted on faith.
 */
export const PINNED_POSTGRES_MAJOR = 18

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. It is required for every process role; see .env.example.',
    )
  }
  return url
}

/**
 * Builds a client with its **own** connection pool.
 *
 * The singleton below is what the application uses. This is exported for tests
 * that need genuinely concurrent actors: two actors sharing one `PrismaClient`
 * share its pool and can be served by one connection, which would make
 * `FOR UPDATE SKIP LOCKED` untestable - the second actor would never contend for
 * the row at all, and a broken claim would pass. Callers of this own the returned
 * client and must `$disconnect()` it.
 */
export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: connectionString() }),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Asserts the connected server's major version against the pinned one and fails
 * naming both (SPEC C13). Called by every role after the first connection.
 */
export async function assertDatabaseMajorVersion(
  client: PrismaClient = prisma,
): Promise<void> {
  const rows = await client.$queryRaw<
    { server_version_num: string }[]
  >`SELECT current_setting('server_version_num') AS server_version_num`

  const raw = rows[0]?.server_version_num
  const numeric = Number(raw)
  if (!raw || Number.isNaN(numeric)) {
    throw new Error(
      'Could not read server_version_num from the database; refusing to start ' +
        `against an unidentified server (got ${JSON.stringify(raw)}).`,
    )
  }

  // PostgreSQL 10 and later encode server_version_num as major * 10000 + minor.
  const major = Math.floor(numeric / 10000)
  if (major !== PINNED_POSTGRES_MAJOR) {
    throw new Error(
      `PostgreSQL major version mismatch: connected server is major ${major} ` +
        `(server_version_num ${numeric}), but this project pins major ` +
        `${PINNED_POSTGRES_MAJOR}. Point DATABASE_URL at a PostgreSQL ` +
        `${PINNED_POSTGRES_MAJOR} server, or change the pin in ARCHITECTURE.md.`,
    )
  }
}

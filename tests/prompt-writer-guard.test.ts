/**
 * Enforces the precondition that two locks depend on.
 *
 * `replacePromptList` takes `SELECT ... FOR UPDATE` on the company row before it
 * deletes and re-inserts that company's prompts. `queueRun` takes the same lock
 * before it snapshots the company and its prompts into a run. The second is only
 * safe because of the first: Prisma issues an `include` as **two** SQL statements,
 * and PostgreSQL's default READ COMMITTED gives each statement its own snapshot,
 * so without a common lock a run could record aliases from before a prompt save
 * and prompts from after it - a measurement basis that never existed.
 *
 * That guarantee holds only while `replacePromptList` is the **sole writer** of
 * `Prompt`. Nothing in the type system says so. A comment in ARCHITECTURE.md is
 * not a mechanism; this is.
 *
 * A source scan is the honest tool here. The alternative - a custom ESLint rule -
 * would be more precise about syntax but would need a plugin package to itself be
 * tested and versioned, and it would still be a string match on a member
 * expression underneath. This runs in the same suite as everything else and fails
 * the same way.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = path.join(process.cwd(), 'src')

/** The one module allowed to write Prompt rows, relative to the repo root. */
const SOLE_WRITER = path.join('src', 'app', 'api', 'companies', '[companyId]', 'prompts', 'route.ts')

/**
 * Prisma writes through a delegate: `prisma.prompt.create(...)`, `tx.prompt.
 * deleteMany(...)`, `client.prompt.upsert(...)`. The receiver name varies, the
 * `.prompt.<write>` shape does not.
 */
const DELEGATE_WRITE = /\.prompt\s*\.\s*(create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)\b/g

/** Raw SQL against the table, which would bypass the delegate entirely. */
const RAW_WRITE = /(insert\s+into|update|delete\s+from)\s+"?Prompt"?/gi

/**
 * A nested write through the Company relation - `company.create({ data: {
 * prompts: { create: ... } } })` - reaches Prompt without ever naming it. `Run`
 * also has a `prompts` relation, but it points at RunPrompt, which is a different
 * table and deliberately unlocked, so this is reported rather than failed and the
 * test asserts on the Company case specifically.
 */
const NESTED_PROMPTS_WRITE = /prompts\s*:\s*\{\s*(create|createMany|connectOrCreate|set|delete|deleteMany|update|upsert)/g

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full))
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      out.push(full)
    }
  }
  return out
}

/** Strips line and block comments so a doc comment naming a write is not a hit. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

interface Hit {
  readonly file: string
  readonly match: string
}

function scan(pattern: RegExp): Hit[] {
  const hits: Hit[] = []
  for (const file of sourceFiles(SRC)) {
    const code = stripComments(readFileSync(file, 'utf8'))
    for (const match of code.matchAll(pattern)) {
      hits.push({ file: path.relative(process.cwd(), file), match: match[0] })
    }
  }
  return hits
}

describe('only replacePromptList may write Prompt rows', () => {
  it('finds no Prisma delegate write to Prompt outside the sole writer', () => {
    const offenders = scan(DELEGATE_WRITE).filter((hit) => hit.file !== SOLE_WRITER)

    expect(
      offenders,
      offenders.length === 0
        ? ''
        : `These modules write Prompt rows without taking the company row lock, ` +
          `which silently breaks the snapshot guarantee that queueRun depends on:\n` +
          offenders.map((o) => `  ${o.file}: ${o.match}`).join('\n') +
          `\nMove the write into replacePromptList (${SOLE_WRITER}), or take the ` +
          `same FOR UPDATE lock and update ARCHITECTURE.md's key decision.`,
    ).toEqual([])
  })

  it('finds no raw SQL write to the Prompt table outside the sole writer', () => {
    const offenders = scan(RAW_WRITE).filter((hit) => hit.file !== SOLE_WRITER)
    expect(offenders).toEqual([])
  })

  it('finds no nested Prompt write through the Company relation', () => {
    // Only Company.prompts points at Prompt; Run.prompts points at RunPrompt and
    // is a different table, so this narrows to files that touch `company.`.
    const offenders = scan(NESTED_PROMPTS_WRITE).filter((hit) => {
      if (hit.file === SOLE_WRITER) return false
      const code = stripComments(readFileSync(path.join(process.cwd(), hit.file), 'utf8'))
      return /\bcompany\s*\.\s*(create|update|upsert)/.test(code)
    })
    expect(offenders).toEqual([])
  })

  it('confirms the sole writer actually still takes the lock', () => {
    // The guard above is meaningless if the one permitted writer stopped locking.
    const code = readFileSync(path.join(process.cwd(), SOLE_WRITER), 'utf8')
    expect(code).toMatch(/SELECT id FROM "Company" WHERE id = \$\{companyId\}::uuid FOR UPDATE/)
  })

  it('confirms queueRun takes the same lock', () => {
    const code = readFileSync(path.join(process.cwd(), 'src', 'core', 'run', 'queue.ts'), 'utf8')
    expect(code).toMatch(/SELECT id FROM "Company" WHERE id = \$\{companyId\}::uuid FOR UPDATE/)
  })
})

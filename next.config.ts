import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * Next 16 appends a managed `<!-- BEGIN:nextjs-agent-rules -->` block to
   * CLAUDE.md (and would create AGENTS.md) on every `next dev`, telling whichever
   * agent reads it to consult `node_modules/next/dist/docs/` before writing code.
   * The default is `true`; this project sets it to `false`.
   *
   * CLAUDE.md is the file every session reads before doing anything, and
   * everything in it was written deliberately for this project. A build tool
   * appending instructions to it means a future session follows rules nobody here
   * wrote, and reverting by hand does not hold because the block comes back on
   * the next `next dev`.
   *
   * Do not remove this as an unexplained flag. Verified in Next 16.3.2: the
   * option is declared in `next/dist/server/config-shared.d.ts` and the write is
   * gated on it at `next/dist/server/lib/start-server.js` (`agentRules !== false`).
   * `next build` does not perform the write, so this guards `next dev` only - but
   * that is where it happens (as researched 2026-08-25; re-check, don't trust).
   */
  agentRules: false,
}

export default nextConfig

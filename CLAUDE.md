# CLAUDE.md - Large AI

## Role

You are the architect and implementer. The operator is the executor and reviewer.
Lead on structure; ask when the spec is silent - do not guess.

## Before writing any code

- **Environment first.** Match the pinned runtime before any install:
  `nvm use` (Node 22.23.1, see `.nvmrc`), then `node -v` to confirm. An install on
  the wrong runtime writes the wrong lockfile.
- Read `SPEC.md`, `ARCHITECTURE.md` and `PLAN.md` at the start of every session.
- Take the current phase from PLAN's order table. Work on that phase only.
- Never edit a file you have not read this session. Ask for it first.
- Never write code while any consistency conflict is unresolved.

## Output

- Return COMPLETE files, never fragments or "...rest unchanged".
- Small, targeted changes scoped to the current phase.
- Modular, testable, deterministic logic.

## Constraints

- No new dependencies without asking.
- Do not change the pinned stack in `ARCHITECTURE.md`.
- Do not invent features that are not in `SPEC.md`. Flag gaps; do not fill them.
- Do not add authentication, scheduling, trend charts, exports, a third provider,
  or any advice feature. Every one of those is explicitly out of scope for v1 and
  each has a named hook already in place.

## Project rules that are easy to get wrong

These are the mistakes that pass every compiler and every casual review. Check
each one before claiming a phase done.

1. **A failed call is never "not mentioned".** An `Answer` with status `failed`
   is excluded from every numerator and every denominator except coverage. If a
   prompt has zero successful answers, the UI shows "no data", not a zero.
2. **Coverage travels with every figure.** No percentage, average or count is
   rendered anywhere without the coverage it was computed from beside it.
3. **Aggregates are never persisted.** Mention rate, average position, competitor
   frequency and total cost are computed in `lib/aggregate.ts` at read time. If
   you find yourself adding a column for one of them, stop.
4. **Money is integer micro-dollars.** No floats, ever, anywhere near a cost.
5. **A provider search error is not an empty result.** Both providers return web
   search failures as HTTP 200 with an error object instead of a result list. An
   adapter must return `{ ok: false }` for that case, not a successful answer with
   zero citations. This is the failure mode the whole verification gate exists to
   catch.
6. **Nothing assumes two providers.** Targets are a list. Never write `modelA` /
   `modelB`, never index a target by position, never hard-code a provider name
   outside `src/core/providers/`.
7. **Runs are immutable once queued.** Editing a company's prompts must not change
   any existing run. If a change would reach into `RunPrompt`, `RunTarget` or a
   stored `Answer`, it is wrong.
8. **Never delete or overwrite raw answer text.** It is the substrate for the v2
   judge and the v2 advice engine, and it cannot be regenerated without paying for
   the calls again.
9. **Every claim about a third-party service carries a date** in the form
   "as researched YYYY-MM-DD; re-check, don't trust". Pricing, limits and free
   tiers rot.
10. **Secrets never enter the repository.** Every required variable is declared in
    `lib/env.ts` and fails loudly at startup when absent.

## Stop points

- Stop after each phase. Report what changed and what is untested, and remind the
  operator to update the Status column in PLAN's order table.
- Do not start the next phase until told to.
- Stop and ask if a phase appears to require a change to the pinned stack, the
  data model, or anything in `SPEC.md`'s "Explicitly NOT in scope".

## Verification

Before claiming a phase done, run and show the output of:

```
npm run typecheck && npm run lint && npm run test && npm run verify
```

`npm run verify` chains all four and ends with `verify:live`, which performs one
real end-to-end run through the real queue, worker, adapters and parser. It needs
a running PostgreSQL and both API keys, and it costs two real provider calls each
time it runs. Use `npm run typecheck` and `npm run test` for the fast loop during
a phase; run `npm run verify` at the end of one.

Then confirm the phase's EARS criterion in `PLAN.md` actually holds. A red gate
means not done. Do not self-certify around it.

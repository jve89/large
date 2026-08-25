/**
 * The version of this system's **measurement semantics** - what it counts as a
 * mention.
 *
 * It exists because `basisHash` covered the four inputs an operator can edit and
 * nothing about the code that interprets them. A parser change could therefore
 * alter what "mentioned" means while every affected run kept the same hash and
 * went on claiming comparability with runs measured under the old meaning. C11
 * promises the opposite - a run whose measurement basis changed says so rather
 * than extending a series - so this is the fifth input to that hash, and C11 then
 * does the work unmodified.
 *
 * **Bump this whenever a change alters which brands are found, their positions, or
 * the total recognised, for the same answer text.** Then add a row to the log in
 * `SPEC.md` -> Definitions -> Measurement semantics log. The number alone is
 * uninterpretable in six months; the log is what lets a human say *why* two runs
 * are not comparable when C11 says they are not.
 *
 * A change that cannot alter any of those - a refactor, a faster regex, a comment -
 * does not bump it. Bumping needlessly breaks every series for nothing.
 *
 * Version 1 is retroactive and unstamped: runs queued before 2026-08-25 carry a
 * hash computed over four inputs and are distinguishable from anything after by
 * that alone, which is why the first stamped value is 2.
 */
export const MEASUREMENT_SEMANTICS_VERSION = 2

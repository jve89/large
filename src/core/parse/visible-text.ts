/**
 * Reduces raw answer text to what a reader actually sees (SPEC -> Definitions).
 *
 * Three things are removed, and only these three: fenced code blocks, markdown
 * link targets and markdown image targets. Label text is kept, because a reader
 * sees the label.
 *
 * Every alias and competitor match runs against this reduced text and never
 * against the raw string. Without this stage, position shifts whenever a model
 * links its sources, and a brand mentioned only inside a URL counts as
 * recommended (CLAUDE.md rule 7).
 */

/**
 * A properly closed fenced block. The backreference forces the closing fence to
 * use the same character as the opening one.
 */
const CLOSED_FENCE = /^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm

/**
 * A fence that is opened and never closed, which runs to the end of the answer.
 * Matched separately and without the multiline flag, so `$` means end of string:
 * folding this case into the rule above lets a *closing* fence be re-read as a
 * new unterminated opening fence, which silently deletes the rest of the answer.
 */
const UNCLOSED_FENCE = /(?:^|\n)[ \t]*(?:`{3,}|~{3,})[\s\S]*$/

/** Image: the target goes, the alt text stays. */
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g

/** Inline link: the target goes, the label stays. */
const LINK = /\[([^\]]*)\]\([^)]*\)/g

export function toVisibleText(raw: string): string {
  if (!raw) return ''

  let text = raw.replace(CLOSED_FENCE, '')
  text = text.replace(UNCLOSED_FENCE, '')

  // Images before links: an image is a link with a leading '!', so running the
  // link rule first would leave a stray '!' where the image had been.
  text = text.replace(IMAGE, '$1')
  text = text.replace(LINK, '$1')

  return text
}

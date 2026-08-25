/**
 * Reduces raw answer text to what brand matching is allowed to see
 * (SPEC -> Definitions -> Visible text).
 *
 * Five things are removed, and only these five: fenced code blocks, markdown link
 * targets, markdown image targets, URLs and email addresses. Label text and image
 * alt text are kept, because a reader sees those and a brand named in a label is
 * named.
 *
 * "Visible text" is a reduction made **for matching**. It is not a claim about
 * what a reader's eye lands on - a bare URL is on the screen, and so is fenced
 * code, and both are removed here. What the name means is: the places where a
 * brand appearing is a recommendation of it. An address is where a brand lives,
 * not an endorsement (CLAUDE.md rule 7).
 *
 * Widened 2026-08-25. Before that only the three markdown forms were removed,
 * which left four ways for a brand to be counted from inside an address - a bare
 * URL, an autolink, a reference-link definition and an email address - and a
 * web-searching model emits all four. A client's own domain contains its own name,
 * so the subject brand was recorded as mentioned in answers that never named it,
 * and every competitor position after it shifted.
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

/**
 * A reference-link definition on its own line: `[g]: https://example.com "Title"`.
 * The whole line goes - it is a target and nothing else, and it renders as nothing
 * at all.
 */
const REFERENCE_DEFINITION = /^[ \t]{0,3}\[[^\]]+\]:[ \t]*\S+.*$/gm

/** Reference-style image, then reference-style link: the reference goes, the text stays. */
const REFERENCE_IMAGE = /!\[([^\]]*)\]\[[^\]]*\]/g
const REFERENCE_LINK = /\[([^\]]*)\]\[[^\]]*\]/g

/** Inline image: the target goes, the alt text stays. */
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g

/** Inline link: the target goes, the label stays. */
const LINK = /\[([^\]]*)\]\([^)]*\)/g

/** An autolink - `<https://example.com>` - brackets and all. */
const AUTOLINK = /<\s*(?:https?:\/\/|www\.)[^>\s]*\s*>/gi

/**
 * An address token: a scheme, or a leading `www.`, and then everything up to
 * whitespace or a bracket.
 *
 * A scheme or a `www.` is required deliberately. A bare domain written as prose -
 * `acme.com` - is left alone, so that an operator may use a domain as an alias and
 * still have it matched. The cost is that a bare domain in a citation-like
 * position is still matchable; the alternative cost was refusing to match an alias
 * the operator deliberately entered, which is worse.
 */
const URL_TOKEN = /(?:https?:\/\/|www\.)[^\s<>()[\]{}"'`]*/gi

/**
 * An email address. `info@acme.nl` names the brand inside an address exactly as a
 * URL does, and is removed on the same grounds. Prose naming the brand alongside
 * it - "contact Acme at info@acme.nl" - still counts, because the prose is intact.
 */
const EMAIL = /[^\s<>()[\]{}"'`,;:]+@[^\s<>()[\]{}"'`,;:]+\.[a-z]{2,}/gi

export function toVisibleText(raw: string): string {
  if (!raw) return ''

  let text = raw.replace(CLOSED_FENCE, '')
  text = text.replace(UNCLOSED_FENCE, '')

  // Before the inline rules, because a definition line is a target on its own.
  text = text.replace(REFERENCE_DEFINITION, '')

  // Images before links in both pairs: an image is a link with a leading '!', so
  // running the link rule first would leave a stray '!' where the image had been.
  text = text.replace(REFERENCE_IMAGE, '$1')
  text = text.replace(REFERENCE_LINK, '$1')
  text = text.replace(IMAGE, '$1')
  text = text.replace(LINK, '$1')

  // Addresses last, so that a link whose *label* is itself an address loses both
  // halves: `[www.acme.example.com](https://www.acme.example.com)` is reduced to
  // its label by the rule above and then removed entirely by this one.
  text = text.replace(AUTOLINK, ' ')
  text = text.replace(URL_TOKEN, ' ')
  text = text.replace(EMAIL, ' ')

  return text
}

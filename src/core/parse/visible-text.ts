/**
 * Reduces raw answer text to what brand matching is allowed to see
 * (SPEC -> Definitions -> Visible text).
 *
 * Five things are removed, and only these five: fenced code blocks, markdown link
 * targets, markdown image targets, URLs and email addresses. Label text and image
 * alt text are kept, because a reader sees those and a brand named in a label is
 * named - unless the label is itself an address, which is an attribution rather
 * than a naming; see `ADDRESS_ONLY_LABEL`.
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

/** Reference-style image, then reference-style link. */
const REFERENCE_IMAGE = /!\[([^\]]*)\]\[[^\]]*\]/g
const REFERENCE_LINK = /\[([^\]]*)\]\[[^\]]*\]/g

/** Inline image: the target goes, the alt text stays. */
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g

/** Inline link. */
const LINK = /\[([^\]]*)\]\([^)]*\)/g

/**
 * A link label that is nothing but an address.
 *
 * The scheme and the `www.` are optional here, unlike in `URL_TOKEN` below, and
 * that difference is the whole rule (changed 2026-08-25). A bare domain standing
 * in running prose - "try acme.nl for pipes" - is the model naming a business, and
 * is kept. The same bare domain used as **link text** is not prose: it is the
 * visible half of an attribution, and the markdown already tells us which it is.
 * `[acme.nl](https://acme.nl)` is a citation, so it yields a citation and no
 * mention; `[Acme](https://acme.nl)` names the brand and still does.
 *
 * The accepted cost is a false negative: a business whose brand genuinely is a
 * domain - Booking.com, Marktplaats.nl - or merely looks like one - Node.js -
 * mentioned **only** as link text and nowhere in prose, is not counted. The
 * expectation is that this is rare, because a model that recommends a business
 * names it in prose and reserves link text for attribution; that expectation is a
 * belief and `PLAN.md` -> Phase 9 measures it against real answers rather than
 * arguing about it.
 *
 * The direction of the error is deliberate. Under-counting is what this product
 * chose when it decided to label thin coverage unreliable rather than show it as a
 * measurement, and inflating a headline number by reading citations as mentions is
 * the criticism the category already attracts.
 */
const ADDRESS_ONLY_LABEL = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#]\S*)?$/i

/** Keeps a link's visible text, unless that text is itself an address. */
function labelUnlessAddress(_match: string, label: string): string {
  return ADDRESS_ONLY_LABEL.test(label.trim()) ? ' ' : label
}

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
  text = text.replace(REFERENCE_LINK, labelUnlessAddress)
  text = text.replace(IMAGE, '$1')
  text = text.replace(LINK, labelUnlessAddress)

  // Addresses last. A link whose label is itself an address has already lost both
  // halves above; this catches every address that was never inside a link.
  text = text.replace(AUTOLINK, ' ')
  text = text.replace(URL_TOKEN, ' ')
  text = text.replace(EMAIL, ' ')

  return text
}

/**
 * Reduces raw answer text to what brand matching is allowed to see
 * (SPEC -> Definitions -> Visible text).
 *
 * Five things are removed, and only these five: fenced code blocks, markdown link
 * targets, markdown image targets, URLs and email addresses. Label text and image
 * alt text are kept, because a reader sees those and a brand named in a label is
 * named - unless the label is the link's own address, which is an attribution
 * rather than a naming; see `isSelfAttribution`.
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
 *
 * Narrowed again the same day; see `isSelfAttribution` for what and why.
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
 * at all. Its target is read out first, because `[label][g]` elsewhere in the
 * answer needs it to know what it points at.
 */
const REFERENCE_DEFINITION = /^[ \t]{0,3}\[([^\]]+)\]:[ \t]*(\S+).*$/gm

/** Reference-style image, then reference-style link. */
const REFERENCE_IMAGE = /!\[([^\]]*)\]\[[^\]]*\]/g
const REFERENCE_LINK = /\[([^\]]*)\]\[([^\]]*)\]/g

/** Inline image: the target goes, the alt text stays. */
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g

/** Inline link. The target is captured, because the label is judged against it. */
const LINK = /\[([^\]]*)\]\(([^)]*)\)/g

/**
 * A label that is nothing but an address: no whitespace, at least one dot, and a
 * TLD-shaped final label. Scheme and `www.` optional.
 *
 * This is only the **gate**. Being address-shaped is not by itself a reason to
 * drop a label - see `isSelfAttribution` - because "Node.js" is address-shaped and
 * is not an address.
 */
const ADDRESS_ONLY_LABEL = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#]\S*)?$/i

/**
 * The host of an address-shaped string, lower-cased, with any leading `www.` and
 * trailing dot removed - or null when it is not one.
 *
 * `new URL` does the parsing rather than another regex, so a path, a query, a port
 * or a mixed case host cannot defeat the comparison below.
 */
function hostOf(value: string): string | null {
  const trimmed = value.trim()
  if (!ADDRESS_ONLY_LABEL.test(trimmed)) return null

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  let host: string
  try {
    host = new URL(withScheme).hostname
  } catch {
    return null
  }

  host = host.toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
  return host.includes('.') ? host : null
}

/**
 * True when a link's visible text is the link's **own address**.
 *
 * This is the rule that decides whether a domain-shaped label is dropped, and it
 * exists because the previous rule - drop any address-shaped label - merged two
 * error classes that are not the same:
 *
 *   - `[acme.nl](https://www.acme.nl/prices)` is an attribution. The label *is*
 *     the address of the thing being linked, the citation already records it, and
 *     counting it as a mention reads a source as a recommendation. Dropping it is a
 *     conservative measurement choice with a reason. A brand whose name genuinely
 *     is its domain - Booking.com, Werkspot.nl - loses out when it appears only
 *     this way, and that cost is accepted; `PLAN.md` -> Phase 9 counts how often it
 *     actually happens.
 *   - `[Node.js](https://nodejs.org)` is not that. The label is not the link's
 *     address; it is a brand that happens to contain a dot and a TLD-shaped
 *     suffix. Dropping it was a parsing artifact with no compensating benefit.
 *
 * Comparing the label against the target tells the two apart using information the
 * parser already has. Hosts are compared after `www.` is stripped, and a label
 * that is the registrable domain of a deeper target host still matches - so
 * `[acme.nl](https://blog.acme.nl/x)` is an attribution too. Where the label is
 * address-shaped but points somewhere else entirely, the label is **kept**: the
 * rule drops a label only when it can show the label is the target's own address.
 */
function isSelfAttribution(label: string, target: string): boolean {
  const labelHost = hostOf(label)
  if (labelHost === null) return false

  const targetHost = hostOf(target)
  if (targetHost === null) return false

  if (labelHost === targetHost) return true
  return targetHost.endsWith(`.${labelHost}`) || labelHost.endsWith(`.${targetHost}`)
}

/** An autolink - `<https://example.com>` - brackets and all. */
const AUTOLINK = /<\s*(?:https?:\/\/|www\.)[^>\s]*\s*>/gi

/**
 * An address token: a scheme, or a leading `www.`, and then everything up to
 * whitespace or a bracket.
 *
 * A scheme or a `www.` is required deliberately. A bare domain written as prose -
 * `acme.com` - is left alone, so that an operator may use a domain as an alias and
 * still have it matched.
 */
const URL_TOKEN = /(?:https?:\/\/|www\.)[^\s<>()[\]{}"'`]*/gi

/**
 * An email address. `info@acme.nl` names the brand inside an address exactly as a
 * URL does, and is removed on the same grounds. Prose naming the brand alongside
 * it - "contact Acme at info@acme.nl" - still counts, because the prose is intact.
 */
const EMAIL = /[^\s<>()[\]{}"'`,;:]+@[^\s<>()[\]{}"'`,;:]+\.[a-z]{2,}/gi

/** `[g]: https://example.com` lines, keyed by their lower-cased reference. */
function referenceTargets(text: string): Map<string, string> {
  const targets = new Map<string, string>()
  for (const match of text.matchAll(REFERENCE_DEFINITION)) {
    targets.set(match[1]!.trim().toLowerCase(), match[2]!)
  }
  return targets
}

export function toVisibleText(raw: string): string {
  if (!raw) return ''

  let text = raw.replace(CLOSED_FENCE, '')
  text = text.replace(UNCLOSED_FENCE, '')

  // Read the definitions before deleting their lines: a reference link is judged
  // against the address it resolves to, exactly as an inline one is.
  const targets = referenceTargets(text)
  text = text.replace(REFERENCE_DEFINITION, '')

  // Images before links in both pairs: an image is a link with a leading '!', so
  // running the link rule first would leave a stray '!' where the image had been.
  text = text.replace(REFERENCE_IMAGE, '$1')
  text = text.replace(REFERENCE_LINK, (_match, label: string, reference: string) => {
    // An empty reference - `[acme.nl][]` - means the label is its own reference.
    const key = (reference.trim() || label.trim()).toLowerCase()
    const target = targets.get(key)
    // With no definition there is nothing to compare against, so the label stays.
    return target !== undefined && isSelfAttribution(label, target) ? ' ' : label
  })
  text = text.replace(IMAGE, '$1')
  text = text.replace(LINK, (_match, label: string, target: string) =>
    isSelfAttribution(label, target) ? ' ' : label,
  )

  // Addresses last. A link whose label was its own address has already lost both
  // halves above; this catches every address that was never inside a link.
  text = text.replace(AUTOLINK, ' ')
  text = text.replace(URL_TOKEN, ' ')
  text = text.replace(EMAIL, ' ')

  return text
}

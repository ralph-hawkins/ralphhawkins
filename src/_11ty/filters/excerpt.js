// Plain text derived from rendered HTML: the meta-description excerpt, and
// the colophon's word count.
//
// A naive striptags of `content` starts from the top of the layout, so every
// generated description opened with the post header's own furniture —
// "Week note 31 7 December 2025 Maya …" — spending ~30 of 155 characters
// repeating what a search result already shows on its title line. When the
// page has a .post-content wrapper, start the excerpt there instead.
//
// Entities are decoded here rather than left as-is: the raw HTML carries
// markdown-it's escapes (&amp;, &#39;), and truncating a string mid-entity
// would emit a broken one. Nunjucks re-escapes the plain text on output.
const BODY_MARKER = '<div class="post-content">';

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text) {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, ref) => {
    if (ref[0] !== "#") {
      const named = NAMED_ENTITIES[ref.toLowerCase()];
      return named === undefined ? match : named;
    }
    const code = ref[1].toLowerCase() === "x"
      ? parseInt(ref.slice(2), 16)
      : parseInt(ref.slice(1), 10);
    // Reject anything outside the Unicode range so fromCodePoint can't throw.
    if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return match;
    return String.fromCodePoint(code);
  });
}

// Rendered HTML down to the words a reader would actually read.
function htmlToText(html) {
  return decodeEntities(String(html).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

// Words in a post body. Tokens carrying no letter or digit don't count — the
// site sets its dashes loose ("a – b"), and a bare en dash is punctuation,
// not a word.
function wordCount(content) {
  if (!content) return 0;
  const tokens = htmlToText(content).split(/\s+/);
  return tokens.filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function excerpt(content, length = 155) {
  if (!content) return "";

  const html = String(content);
  const marker = html.indexOf(BODY_MARKER);
  const body = marker === -1 ? html : html.slice(marker + BODY_MARKER.length);

  const text = htmlToText(body);

  if (text.length <= length) return text;

  // Cut on a word boundary, then drop any punctuation left dangling at the
  // break so the ellipsis doesn't follow a stray comma or dash.
  const clipped = text.slice(0, length);
  const lastSpace = clipped.lastIndexOf(" ");
  const trimmed = lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped;
  return trimmed.replace(/[\s,;:.–—-]+$/, "") + "…";
}

module.exports = { excerpt, wordCount, htmlToText };

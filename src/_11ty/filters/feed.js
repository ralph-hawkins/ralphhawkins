// Helpers for the Atom feed (src/feed.njk).
//
// A feed entry is read away from the site, inside someone else's reader: a
// root-relative URL has no page left to resolve against, and the post's HTML
// travels inside an XML document, so it has to survive as text.
const { postVersion } = require("../post-versions.js");

// Rewrite root-relative ("/images/…") and fragment ("#footnote-1") URLs to
// absolute ones. Anything already absolute — http:, mailto:, or a
// protocol-relative //host — is left alone.
function absoluteUrls(html, siteUrl, pageUrl = "") {
  if (!html) return "";
  return String(html).replace(
    /\b(src|href)="(\/(?!\/)[^"]*|#[^"]*)"/g,
    (match, attribute, url) => url.startsWith("#")
      ? `${attribute}="${siteUrl}${pageUrl}${url}"`
      : `${attribute}="${siteUrl}${url}"`
  );
}

const XML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

// Control characters XML 1.0 forbids outright (everything below 0x20 except
// tab, newline and carriage return). A stray one pasted into a post would
// make the whole feed unparseable, not just the entry it appeared in.
// Built from a string rather than written as a regex literal so the source
// file stays plain ASCII — literal control bytes in source are invisible in
// an editor and easily mangled by anything that touches the file.
const ILLEGAL_XML_CHARS = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", "g");

// Escape a value for XML text. The feed carries post HTML as escaped text in
// <content type="html"> rather than wrapping it in CDATA — CDATA can't nest,
// so a literal "]]>" in a post would end the section early and break the
// document. One pass over the string, so the &s this introduces aren't
// themselves re-escaped.
//
// Templates call this as `| xmlEscape | safe`: xmlEscape does the escaping,
// and safe stops Nunjucks' HTML autoescaping doing it a second time. Without
// it, an & would reach the feed as &amp;amp;.
function xmlEscape(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(ILLEGAL_XML_CHARS, "")
    .replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

// The feed's own <updated>: the most recent change across its entries, which
// is not the same as the newest entry's. Revising a note from six months ago
// changes the feed, and a reader that polls on this timestamp would otherwise
// never look. Falls back to a post's front-matter date when git has nothing
// (an uncommitted file, or a shallow clone).
function latestUpdate(entries) {
  let latest = null;
  for (const entry of entries || []) {
    const version = postVersion(entry.inputPath);
    const stamp = (version && (version.updated || version.published)) || entry.date;
    if (stamp && (!latest || stamp > latest)) latest = stamp;
  }
  return latest;
}

module.exports = { absoluteUrls, xmlEscape, latestUpdate };

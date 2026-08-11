const fs = require("fs");
const path = require("path");

// Inline @import statements at build time so the site ships one CSS file
// instead of a render-blocking chain (the browser can't discover @imports
// until it has fetched and parsed the importing file, so they load
// serially). Source files stay separate for editing; only the built output
// is bundled.
//
// Replacement happens in place, so the cascade order defined in main.css is
// preserved exactly. Recursive, so nested imports would also resolve.
function inlineImports(filePath, seen = new Set()) {
  const resolved = path.resolve(filePath);
  // Guard against import cycles: a file already inlined contributes nothing.
  if (seen.has(resolved)) return "";
  seen.add(resolved);

  const css = fs.readFileSync(resolved, "utf8");
  const dir = path.dirname(resolved);

  return css.replace(
    /@import\s+(?:url\()?\s*["']([^"']+)["']\s*\)?\s*;/g,
    (match, importPath) => inlineImports(path.join(dir, importPath), seen)
  );
}

// Comments are for the source, not for the wire.
//
// This stylesheet is heavily commented on purpose — most of its values were
// arrived at by measurement and the reasoning is worth more than the value —
// but all of it was shipping. Measured before this ran: 41,423 bytes raw and
// 14,385 gzipped, of which 10,949 gzipped was commentary. Three quarters of
// every page's CSS was prose no browser reads.
//
// Hand-rolled rather than a minifier, for the same reason the rest of the
// build is: one pass, no dependency, and it only does the one thing. It is
// not a general CSS minifier and doesn't try to be — whitespace and the last
// semicolon in a block are left alone, because gzip already has those and the
// output stays readable enough to check.
//
// Walked character by character rather than regexed, because a regex can't
// tell a comment from the same two characters inside a string. Nothing in
// this codebase currently has one, but content: "/*" is legal CSS and a
// stylesheet that silently loses a rule is a bad way to find that out.
function stripComments(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const char = css[i];

    // Strings pass through whole, including anything comment-shaped inside.
    if (char === '"' || char === "'") {
      let end = i + 1;
      while (end < css.length && css[end] !== char) {
        end += css[end] === "\\" ? 2 : 1;   // an escaped quote isn't the end
      }
      out += css.slice(i, end + 1);
      i = end + 1;
      continue;
    }

    if (char === "/" && css[i + 1] === "*") {
      const close = css.indexOf("*/", i + 2);
      const after = close === -1 ? css.length : close + 2;
      // /*! ... */ is the convention for "keep this one" — licences and
      // anything else that has to survive a build.
      if (css[i + 2] === "!") out += css.slice(i, after);
      i = after;
      continue;
    }

    out += char;
    i++;
  }
  return out;
}

// Tidy what removing a comment leaves: the indent in front of it, and the
// blank lines around it collapsing into runs.
function tidy(css) {
  return css
    .replace(/[^\S\n]+$/gm, "")   // the indent that sat in front of a comment
    .replace(/\{\n\s*\n/g, "{\n") // a comment that opened a block
    .replace(/\n{3,}/g, "\n\n")   // and runs of blank lines left between rules
    .trim() + "\n";
}

function bundle(filePath) {
  return tidy(stripComments(inlineImports(filePath)));
}

module.exports = { inlineImports, stripComments, bundle };

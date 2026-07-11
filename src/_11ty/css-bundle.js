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

module.exports = { inlineImports };

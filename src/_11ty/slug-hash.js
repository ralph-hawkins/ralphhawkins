// One hash of a post's slug, for everything that needs a stable per-post seed.
//
// djb2. Two things read it — the blob's hue (og-images.js) and the poster's
// layout variant (poster-layouts.js) — and it lives in a module of its own so
// neither has to require the other. It started in og-images.js, and when the
// card learned to draw the poster the two ended up requiring each other in a
// cycle: poster-layouts got `undefined` for the hash at load time, which node
// reports as a warning rather than an error and would have shipped as every
// post picking layout zero.
//
// It is a seed, not an identifier: stable for the life of a slug, and adding
// an earlier post never changes a later one's.
function slugHash(slug) {
  let hash = 5381;
  for (const char of slug) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return hash;
}

module.exports = { slugHash };

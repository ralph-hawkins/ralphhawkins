// One hash of a post's slug, for everything that needs a stable per-post seed.
//
// djb2. One thing reads it now — the blob's hue in og-images.js — but it stays
// in a module of its own, because the reason it was split out is worth not
// relearning. It started inside og-images.js, and when the card learned to draw
// the poster, og-images and poster-layouts ended up requiring each other in a
// cycle: poster-layouts got `undefined` for the hash at load time, which node
// reports as a warning rather than an error and would have shipped as every
// post picking layout zero. poster-layouts.js went on 2026-08-31; the module
// boundary is cheap and the next second caller gets it for free.
//
// It is a seed, not an identifier: stable for the life of a slug, and adding
// an earlier post never changes a later one's.
function slugHash(slug) {
  let hash = 5381;
  for (const char of slug) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return hash;
}

module.exports = { slugHash };

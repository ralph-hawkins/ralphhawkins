// What a WOFF can actually draw, and how wide it draws it.
//
// The Open Graph cards are rendered by Satori with one font and no fallback,
// so anything the font can't draw comes out as a tofu box — and the cards had
// three of those. Knowing the coverage lets them be handled before rendering
// rather than discovered in a share preview.
//
// The widths are the same parse, and they replace the estimate the card used
// to make (~0.5em a character), which is what let it guess line counts wrong.
//
// No dependency: WOFF is a thin container — a header, a table directory, then
// each table either stored or zlib-compressed — and the tables we need are
// simple. Kept out of og-images.js because it is font plumbing, not card
// drawing, in the same spirit as filters/image-size.js.
const fs = require("fs");
const zlib = require("zlib");

// tag -> uncompressed table
function woffTables(buf) {
  if (buf.toString("ascii", 0, 4) !== "wOFF") throw new Error("not a WOFF file");
  const numTables = buf.readUInt16BE(12);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20;
    const tag = buf.toString("ascii", entry, entry + 4);
    const offset = buf.readUInt32BE(entry + 4);
    const compLength = buf.readUInt32BE(entry + 8);
    const origLength = buf.readUInt32BE(entry + 12);
    const raw = buf.subarray(offset, offset + compLength);
    tables[tag] = compLength < origLength ? zlib.inflateSync(raw) : raw;
  }
  return tables;
}

// codepoint -> glyph id, for the Unicode subtables only.
//
// Resolving to the glyph id matters rather than just collecting the segment
// ranges: a segment can cover a character and still map it to glyph 0, which
// is precisely the case that draws as a box. Volksans lists 824 codepoints
// that way and only 751 of them reach a real glyph — the non-breaking hyphen
// in two post titles was among the 73 that don't.
function glyphMap(cmap) {
  const map = new Map();
  const numTables = cmap.readUInt16BE(2);
  for (let i = 0; i < numTables; i++) {
    const record = 4 + i * 8;
    const platform = cmap.readUInt16BE(record);
    const encoding = cmap.readUInt16BE(record + 2);
    const offset = cmap.readUInt32BE(record + 4);
    const isUnicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!isUnicode) continue;

    const format = cmap.readUInt16BE(offset);
    if (format === 4) {
      const segX2 = cmap.readUInt16BE(offset + 6);
      const endBase = offset + 14;
      const startBase = endBase + segX2 + 2;
      const deltaBase = startBase + segX2;
      const rangeBase = deltaBase + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = cmap.readUInt16BE(endBase + s * 2);
        const start = cmap.readUInt16BE(startBase + s * 2);
        const delta = cmap.readInt16BE(deltaBase + s * 2);
        const rangeOffset = cmap.readUInt16BE(rangeBase + s * 2);
        if (start === 0xffff) continue;
        for (let cp = start; cp <= end && cp !== 0xffff; cp++) {
          let gid;
          if (rangeOffset === 0) {
            gid = (cp + delta) & 0xffff;
          } else {
            const at = rangeBase + s * 2 + rangeOffset + (cp - start) * 2;
            if (at + 1 >= cmap.length) continue;
            gid = cmap.readUInt16BE(at);
            if (gid !== 0) gid = (gid + delta) & 0xffff;
          }
          if (gid !== 0 && !map.has(cp)) map.set(cp, gid);
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g++) {
        const at = offset + 16 + g * 12;
        const start = cmap.readUInt32BE(at);
        const end = cmap.readUInt32BE(at + 4);
        const startGid = cmap.readUInt32BE(at + 8);
        for (let cp = start; cp <= end; cp++) {
          const gid = startGid + (cp - start);
          if (gid !== 0 && !map.has(cp)) map.set(cp, gid);
        }
      }
    }
  }
  return map;
}

// glyph id -> advance width, in font units. hmtx holds full metrics for the
// first numberOfHMetrics glyphs and the last of those applies to every glyph
// after it, which is how monospaced tails are stored compactly.
function advances(hmtx, numberOfHMetrics, numGlyphs) {
  const widths = new Array(numGlyphs).fill(0);
  let last = 0;
  for (let g = 0; g < numGlyphs; g++) {
    if (g < numberOfHMetrics) last = hmtx.readUInt16BE(g * 4);
    widths[g] = last;
  }
  return widths;
}

const cache = new Map();

function fontMetrics(path) {
  if (cache.has(path)) return cache.get(path);

  const tables = woffTables(fs.readFileSync(path));
  const unitsPerEm = tables.head.readUInt16BE(18);
  const numGlyphs = tables.maxp.readUInt16BE(4);
  const numberOfHMetrics = tables.hhea.readUInt16BE(34);
  const glyphs = glyphMap(tables.cmap);
  const widths = advances(tables.hmtx, numberOfHMetrics, numGlyphs);

  const metrics = {
    // Can the font draw this character at all?
    supports(codePoint) {
      return glyphs.has(codePoint);
    },
    // Rendered width of a string, in px at the given size. Advance widths
    // only: no kerning, which the GPOS table holds and Satori applies. Kerning
    // moves this by well under a percent, and every use here has slack.
    width(text, fontSize) {
      let units = 0;
      for (const char of text) {
        const gid = glyphs.get(char.codePointAt(0));
        if (gid !== undefined) units += widths[gid] || 0;
      }
      return (units / unitsPerEm) * fontSize;
    },
  };

  cache.set(path, metrics);
  return metrics;
}

module.exports = { fontMetrics };

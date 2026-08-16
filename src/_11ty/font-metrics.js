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

// Kerning, out of GPOS.
//
// Advance widths alone are not what the browser draws. Volksans has no `kern`
// table — the pairs live in GPOS, 42kB of it — and ignoring them makes a
// string measure wider here than it renders: "Tangentland" came out 2.3% over,
// nearly all of it in the "Ta" pair. That was tolerable while these widths
// only counted lines for the share cards, and stopped being tolerable when
// the post poster started deciding, to the glyph, where a title is allowed to
// be cropped: a third of a glyph's error is the difference between cutting
// after a letter and cutting through one.
//
// Only what is needed: the pair-adjustment lookups (LookupType 2) reachable
// from a feature tagged 'kern', and only the x-advance applied to the first
// glyph of the pair. Everything else GPOS can do — marks, cursive attachment,
// contextual positioning — a browser applies and this deliberately does not,
// because none of it moves a run of Latin text measurably.
function coverageIndex(buf, offset, gid) {
  const format = buf.readUInt16BE(offset);
  if (format === 1) {
    const count = buf.readUInt16BE(offset + 2);
    for (let i = 0; i < count; i++) {
      if (buf.readUInt16BE(offset + 4 + i * 2) === gid) return i;
    }
    return -1;
  }
  if (format === 2) {
    const count = buf.readUInt16BE(offset + 2);
    for (let i = 0; i < count; i++) {
      const at = offset + 4 + i * 6;
      const start = buf.readUInt16BE(at);
      const end = buf.readUInt16BE(at + 2);
      if (gid >= start && gid <= end) return buf.readUInt16BE(at + 4) + (gid - start);
    }
  }
  return -1;
}

function classOf(buf, offset, gid) {
  if (offset === 0) return 0;
  const format = buf.readUInt16BE(offset);
  if (format === 1) {
    const start = buf.readUInt16BE(offset + 2);
    const count = buf.readUInt16BE(offset + 4);
    if (gid < start || gid >= start + count) return 0;
    return buf.readUInt16BE(offset + 6 + (gid - start) * 2);
  }
  if (format === 2) {
    const count = buf.readUInt16BE(offset + 2);
    for (let i = 0; i < count; i++) {
      const at = offset + 4 + i * 6;
      if (gid >= buf.readUInt16BE(at) && gid <= buf.readUInt16BE(at + 2)) {
        return buf.readUInt16BE(at + 4);
      }
    }
  }
  return 0;
}

// A ValueRecord is a packed struct whose fields are present per the format's
// bits; XAdvance is bit 0x0004, after XPlacement and YPlacement.
const valueSize = (format) => {
  let n = 0;
  for (let bit = 1; bit <= 0x80; bit <<= 1) if (format & bit) n += 2;
  return n * 1;
};
function xAdvance(buf, offset, format) {
  if (!(format & 0x0004)) return 0;
  let at = offset;
  if (format & 0x0001) at += 2;
  if (format & 0x0002) at += 2;
  return buf.readInt16BE(at);
}

function kernPairs(gpos) {
  const subtables = [];
  if (!gpos || gpos.length < 10) return subtables;

  const featureListOffset = gpos.readUInt16BE(6);
  const lookupListOffset = gpos.readUInt16BE(8);

  // Which lookups does a 'kern' feature point at?
  const wanted = new Set();
  const featureCount = gpos.readUInt16BE(featureListOffset);
  for (let i = 0; i < featureCount; i++) {
    const rec = featureListOffset + 2 + i * 6;
    if (gpos.toString("ascii", rec, rec + 4) !== "kern") continue;
    const table = featureListOffset + gpos.readUInt16BE(rec + 4);
    const count = gpos.readUInt16BE(table + 2);
    for (let j = 0; j < count; j++) wanted.add(gpos.readUInt16BE(table + 4 + j * 2));
  }

  const lookupCount = gpos.readUInt16BE(lookupListOffset);
  for (let i = 0; i < lookupCount; i++) {
    if (wanted.size > 0 && !wanted.has(i)) continue;
    const lookup = lookupListOffset + gpos.readUInt16BE(lookupListOffset + 2 + i * 2);
    const type = gpos.readUInt16BE(lookup);
    const subCount = gpos.readUInt16BE(lookup + 4);
    for (let j = 0; j < subCount; j++) {
      // The offsets sit at lookup + 6 but are measured from `lookup` itself.
      let at = lookup + gpos.readUInt16BE(lookup + 6 + j * 2);
      let effective = type;
      // Type 9 wraps another lookup so it can sit past a 16-bit offset.
      if (type === 9) {
        effective = gpos.readUInt16BE(at + 2);
        at = at + gpos.readUInt32BE(at + 4);
      }
      if (effective === 2) subtables.push(at);
    }
  }
  return subtables;
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

  const gpos = tables.GPOS;
  const pairSubtables = gpos ? kernPairs(gpos) : [];
  const kernCache = new Map();

  // The adjustment GPOS makes to the first glyph's advance, in font units.
  // Looked up on demand and memoised per pair: class-based kerning is a
  // class1Count x class2Count matrix, which is far cheaper to index into than
  // to expand into every pair it implies.
  function kern(left, right) {
    const key = (left << 16) | right;
    const hit = kernCache.get(key);
    if (hit !== undefined) return hit;

    let delta = 0;
    for (const at of pairSubtables) {
      const format = gpos.readUInt16BE(at);
      const covered = coverageIndex(gpos, at + gpos.readUInt16BE(at + 2), left);
      if (covered < 0) continue;
      const fmt1 = gpos.readUInt16BE(at + 4);
      const fmt2 = gpos.readUInt16BE(at + 6);

      if (format === 1) {
        const set = at + gpos.readUInt16BE(at + 10 + covered * 2);
        const count = gpos.readUInt16BE(set);
        const stride = 2 + valueSize(fmt1) + valueSize(fmt2);
        for (let i = 0; i < count; i++) {
          const rec = set + 2 + i * stride;
          if (gpos.readUInt16BE(rec) !== right) continue;
          delta += xAdvance(gpos, rec + 2, fmt1);
          break;
        }
      } else if (format === 2) {
        const class1 = classOf(gpos, at + gpos.readUInt16BE(at + 8), left);
        const class2 = classOf(gpos, at + gpos.readUInt16BE(at + 10), right);
        const count1 = gpos.readUInt16BE(at + 12);
        const count2 = gpos.readUInt16BE(at + 14);
        if (class1 >= count1 || class2 >= count2) continue;
        const stride = valueSize(fmt1) + valueSize(fmt2);
        const rec = at + 16 + (class1 * count2 + class2) * stride;
        delta += xAdvance(gpos, rec, fmt1);
      }
    }

    kernCache.set(key, delta);
    return delta;
  }

  const metrics = {
    // Can the font draw this character at all?
    supports(codePoint) {
      return glyphs.has(codePoint);
    },
    // Rendered width of a string, in px at the given size — advance widths
    // plus the GPOS kerning a browser and Satori both apply. It used to be
    // advances alone, on the grounds that kerning moved the answer by well
    // under a percent; measured against Chrome, "Tangentland" was 2.3% out,
    // and the post poster crops to the glyph.
    width(text, fontSize) {
      let units = 0;
      let previous;
      for (const char of text) {
        const gid = glyphs.get(char.codePointAt(0));
        if (gid === undefined) { previous = undefined; continue; }
        if (previous !== undefined) units += kern(previous, gid);
        units += widths[gid] || 0;
        previous = gid;
      }
      return (units / unitsPerEm) * fontSize;
    },
    // The kern between two characters, in px — so a caller measuring a string
    // one glyph at a time can put back what it loses by splitting.
    kernBetween(a, b, fontSize) {
      const left = glyphs.get(a.codePointAt(0));
      const right = glyphs.get(b.codePointAt(0));
      if (left === undefined || right === undefined) return 0;
      return (kern(left, right) / unitsPerEm) * fontSize;
    },
  };

  cache.set(path, metrics);
  return metrics;
}

module.exports = { fontMetrics };

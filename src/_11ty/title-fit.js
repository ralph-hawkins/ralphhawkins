// How big to set a post title, solved from the title's own words.
//
// The 54 titles run from "Maya" to "I heard you like apps, so I put an app in
// your app" — 4 characters to 50, a 12.5x range. One size cannot serve that:
// pick it for the long titles and the short ones are stranded, pick it for the
// short ones and the long ones fill the screen. So every title gets its own,
// measured off the face rather than guessed from a character count.
//
// The output is a *fraction of the sheet width*, not a length. The poster is
// then one shape at every viewport, scaled — the same line breaks and the same
// crop at 390px as at 1920px — because the type and the sheet grow together.
//
// Two fractions, though, not one. A narrow sheet (a phone, where the sheet is
// the body measure and nothing more) wants fewer words per line and more of
// them, or the title sits in a thin band with the rest of the screen empty; a
// wide sheet wants longer lines. They are selected in poster.css by the same
// single media query that hands the metadata its wings.
//
// Line breaking is modelled here rather than forced into the markup with
// spans: greedy packing off the real advance widths is what the browser does,
// so shipping the size alone and letting it wrap agrees with the measurement
// and keeps one copy of the title in the DOM.
const path = require("path");
const { fontMetrics } = require("./font-metrics.js");

// SemiBold, because it is the only face on disk as a WOFF and font-metrics.js
// reads WOFF, not WOFF2 (a WOFF2 is brotli plus a transformed glyf table —
// a different parser, not a flag). That is not a compromise: the post title
// has been 600 since long before this, so what is measured is what is drawn.
// og-images.js measures the same file for the same reason.
const FONT_PATH = path.join(__dirname, "..", "fonts", "volksans", "volksans-SemiBold.woff");
const metrics = fontMetrics(FONT_PATH);

// Widths are solved in em, so everything here is measured at 1px and read as
// a multiple of the size.
const EM = 1;

// Must equal letter-spacing on .poster__title in poster.css.
//
// It is small and it is not optional to model: at 130px type, -0.015em over
// the twelve characters of "communicatio" pulls the line 23px narrower than
// the advance widths alone say. The crop is decided to the glyph, so 23px is
// the difference between the sheet edge landing after the "o" and landing
// inside the "n" — which is exactly the misread this fitter exists to avoid.
// Chrome adds the tracking after every character, including the last.
const LETTER_SPACING = -0.015;

// The crop, and the rule it has to satisfy: deliberate, never a shave, never
// illegible.
//
// How much of the *word* is lost is the wrong thing to measure. What decides
// whether a crop reads is how much of the one glyph the edge passes through
// survives. Measured on the built page: "Ill communication" cut with 63% of
// the final "n" showing rendered as "communicatior" — the crop had not
// removed a letter, it had turned one into a different one. That is the
// failure mode, and it lives in the middle of the range.
//
// Leaving a *sliver* of the glyph was tried and is no better, which is worth
// recording because it sounds like it should be: at 28% of an "n" you get the
// left stem and the start of the shoulder, which is an "r". Every stem-and-
// shoulder letter — n, m, h, u — has a smaller letter hiding inside it, so
// there is no fraction that is safe across the alphabet.
//
// So the edge lands between glyphs, always: the last letter standing is
// whole and everything past it is simply gone. That is what the references
// do — "Hong K", "Festiva" — and it cannot produce a letter that was not
// there. The crop reads because the word is visibly unfinished at the margin,
// not because a glyph is sliced.
//
// The crop is only worth making if it takes enough to be a decision, and
// never so much that the word stops being recoverable.
const CROP_MIN_GLYPHS = 0.6;
const CROP_MAX_GLYPHS = 2.4;

// And it has to buy something. Cropping "Ill communication" to fit a target
// it was already close to bought 6% more type for a mangled word — so a crop
// must bring the line at least this much nearer the target than leaving the
// word whole would, or it is not taken at all.
const CROP_WORTH_TAKING = 0.15;

// However bold the crop, this many characters of the word survive whole.
const CROP_MIN_REMAINING = 3;

// The line length each sheet aims for, in em. Smaller means bigger type and
// more lines. The wide target is what a 5-module sheet gets; the narrow one is
// what the body measure alone gets, and it is tighter so a phone's poster
// fills its screen rather than sitting in a band with air underneath.
//
// Measured across the 54. At 8em, 50 of them set on a single line — one
// composition repeated 50 times. At 5.5 the spread is good (20/20/8/6 lines)
// but 19 titles then stand taller than a 62.5svh sheet on a 900px window.
// 6.5 is where the two meet: 25/19/9/1, and the 11 that still overrun are
// caught by the height term in poster.css rather than by making every title
// smaller to suit the longest.
//
// The narrow target is tighter because a phone's sheet is the body measure
// and nothing more — tall and thin, so it wants short lines and a lot of
// them. It is what puts six lines of the longest title down a 320px screen.
const TARGET_EM_WIDE = 6.5;
const TARGET_EM_NARROW = 5.5;

// Never more than this many lines, whatever the target asks for — past it the
// title stops being a title.
const MAX_LINES = 9;

// Split on ordinary spaces only. U+00A0 is a deliberate join — "5 months at
// NHS England" holds NHS and England together with one — and treating it as a
// break would let the browser part them where the author said not to.
function tokens(title) {
  return title.split(" ").filter(Boolean);
}

// U+2011 is in the cmap and maps to .notdef, so it measures as zero here and
// draws as a box in the browser. Volksans lists 824 codepoints and only 751
// reach a real glyph; this is the check that stops the next one shipping.
function unsupported(title) {
  const missing = [];
  for (const char of title) {
    const cp = char.codePointAt(0);
    // Space isn't drawn, and the emoji comes from the colour fallback font
    // rather than this face, so neither is a hole in the composition.
    if (cp === 0x20 || cp === 0xa0 || cp > 0xffff) continue;
    if (!metrics.supports(cp)) missing.push(cp);
  }
  return missing;
}

// Width of a token in em. The emoji has no glyph in this face and comes from
// the system's colour font, whose advance this parser cannot see — one em is
// the usual square and the error is a fraction of one character in one title.
function tokenWidth(token) {
  let width = metrics.width(token, EM);
  for (const char of token) {
    if (char.codePointAt(0) > 0xffff) width += EM;
    width += LETTER_SPACING;
  }
  return width;
}

// The space between two words carries its own tracking, like any character.
function spaceAdvance() {
  return metrics.width(" ", EM) + LETTER_SPACING;
}

// Greedy packing, which is what a browser does: fill a line until the next
// word won't fit, then break. Returns the number of lines a given max width
// takes — a token wider than the line gets one to itself and overflows it,
// which is the crop.
function lineCount(words, widths, spaceWidth, maxEm) {
  let lines = 1;
  let used = 0;
  for (let i = 0; i < words.length; i++) {
    const advance = (used === 0 ? 0 : spaceWidth) + widths[i];
    if (used > 0 && used + advance > maxEm) {
      lines++;
      used = widths[i];
    } else {
      used += advance;
    }
  }
  return lines;
}

// The narrowest line width that still packs into `target` lines. Line count
// falls as the width grows, so this is a plain binary search on the width —
// and the narrowest width is the largest type, which is the point.
function widthForLines(words, widths, spaceWidth, target) {
  const total = widths.reduce((a, b) => a + b, 0) + spaceWidth * (words.length - 1);
  let lo = Math.max(...widths);   // a line can never be narrower than one word
  let hi = total;                 // everything on one line
  if (lineCount(words, widths, spaceWidth, lo) <= target) return lo;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (lineCount(words, widths, spaceWidth, mid) <= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

// Where each glyph of a word begins, in em — its drawing origin, not the end
// of the one before it. The two differ by the kern between them, and it is
// the origin that matters: clip the line there and glyph k is wholly absent,
// which is the only landing this design allows.
//
// Measured a character at a time it would also lose every kern in the word,
// so the pair adjustment is put back explicitly. Without it "Tangentland" was
// 2.3% wide and the sheet edge landed a third of a glyph late.
function glyphStops(word) {
  const chars = [...word];
  const stops = [];
  let pen = 0;
  for (let i = 0; i < chars.length; i++) {
    if (i > 0) pen += metrics.kernBetween(chars[i - 1], chars[i], EM);
    stops.push(pen);                                       // origin of glyph i
    let advance = metrics.width(chars[i], EM) + LETTER_SPACING;
    if (chars[i].codePointAt(0) > 0xffff) advance += EM;   // emoji, drawn elsewhere
    pen += advance;
  }
  stops.push(pen);                                         // end of the word
  return stops;
}

// Snap a line width to the nearest glyph boundary the sheet edge may fall on.
//
// Returns null when this width cannot crop legibly, in which case the caller
// leaves the word whole. Every candidate is a boundary between two letters,
// so the crop can never invent a glyph; of those, the one nearest the width
// asked for wins, so the type stays as close to the fitted size as the rule
// allows.
function snapCrop(lineEm, longest, glyphEm) {
  const stops = longest.stops;
  const total = stops[stops.length - 1];
  if (lineEm >= total) return null;

  const floor = CROP_MIN_GLYPHS * glyphEm;
  const ceiling = CROP_MAX_GLYPHS * glyphEm;

  const legal = [];
  // stops[k] is the edge with k whole letters standing and the rest gone.
  for (let k = CROP_MIN_REMAINING; k < stops.length; k++) {
    const removed = total - stops[k];
    if (removed >= floor && removed <= ceiling) legal.push(stops[k]);
  }
  if (legal.length === 0) return null;

  return legal.reduce((a, b) => (Math.abs(a - lineEm) <= Math.abs(b - lineEm) ? a : b));
}

function solve(title, targetEm) {
  const words = tokens(title);
  const widths = words.map(tokenWidth);
  const spaceWidth = spaceAdvance();

  // The average glyph in this title, not a constant: the crop band is in
  // glyph widths and a title of capitals crops differently from one of
  // lowercase.
  const letters = [...title].filter((c) => c !== " ").length;
  const glyphEm = letters > 0
    ? widths.reduce((a, b) => a + b, 0) / letters
    : 0.55;

  const sorted = [...widths].sort((a, b) => b - a);
  const longestIndex = widths.indexOf(sorted[0]);
  const longestWord = words[longestIndex];
  const longest = {
    width: sorted[0],
    chars: [...longestWord].length,
    stops: glyphStops(longestWord),
  };
  // The next longest word is the floor on cropping: cut past it and a second
  // word starts losing letters, which stops reading as one deliberate crop.
  const second = sorted[1] || 0;

  // Every line count, and for each one the option of cropping the longest word
  // instead of letting it hold the whole line open. Keep whichever lands
  // nearest the target — which is what makes a crop a choice the fitter earns
  // rather than a fallback it falls into.
  const candidates = [];
  for (let lines = 1; lines <= Math.min(MAX_LINES, words.length); lines++) {
    const raw = widthForLines(words, widths, spaceWidth, lines);
    candidates.push({ lineEm: raw, crop: 0 });

    // A crop only ever helps when the longest word is what is holding the line
    // wider than we want it — and only if it closes enough of the gap to the
    // target to be worth mangling a word for.
    if (raw > targetEm && longest.width >= raw - 1e-9) {
      const desired = Math.max(targetEm, second);
      const snapped = snapCrop(desired, longest, glyphEm);
      if (snapped !== null && snapped >= second) {
        const gained = Math.abs(raw - targetEm) - Math.abs(snapped - targetEm);
        if (gained >= CROP_WORTH_TAKING * Math.abs(raw - targetEm)) {
          candidates.push({ lineEm: snapped, crop: longest.width - snapped });
        }
      }
    }
  }

  let best = null;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate.lineEm - targetEm);
    if (!best || distance < best.distance) {
      best = {
        lines: lineCount(words, widths, spaceWidth, candidate.lineEm),
        lineEm: candidate.lineEm,
        crop: candidate.crop,
        distance,
      };
    }
  }

  return {
    // The size as a fraction of the sheet: a line this many em wide fills a
    // sheet exactly when the type is set at sheetWidth / lineEm.
    fit: 1 / best.lineEm,
    lines: best.lines,
    // In average glyph widths, so the number reads the way the rule is stated.
    crop: best.crop / glyphEm,
  };
}

// Arrangement, chosen from how many lines the title takes on a wide sheet —
// a fact about the title, not a setting. A one-line title leaves the sheet
// empty below it and wants the metadata spread across the top; a six-line one
// fills the sheet and wants the metadata compressed into a strip.
function arrangement(lines) {
  if (lines <= 1) return "a";
  if (lines === 2) return "b";
  return "c";
}

function posterFit(title, override) {
  if (typeof title !== "string" || title.trim() === "") return null;

  const wide = solve(title, TARGET_EM_WIDE);
  const narrow = solve(title, TARGET_EM_NARROW);

  // A character the face cannot draw is a box, and at poster size it is a hole
  // in the composition rather than the small blemish it was at heading size.
  // Warned rather than thrown: a title is not worth failing a build over, but
  // it is worth never discovering in a screenshot.
  const missing = unsupported(title);
  if (missing.length > 0) {
    const points = missing.map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`);
    console.warn(`[title-fit] "${title}" has no glyph for ${points.join(", ")} — it will draw as a box`);
  }

  return {
    fitWide: Number(wide.fit.toFixed(4)),
    fitNarrow: Number(narrow.fit.toFixed(4)),
    // The same measurement as the fit, the other way up: the line's width in
    // em. poster.css sets the title's box to this many em, which is what makes
    // the crop and the line count independent of the size the type ends up at.
    lineWide: Number((1 / wide.fit).toFixed(4)),
    lineNarrow: Number((1 / narrow.fit).toFixed(4)),
    lines: wide.lines,
    linesNarrow: narrow.lines,
    cropWide: Number(wide.crop.toFixed(2)),
    cropNarrow: Number(narrow.crop.toFixed(2)),
    arrangement: override || arrangement(wide.lines),
    missing,
  };
}

module.exports = { posterFit, metrics, TARGET_EM_WIDE, TARGET_EM_NARROW, CROP_MIN_GLYPHS, CROP_MAX_GLYPHS };

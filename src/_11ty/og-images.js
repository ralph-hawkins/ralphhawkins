// Build-time Open Graph images (1200×630) for week notes and the homepage.
// Each card recreates the site's gradient blob (same three-radial-gradient
// recipe as base.css) with hues seeded from the post's slug, so every post
// gets its own colourway that is stable across builds.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { fontMetrics } = require("./font-metrics.js");
const { slugHash } = require("./slug-hash.js");

const WIDTH = 1200;
const HEIGHT = 630;
const SRC_DIR = path.join(__dirname, "..");
const POSTS_DIR = path.join(SRC_DIR, "posts", "weeknotes");
const FONT_PATH = path.join(SRC_DIR, "fonts", "volksans", "volksans-SemiBold.woff");
const metrics = fontMetrics(FONT_PATH);

// djb2 hash → base hue. The site picks hues at random on each visit; here the
// slug stands in for the dice roll so the card matches itself forever.
// How far the disc's second hue sits from its first, and the hue the CSS falls
// back to before random-gradients.js has run. Both are mirrored in
// src/css/variables.css and src/js/random-gradients.js — keep the three in step.
const HUE_OFFSET = 65;
const HUE_FALLBACK = 70;

function hueFromSlug(slug) {
  return slugHash(slug) % 360;
}

// The blob's colours are defined in oklch rather than hsl, because the hue
// rotates as the page scrolls (HUE_SHIFT_PER_VIEWPORT in random-gradients.js)
// and hsl rotates unevenly: holding saturation and lightness fixed, the
// *perceived* lightness of hsl(h, 90%, 72%) swings between oklch L 0.635 and
// 0.954 around the wheel, and chroma between 0.101 and 0.217. That is what
// made a constant-rate rotation look like it surged and stalled. Fixing L and
// C instead makes equal hue steps look equal.
//
// The three layers of the disc, head to foot. Only the base is allowed an
// edge; the two above it fade to nothing before their own, so the disc reads as
// one object rather than as stacked circles.
//
// The bloom is achromatic on purpose — white is in gamut at every hue, where a
// tinted near-white is not (L 0.94 caps at 0.028 chroma, L 0.96 at nothing).
// The colour comes from the wash below it. The wash in turn sits lower and
// more chromatic than the bloom, because without that band the white simply
// washes the first hue out.
//
// Chroma is not a constant: each chromatic layer takes the most sRGB holds at
// its lightness *for the hue being drawn*. One number for all 360° meant every
// hue was held down to the tightest one's ceiling — 0.118 at the base, against
// a mean of 0.166 and 0.20+ for greens and magentas. The page does the same
// arithmetic at runtime in src/js/random-gradients.js, because its hues rotate
// on scroll; here the hue is fixed per card and it is done once.
//
// These must stay in step with src/css/variables.css and random-gradients.js:
// the lightnesses, the margin, and the fact that the bloom carries no chroma.
const BLOB_L = [0.99, 0.8, 0.74];
// A whisker inside the boundary, matching GAMUT_MARGIN in random-gradients.js.
const GAMUT_MARGIN = 0.98;

function inGamut(lightness, chroma, hue) {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return r >= 0 && r <= 1 && g >= 0 && g <= 1 && bl >= 0 && bl <= 1;
}

// Binary search rather than a table: the gamut boundary has corners where a
// channel saturates, and interpolating across one overshoots and clips, which
// distorts the hue the oklch definition exists to keep honest.
function blobChroma(lobe, hue) {
  if (BLOB_L[lobe] > 0.95) return 0; // the bloom is achromatic by design
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(BLOB_L[lobe], mid, hue)) lo = mid; else hi = mid;
  }
  return lo * GAMUT_MARGIN;
}

// oklch → sRGB, clamped to 0–255. Done here rather than left to CSS because
// Satori parses the card's colours itself and can't be relied on for oklch(),
// and the favicon's SVG and the inline overscroll colour both take plain hex.
function oklchToRgb(lightness, chroma, hue) {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map((channel) => {
    const encoded = channel <= 0.0031308
      ? 12.92 * channel
      : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
  });
}

// One lobe's colour as CSS rgb()/rgba() — understood by both Satori and SVG.
function blobColor(lobe, hue, alpha = 1) {
  const [r, g, b] = oklchToRgb(BLOB_L[lobe], blobChroma(lobe, hue), hue);
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Same disc as body::before (see --blob-gradient in src/css/variables.css),
// sized and placed per card rather than pinned to one spot.
//
// Seeded from the slug, not Math.random: a card has to come out identical on
// every build, which is the same reason the hues are seeded.
//
// The disc reaches 1.15 radii to each side and from 1.05 above its centre to
// 1.08 below, so those extents are what the placement has to keep on the
// canvas. Requiring at least 1/sqrt(2) of each axis on it puts at least half
// the disc's area on the card — conservative, since it treats the two axes as
// worst-case independent.
const DISC_R_MIN = 200;
const DISC_R_MAX = 340;
const DISC_HALF_W = 1.15;
const DISC_UP = 1.05;
const DISC_DOWN = 1.08;
const ON_CARD = Math.SQRT1_2;

// The same djb2 as hueFromSlug, salted so one slug yields several independent
// but stable numbers.
function seeded(slug, salt) {
  let hash = 5381;
  for (const char of `${slug}/${salt}`) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return hash / 0x100000000;
}

function discFor(slug) {
  const r = DISC_R_MIN + seeded(slug, "size") * (DISC_R_MAX - DISC_R_MIN);
  const slackX = (1 - ON_CARD) * (DISC_HALF_W * 2 * r);
  const slackY = (1 - ON_CARD) * ((DISC_UP + DISC_DOWN) * r);
  const minX = DISC_HALF_W * r - slackX;
  const maxX = WIDTH - DISC_HALF_W * r + slackX;
  const minY = DISC_UP * r - slackY;
  const maxY = HEIGHT - DISC_DOWN * r + slackY;
  return {
    r,
    x: minX + seeded(slug, "x") * Math.max(0, maxX - minX),
    y: minY + seeded(slug, "y") * Math.max(0, maxY - minY),
  };
}

const disc = (d, rx, ry, dy) =>
  `ellipse ${Math.round(d.r * rx)}px ${Math.round(d.r * ry)}px` +
  ` at ${Math.round(d.x)}px ${Math.round(d.y + d.r * dy)}px`;

function blobBackground(hue1, hue2, d) {
  return [
    `radial-gradient(${disc(d, 0.72, 0.56, -0.46)}, ${blobColor(0, hue1)}, ${blobColor(0, hue1, 0.72)} 40%, ${blobColor(0, hue1, 0)} 100%)`,
    `radial-gradient(${disc(d, 1, 0.85, -0.2)}, ${blobColor(1, hue1, 0.95)}, ${blobColor(1, hue1, 0.55)} 45%, ${blobColor(1, hue1, 0)} 100%)`,
    `radial-gradient(${disc(d, DISC_HALF_W, 1, 0.08)}, ${blobColor(2, hue2)}, ${blobColor(2, hue2, 0.85)} 68%, ${blobColor(2, hue2, 0)} 92%)`
  ].join(", ");
}

// Satori draws with the one font it is given and no fallback, so anything
// Volksans can't draw arrives as a tofu box. Three cards had one.
//
// Two characters need different treatment. The non-breaking hyphen is in the
// cmap but maps to .notdef, and it earns its place in a title — it stops
// "Self-aware" breaking across lines — so on the card, which is one fixed
// image and has no lines to break across, a plain hyphen says the same thing.
// Anything else the font can't draw is dropped: better a missing character
// than a box announcing one.
const SUBSTITUTES = new Map([
  [0x2011, "-"],  // non-breaking hyphen
  [0x2012, "-"],  // figure dash
  [0x2212, "-"],  // minus sign
  [0x00a0, " "],  // non-breaking space
]);

function drawable(text) {
  let out = "";
  for (const char of text) {
    const swapped = SUBSTITUTES.get(char.codePointAt(0)) ?? char;
    for (const c of swapped) {
      if (metrics.supports(c.codePointAt(0))) out += c;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

// Where a line is allowed to break, as CSS sees it: between words at a space,
// and after a hyphen inside a word. The second one is not a nicety —
// "Self-aware" is one word to a space-split but two pieces to a line breaker,
// and a piece wider than the box can't be broken any further.
function segments(text) {
  const pieces = [];
  for (const word of text.split(" ")) {
    // the hyphen stays on the piece it ends; the piece after it opens a line
    // with no space in front of it
    word.split(/(?<=-)/).forEach((piece, i) => {
      pieces.push({ text: piece, space: i === 0 && pieces.length > 0 });
    });
  }
  return pieces;
}

// Greedy wrap, the same one Satori will perform, counted rather than guessed.
//
// It hands back the lines and not just how many there are, because the height
// budget is now measured in ink: what the first line rises to and what the
// last one falls to depend on which words ended up on them.
function wrapLines(text, fontSize, width) {
  const space = metrics.width(" ", fontSize);
  const lines = [[]];
  let used = 0;
  for (const piece of segments(text)) {
    const gap = piece.space ? space : 0;
    const w = metrics.width(piece.text, fontSize);
    if (used > 0 && used + gap + w > width) { lines.push([piece.text]); used = w; }
    else { lines[lines.length - 1].push(piece.text); used += gap + w; }
  }
  return lines.map((pieces) => pieces.join(" "));
}

function lineCount(text, fontSize, width) {
  return wrapLines(text, fontSize, width).length;
}

// Balanced wrapping, since Satori has no text-wrap: balance. Greedy wrapping
// fills each line to the brim and leaves whatever is left on the last one,
// which is how titles ended up with a single orphaned word under a full line.
// Narrowing the box until one more pixel off would cost an extra line gives
// the same number of lines with the text spread evenly across them.
function balancedWidth(text, fontSize, maxWidth) {
  const target = lineCount(text, fontSize, maxWidth);
  if (target < 2) return maxWidth;
  // The box can never usefully go below the widest piece that has nowhere to
  // break: past that the text overflows instead of wrapping, and the search
  // would read the unchanged line count as room to keep narrowing.
  const floor = Math.max(...segments(text).map((p) => metrics.width(p.text, fontSize)));
  if (lineCount(text, fontSize, floor) <= target) return Math.ceil(floor);
  let tooNarrow = floor;
  let fits = maxWidth;
  while (fits - tooNarrow > 1) {
    const mid = (tooNarrow + fits) / 2;
    if (lineCount(text, fontSize, mid) <= target) fits = mid;
    else tooNarrow = mid;
  }
  return Math.ceil(fits);
}

// THE SHEET, AND THE MARGIN ROUND IT
// ---------------------------------------------------------------------------
// The card carries the title and nothing else — no week note, no date, no
// standfirst — set as large as the sheet will hold it. With one item on it the
// layout table has nothing left to place and the per-title fit has no other
// block to be sized against, so both requires went on 2026-08-17.
//
// The sheet is now the margin, and nothing else: 60px inside every edge, so
// 1080 x 510 of a 1200 x 630 card. It used to be five of the site's own
// 211.89px modules across — 1059.47, which is a 70.26px margin either side —
// by four rows of three page lines down.
//
// Both of those came off, and for the same reason: they were the page's terms
// on a sheet that no longer has the page's job.
//
//   - The four rows placed nothing here. Being whole page lines they also
//     floored the height budget to 468px of the 490 that margin allowed, and
//     could not have used the rest at any margin.
//   - The five modules capped 32 of the 57 titles. Those are the ones whose
//     longest word already fills the sheet on its own, so no change to the
//     height could move them, and the module tie was buying less than the type
//     it cost. Measured across the set, widening the sheet with the margin is
//     what takes the median gain off zero.
//
// What the card still shares with the page is the face it is set in and the
// baseline its leading snaps to, which is the tie that was doing the work.
// 60 rather than 70.26 is Ralph's call, taken on the numbers: it is the point
// where every card gains and the margin is still unmistakably a margin.
//
// Satori has no CSS grid, so the title is placed absolutely from these
// numbers.
const PAGE_LINE = 1.3 * 16 * 1.5;          // --font-size-base x --line-height-base
const BASELINE = PAGE_LINE / 8;            // the poster's baseline grid

const CARD_MARGIN = 60;
const SHEET_W = WIDTH - 2 * CARD_MARGIN;
const SHEET_X = CARD_MARGIN;
const SAFE_H = HEIGHT - 2 * CARD_MARGIN;
const INK_BOTTOM = HEIGHT - CARD_MARGIN;

// Where Satori puts the bottom of a line box relative to that line's own
// baseline, in em. With advance widths, kerning and every glyph's ink box now
// read out of the font, this is the one term in the model that the font does
// not answer for — it is the shaper's, not the face's — so it was solved off
// the 57 finished cards instead of assumed: 0.1545, spread 0.019 across the
// set, which is the half-pixel the ink measurement can resolve. It is what
// turns a baseline the fit has chosen into the `top` Satori wants.
const BOX_BELOW_BASELINE = 0.1545;

// Leadings are rounded to the baseline exactly as poster.css rounds them, so
// the card's type sits on the same rhythm.
const snap = (v) => Math.round(v / BASELINE) * BASELINE;

// The leading .page-title carries in src/css/typography.css, so a title sets
// the same way on the card as it does on the page it links to.
//
// Measured floor is 0.906, where the tightest pair of lines across the 53
// titles touches — "You don't always need to go from left to right", whose
// "y" descender lands over a "d" ascender. 0.9 is under that floor and is what
// the poster uses, so the card takes the poster's rather than the page body's:
// at this size the two lines would touch, and the sizes here are large enough
// that a clash is unmistakable. Remeasure if the titles or the face change.
//
// Measuring this needs care: grouping the rendered rows into ink bands and
// taking the smallest gap gives 7px at every leading, because the dot of an
// "i" is its own band a fixed distance above its letters. Bands have to be
// grouped into lines first.
const TITLE_LINE_HEIGHT = 0.95;

// The largest size at which no unbreakable piece overruns the sheet. Advance
// widths scale linearly with size — kerning included, since GPOS values are in
// font units — so this is one division rather than a search.
function sizeByWidth(text, width) {
  const widest = Math.max(...segments(text).map((p) => metrics.width(p.text, 1000))) / 1000;
  return width / widest;
}

// The lines the title will actually be drawn in at this size, in the box it
// will actually be drawn in. Balancing moves words between lines, and the ink
// budget depends on which words end up first and last, so the balance has to
// be applied before the extents are read rather than after the size is fixed.
function linesAt(text, fontSize) {
  const greedy = lineCount(text, fontSize, SHEET_W);
  const width = greedy > 1 ? balancedWidth(text, fontSize, SHEET_W) : SHEET_W;
  return { lines: wrapLines(text, fontSize, width), width };
}

// The height of the ink a title puts on the card: the first line's rise above
// its baseline, the leading between the baselines, and the last line's fall
// below the last one.
//
// A line box is not ink, and on this card the difference is most of a
// descender — 0.21em, which at 400px type is 84px. Measuring the boxes
// instead gave every title the deepest descender in the face whether it set
// one or not, and left the space above the capitals unusable as well.
function inkHeight(lines, leading, fontSize) {
  return metrics.inkExtents(lines[0]).above * fontSize
    + (lines.length - 1) * leading
    + metrics.inkExtents(lines[lines.length - 1]).below * fontSize;
}

// The biggest the title can be set with its ink inside the margin.
//
// Scanning down from the ceiling and taking the first size that fits is what
// picks the line count, rather than the count being decided first and the
// size fitted to it. It has to be that way round: a long title set over three
// lines takes far larger type than the same title on one, because each line
// is a third as wide, so choosing the count first would cap the size at
// whatever that count allowed. The height a title needs is not monotonic in
// its size — it drops every time a line is saved — so the first fit from the
// top is the largest fit, and scanning is the honest way to find it.
function fillSheet(text) {
  const oneLine = metrics.inkExtents(text);
  const ceiling = Math.floor(Math.min(
    sizeByWidth(text, SHEET_W),               // no single piece may overrun
    SAFE_H / (oneLine.above + oneLine.below)  // nor may one line of it
  ));
  for (let size = ceiling; size > 12; size--) {
    const leading = snap(TITLE_LINE_HEIGHT * size);
    const { lines, width } = linesAt(text, size);
    if (inkHeight(lines, leading, size) <= SAFE_H) return { size, lines, leading, width };
  }
  const size = 12;
  const leading = snap(TITLE_LINE_HEIGHT * size);
  return { size, leading, ...linesAt(text, size) };
}

// The page's surface: one flat tint of the background laid over the whole
// blob. It replaced a stack of 15 bars easing from clear at the top to a 75%
// tint at the bottom, which is what the header used to do and no longer does;
// the card drew them long after the site had dropped them.
//
// **Its strength is derived from the page's, not chosen.** The card is the
// post's poster, and on the page the poster sits on main's panel — so the
// blob has to read there as strongly as it does under the post, and one
// number cannot be picked by eye for that. The panel puts the disc through
// four things in order, and the card has to arrive at the product of them:
//
//   --glass-opacity   60%    body::after, one tint over the whole blob
//   --panel-opacity   65%    main's own background, over the filtered result
//   --glass-saturate  1.3    backdrop-filter, which puts chroma back
//   hue-rotate(180)   ×0.907 sheds a little, being an sRGB matrix rather
//                            than a rotation in oklch (0.0330 from 0.0364)
//
// 0.40 × 0.35 × 1.3 × 0.907 = 0.165 of the disc's own chroma, so the card
// tints away the other 83.5%. Confirmed by rendering both and sampling: the
// page's panel measures p99 chroma 0.0313 against a bare disc's 0.1905, which
// is 0.164 — the model and the browser agree to within a percent.
//
// Only the strength is matched. The card does **not** take the hue rotation,
// because that would turn every card off the hue postColor and the favicon
// identify the post by; and it does not need the blur term, because it
// already applies the page's own blur to its own disc, which is why the two
// blurs cancel in the measurement above.
//
// It was 0.25 until 2026-08-16 — deliberately louder, on the argument that a
// card is seen once at thumbnail size in a timeline. That measured 3.95× the
// panel and 1.62× the header, and Ralph asked for the two to agree.
const PAGE_GLASS_OPACITY = 0.6;
const PAGE_PANEL_OPACITY = 0.65;
const PAGE_SATURATE = 1.3;
const PAGE_HUE_ROTATE_CHROMA = 0.907;
const GLASS_OPACITY = 1 - (1 - PAGE_GLASS_OPACITY) * (1 - PAGE_PANEL_OPACITY)
  * PAGE_SATURATE * PAGE_HUE_ROTATE_CHROMA;

// The blur is the page's, applied in render() rather than here: Satori has no
// backdrop-filter, so the backdrop is rendered, blurred and composited under
// the type in two passes.

function glassTint() {
  return {
    type: "div",
    props: {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: `rgba(235, 237, 240, ${GLASS_OPACITY})`
      }
    }
  };
}

// The card is drawn in two passes rather than one, because the blur has to
// reach the blob without reaching the type. Satori has no backdrop-filter and
// no filter worth relying on, so the backdrop is rendered on its own, blurred
// with Sharp, and the text composited over it afterwards.
function backdrop({ hue1, hue2, disc: d }) {
  return {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        backgroundColor: "#EBEDF0",
        backgroundImage: blobBackground(hue1, hue2, d)
      },
      children: [glassTint()]
    }
  };
}

// The card's type: the title, alone, as large as the sheet will hold it.
//
// It carried the week note, the published date and the standfirst until
// 2026-08-17, placed from the poster's layout table. Ralph asked for the title
// on its own and set bigger, which is what a card is read as at the size one
// is actually seen — a thumbnail in a timeline, where five separate blocks of
// type were four more than survived the scaling down. The facts are all still
// on the page the card links to, in the poster and again in the colophon.
//
// The sheet is the same one, and so is the face and the baseline the leading
// snaps to. What went is the arrangement.
//
// No crop. Nothing is clipped to an em box here: the size is solved so the
// words fit, rather than fitted to a target and then cut.
function foreground({ title }) {
  const heading = drawable(title);
  // The lines come back balanced. Satori has no text-wrap: balance, and greedy
  // wrapping fills each line to the brim and leaves the remainder on the last
  // one — at this size a single orphaned word is the whole bottom third of the
  // card. Narrowing the box cannot change the count, only where the breaks
  // fall, which is why the fit can balance before it measures.
  const { size, lines, leading, width } = fillSheet(heading);

  // The last line's baseline, put where its own deepest glyph lands on the
  // bottom margin, and then the box Satori wants around it.
  const lastBaseline = INK_BOTTOM - metrics.inkExtents(lines[lines.length - 1]).below * size;
  const boxTop = lastBaseline + BOX_BELOW_BASELINE * size - lines.length * leading;

  return {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        position: "relative",
        fontFamily: "volksans",
      },
      children: [{
        type: "div",
        props: {
          style: {
            position: "absolute",
            left: SHEET_X,
            // Bottom-anchored, as the title is on the page — the poster
            // anchors it to the end of its rows, and with the rest of the
            // sheet empty its rows are the whole of it. Never centred: that
            // is the one alignment that cannot keep a baseline on the grid.
            //
            // What it is anchored to is the margin, and by its ink rather
            // than by its line box: a title ending in a descender and one
            // ending in an "n" now come down to the same line on the card,
            // where before they differed by a fifth of an em — 84px at the
            // sizes the longest titles are set at.
            top: boxTop,
            width,
            color: "#0b0c0c",
            fontSize: size,
            lineHeight: leading / size,
            // In px, not em, because Satori ignores the em form. It ignores
            // this one too — measured, in both units — so lineCount() rather
            // than this declaration is what the size is solved against. Left
            // in for parity with the page: if Satori ever honours it the lines
            // only get shorter, which cannot overflow the box.
            letterSpacing: -0.015 * size,
          },
          children: heading,
        },
      }],
    },
  };
}

// CSS blur(Npx) is a Gaussian whose standard deviation is N/2, which is the
// number Sharp wants — so the card can use the page's own figure without
// inventing a second one.
//
// The ratio is a fourteenth of the widest lobe, and the card's discs are
// seeded per slug rather than one fixed size, so it is applied to each card's
// own disc — the same ratio --glass-blur uses on the page. A blur only means
// anything relative to what it blurs: hard-coding a pixel count is exactly how
// the page's own blur came to be six times too strong for the disc it was
// softening. Both being the same ratio is also why the two blurs drop out of
// the chroma match above rather than having to be modelled.
function blurSigma(d) {
  return (DISC_HALF_W * d.r / 14) / 2;
}

function card(parts) {
  return { backdrop: backdrop(parts), foreground: foreground(parts), disc: parts.disc };
}

// Skip a render when the PNG is already newer than both the post and this
// script — keeps dev-server rebuilds instant.
function isFresh(outputPath, ...sourcePaths) {
  if (!fs.existsSync(outputPath)) return false;
  const outputTime = fs.statSync(outputPath).mtimeMs;
  return sourcePaths.every(source => fs.statSync(source).mtimeMs < outputTime);
}

async function generateOgImages(outputDir) {
  const satori = (await import("satori")).default;
  const sharp = require("sharp");
  const fontData = fs.readFileSync(FONT_PATH);

  fs.mkdirSync(outputDir, { recursive: true });

  async function rasterise(element) {
    const svg = await satori(element, {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: "volksans", data: fontData, weight: 600, style: "normal" }]
    });
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  async function render({ backdrop, foreground, disc }, outputPath) {
    // Blur the backdrop before the type lands on it, and extend the edges
    // first: a Gaussian samples past the canvas, so blurring in place drags
    // transparent nothing inwards and leaves a pale border all the way round.
    // Mirroring the edge out by 3σ and cutting it back off afterwards gives
    // the same result the page gets, where the backdrop continues past the
    // element being filtered.
    const sigma = blurSigma(disc);
    const pad = Math.ceil(sigma * 3);
    // Two pipelines, not one: Sharp resolves extend and extract in a fixed
    // order within a single chain, so asking for both at once crops the wrong
    // rectangle ("bad extract area").
    const padded = await sharp(await rasterise(backdrop))
      .extend({ top: pad, bottom: pad, left: pad, right: pad, extendWith: "mirror" })
      .blur(sigma)
      .toBuffer();
    const behind = await sharp(padded)
      .extract({ left: pad, top: pad, width: WIDTH, height: HEIGHT })
      .toBuffer();

    await sharp(behind)
      .composite([{ input: await rasterise(foreground) }])
      .png()
      .toFile(outputPath);
  }

  const jobs = [];
  for (const file of fs.readdirSync(POSTS_DIR)) {
    if (!file.endsWith(".md")) continue;
    const inputPath = path.join(POSTS_DIR, file);
    // Mirror Eleventy's fileSlug: strip the date prefix and extension.
    const slug = file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const outputPath = path.join(outputDir, `${slug}.png`);
    if (isFresh(outputPath, inputPath, __filename)) continue;

    const { data } = matter.read(inputPath);
    const hue1 = hueFromSlug(slug);
    jobs.push(render(card({
      slug,
      title: data.title || slug,
      hue1,
      hue2: (hue1 + HUE_OFFSET) % 360,
      disc: discFor(slug)
    }), outputPath));
  }

  const homePath = path.join(outputDir, "home.png");
  if (!isFresh(homePath, __filename)) {
    // The CSS fallback hue, and the same +65 the rest of the site uses, so the
    // card matches the face the page wears before random-gradients.js runs.
    jobs.push(render(card({
      slug: "home",
      title: "Ralph Hawkins",
      hue1: HUE_FALLBACK,
      hue2: (HUE_FALLBACK + HUE_OFFSET) % 360,
      disc: discFor("home")
    }), homePath));
  }

  await Promise.all(jobs);
  return jobs.length;
}

// Per-post favicon: the site's "R" mark over a flat tile of the post's colour,
// as an inline data URI (no extra file or request).
//
// The tile used to be the whole three-layer disc. None of that survived the
// size a favicon is actually seen at — 16px, where three overlapping gradients
// average into one patch — so the disc went and the colour it was carrying
// stayed. The mark is src/images/favicon.png, the same one every other page
// links to, embedded rather than linked so the icon stays a single resource.
let rMarkBase64;
function faviconDataUri(slug) {
  if (!rMarkBase64) {
    rMarkBase64 = fs.readFileSync(path.join(SRC_DIR, "images", "favicon.png")).toString("base64");
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${postColor(slug)}"/>` +
    `<image href="data:image/png;base64,${rMarkBase64}" x="7" y="7" width="50" height="50"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// The post's colour itself — the foot of its disc, undiluted, as hex. The foot
// rather than the head because that is where the colour actually is: the head
// is a near-white bloom carrying no chroma at all, so it would identify
// nothing.
//
// Distinct from overscrollColor below, which is the same colour mixed 20/80
// with the background. That mix is why the two read so
// differently: across the 53 posts, consecutive pairs sit a median ΔE 0.181
// apart undiluted but only 0.036 apart at 20%, and a third of them land under
// the ~0.02 it takes to tell two large flat areas apart at all. Anything
// meant to identify a post by its colour wants this one.
//
// A few posts do share a colour — 53 slugs hashed into 360 hue slots collide
// with near-certainty, and four of them currently do. Left alone deliberately.
// The fixes both cost more than the clash does: assigning hues by position
// would reshuffle every later post's colour whenever an earlier one is added,
// and adding a lightness axis would mean dropping chroma to about 0.098 to
// stay in gamut across the range, giving back a fifth of the blob's intensity.
function postColor(slug) {
  const hue = (hueFromSlug(slug) + HUE_OFFSET) % 360;
  const [r, g, b] = oklchToRgb(BLOB_L[2], blobChroma(2, hue), hue);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Overscroll colour: the same foot colour mixed 20/80 with the site
// background, precomputed to hex because it is set in an inline style on
// <html> rather than in the stylesheet. Reads the same layer the page does, so
// the iOS rubber-band area still matches the disc.
//
// This fed <meta name="theme-color"> too until the browser chrome was left
// alone; the 20% mix is the strength that tinting chrome wanted, and it stays
// because the rubber-band area sits directly against the page.
function overscrollColor(slug) {
  const hue = (hueFromSlug(slug) + HUE_OFFSET) % 360;
  const [r, g, b] = oklchToRgb(BLOB_L[2], blobChroma(2, hue), hue);
  // 20% colour over the #EBEDF0 background
  const background = [235, 237, 240];
  return "#" + [r, g, b]
    .map((v, i) => Math.round(0.2 * v + 0.8 * background[i]).toString(16).padStart(2, "0"))
    .join("");
}

module.exports = { generateOgImages, slugHash, hueFromSlug, faviconDataUri, postColor, overscrollColor };

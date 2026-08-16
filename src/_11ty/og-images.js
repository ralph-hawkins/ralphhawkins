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

function titleFontSize(title) {
  if (title.length <= 22) return 112;
  return 96;
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
function lineCount(text, fontSize, width) {
  const space = metrics.width(" ", fontSize);
  let lines = 1;
  let used = 0;
  for (const piece of segments(text)) {
    const gap = piece.space ? space : 0;
    const w = metrics.width(piece.text, fontSize);
    if (used > 0 && used + gap + w > width) { lines++; used = w; }
    else used += gap + w;
  }
  return lines;
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

const PADDING = 72;

// THE POSTER GRID, ON THE CARD
// ---------------------------------------------------------------------------
// The card is the page's own poster at five columns. Not a lookalike: it takes
// the module straight from poster-grid.js, the layout from poster-layouts.js
// and the fitted type size from title-fit.js, so a card is the composition its
// post opens on rather than a second design that has to be kept in step.
//
// Five columns because that is what 1200px asks for. The site's module is
// 211.89px, five of them is 1059.47, and the margin either side comes to 70.3
// — within two pixels of the 72 this card already used. The row works out at
// 93.6px, three page lines, which is exactly what the site gives a 1440px
// window.
//
// Satori has no CSS grid, so every item is placed absolutely from these
// numbers. That is the reason the grid lives in a table of line names rather
// than in the stylesheet: the same table can be read by something that cannot
// run CSS at all.
const { moduleWidth } = require("./poster-grid.js");
const { posterFit } = require("./title-fit.js");
const posterLayouts = require("./poster-layouts.js");

const CARD_COLS = 5;
const CARD_MODULE = moduleWidth;
const PAGE_LINE = 1.3 * 16 * 1.5;          // --font-size-base x --line-height-base
const BASELINE = PAGE_LINE / 8;            // the poster's baseline grid
const CARD_GUTTER = PAGE_LINE;

const SHEET_W = CARD_COLS * CARD_MODULE;
const SHEET_X = (WIDTH - SHEET_W) / 2;
const CARD_ROW = Math.max(
  PAGE_LINE,
  Math.floor(((HEIGHT - 2 * PADDING) - 3 * CARD_GUTTER) / 4 / PAGE_LINE) * PAGE_LINE
);
const SHEET_H = 4 * CARD_ROW + 3 * CARD_GUTTER;
const SHEET_Y = (HEIGHT - SHEET_H) / 2;

// Column line names to x, row line names to y — the same names the layout
// table uses, so a placement reads identically here and in poster.css.
const COL_X = {
  "sheet-start": 0, "body-start": 1, "body-2": 2, "body-3": 3,
  "body-end": 4, "sheet-end": 5,
};
const colX = (name) => SHEET_X + COL_X[name] * CARD_MODULE;
const rowY = (name) => SHEET_Y + (Number(name.slice(1)) - 1) * (CARD_ROW + CARD_GUTTER);
// A grid area stops at the start of its end line, not past the gutter before it.
const areaBottom = (name) => rowY(name) - CARD_GUTTER;

// Leadings are rounded to the baseline exactly as poster.css rounds them, so
// the card's type sits on the same rhythm.
const snap = (v) => Math.round(v / BASELINE) * BASELINE;

const TYPE = {
  label: { size: 0.92 * 16, leading: snap(1.25 * 0.92 * 16) },
  value: { size: 1.85 * 16, leading: snap(1.05 * 1.85 * 16) },
  standfirst: { size: 1.85 * 16, leading: snap(1.325 * 1.85 * 16) },
};

// Where an item's box sits and how tall it is, from its layout spec.
function place(spec, height) {
  const [c0, c1] = spec.wide;
  const top = spec.align === "end" ? areaBottom(spec.rows[1]) - height : rowY(spec.rows[0]);
  return { left: colX(c0), top, width: colX(c1) - colX(c0) };
}

const TITLE_MAX_WIDTH = 950;
// The same leading .page-title carries in src/css/typography.css, so a title
// sets the same way on the card as it does on the page it links to.
//
// Measured floor is 0.906, where the tightest pair of lines across the 53
// titles touches — "You don't always need to go from left to right", whose
// "y" descender lands over a "d" ascender. 0.975 clears it by 6.6px at the
// card's 96px type. Remeasure if the titles or the face change.
//
// Measuring this needs care: grouping the rendered rows into ink bands and
// taking the smallest gap gives 7px at every leading, because the dot of an
// "i" is its own band a fixed distance above its letters. Bands have to be
// grouped into lines first.
const TITLE_LINE_HEIGHT = 0.975;

// The title's first line sits at the vertical mid-point of the card. Long
// titles that would run past the bottom padding get nudged up just enough to
// fit. The line count is measured from the font's own advance widths, where it
// used to be estimated at ~0.5em a character — an estimate that ran 9% short
// on one title and 12% long on another, so the nudge was applied to the wrong
// titles.
function titleTop(title, fontSize) {
  const lines = lineCount(title, fontSize, balancedWidth(title, fontSize, TITLE_MAX_WIDTH));
  const height = lines * fontSize * TITLE_LINE_HEIGHT;
  return Math.round(Math.min(HEIGHT / 2, HEIGHT - PADDING - height));
}

// The page's surface: one flat tint of the background laid over the whole
// blob, at the same strength as --glass-opacity in src/css/variables.css —
// keep the two in step. It replaced a stack of 15 bars easing from clear at
// the top to a 75% tint at the bottom, which is what the header used to do
// and no longer does; the card drew them long after the site had dropped them.
//
// **Deliberately not --glass-opacity's 60%.** The card is one flat surface
// where the page is two, and it is looked at once, small, in a timeline —
// so it is allowed to be the louder of the two. At 25% the disc carries
// 1.9× the chroma it did at 60%.
//
// The blur is the page's, applied in render() rather than here: Satori has no
// backdrop-filter, so the backdrop is rendered, blurred and composited under
// the type in two passes.
const GLASS_OPACITY = 0.25;

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

// The card's type, laid out on the poster's grid.
//
// Every measurement comes from the same places the page uses: the size from
// title-fit.js, the placement from poster-layouts.js, the leadings snapped to
// the same baseline. Nothing here is a card-specific number except the five
// columns, and that follows from 1200px.
//
// No crop. On a wide sheet no title crops — measured across all 54 — and the
// card is always a wide sheet, so the one part of the poster that needs the
// title clipped to an em box has nothing to do here.
function foreground({ title, weekNote, published, description, footer, slug }) {
  const text = (value, style) => ({ type: "div", props: { style, children: value } });
  const children = [];
  const heading = drawable(title);

  const fit = posterFit(heading);
  const titleWidth = 4 * CARD_MODULE;            // body-start to sheet-end
  // The line count is decided by the fit, not by the size, because the page
  // sets the title in a box measured in em — so the layout can be chosen
  // before the size is, and the size can then be capped without moving a
  // single break.
  const lines = fit ? fit.lines : lineCount(heading, titleFontSize(heading), titleWidth);
  const layout = posterLayouts.pick(slug || "home", lines, Boolean(description));
  const specs = { ...layout.items, standfirst: posterLayouts.STANDFIRST };

  // The same three terms poster.css takes the smallest of: the fit, the 16rem
  // ceiling, and the rows the layout gave it. The third one is easy to forget
  // and its absence is not subtle — without it a three-line title overflowed
  // its rows upward and started 3px from the top of the card.
  const span = posterLayouts.rowSpan(specs.title);
  const budget = span * CARD_ROW + (span - 1) * CARD_GUTTER - lines * BASELINE;
  let size = Math.min(
    fit ? fit.fitWide * titleWidth : titleFontSize(heading),
    16 * 16,
    budget / (lines * 0.9)
  );

  // And then shrink until the card's own measurement agrees with the fitter's
  // line count. The fit models letter-spacing of -0.015em, which is 26px over
  // the thirteen characters of "Ralph Hawkins" — and Satori does not apply
  // letter-spacing in either em or px, so the line came out 874px in an 848px
  // box, wrapped to two, and a block anchored to its bottom ran off the card.
  // Rather than trust a property that is quietly ignored, the size is checked
  // against lineCount(), which measures advance widths the same way Satori
  // lays them out. If Satori ever does honour it the line only gets shorter,
  // which this still allows.
  while (size > 12 && lineCount(heading, size, titleWidth) > lines) size -= 1;
  const leading = snap(0.9 * size);

  const block = (spec, height, style, value) => {
    const at = place(spec, height);
    children.push(text(value, {
      position: "absolute",
      left: at.left,
      top: at.top,
      width: at.width,
      color: "#0b0c0c",
      ...style,
    }));
  };

  // A metadata pair is a label over a value, both 600, the value tabular.
  const meta = (spec, label, value) => {
    if (!value) return;
    const height = TYPE.label.leading + TYPE.value.leading;
    const at = place(spec, height);
    children.push({
      type: "div",
      props: {
        style: {
          position: "absolute", left: at.left, top: at.top,
          display: "flex", flexDirection: "column", color: "#0b0c0c",
        },
        children: [
          text(label, { fontSize: TYPE.label.size, lineHeight: TYPE.label.leading / TYPE.label.size }),
          text(value, { fontSize: TYPE.value.size, lineHeight: TYPE.value.leading / TYPE.value.size }),
        ],
      },
    });
  };

  // The title sits on the bottom line of its rows, as it does on the page.
  block(
    specs.title,
    lines * leading,
    {
      fontSize: size,
      lineHeight: leading / size,
      // In px, not em. title-fit.js models -0.015em and the fit depends on it
      // — over the thirteen characters of "Ralph Hawkins" it is 26px at this
      // size, the difference between one line and two. Satori did not apply
      // the em form, so the title overflowed its box, wrapped, and a block
      // anchored to its bottom ran off the card.
      letterSpacing: -0.015 * size,
      width: titleWidth,
    },
    heading
  );

  if (description) {
    const at = place(specs.standfirst, 0);
    const sfLines = lineCount(drawable(description), TYPE.standfirst.size, at.width);
    block(
      specs.standfirst,
      sfLines * TYPE.standfirst.leading,
      {
        fontSize: TYPE.standfirst.size,
        lineHeight: TYPE.standfirst.leading / TYPE.standfirst.size,
      },
      drawable(description)
    );
  }

  meta(specs.index, "Week note", weekNote);
  meta(specs.date, "Published", published);

  // The home card has no facts to place, only a wordmark and a URL.
  if (footer) {
    children.push(text(drawable(footer), {
      position: "absolute",
      bottom: PADDING,
      left: SHEET_X,
      fontSize: TYPE.value.size,
      color: "#0b0c0c",
    }));
  }

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
      children,
    },
  };
}

// CSS blur(Npx) is a Gaussian whose standard deviation is N/2, which is the
// number Sharp wants — so the card can use the page's own figure without
// inventing a second one.
//
// The ratio is a fourteenth of the widest lobe, and the card's discs are
// seeded per slug rather than one fixed size, so it is applied to each card's
// own disc. The page used the same figure in --glass-blur until 2026-08-16,
// when main went opaque and stopped being a filtered surface; the card is now
// the only place it survives. A blur only means anything relative to what it
// blurs — hard-coding a pixel count is exactly how the page's own blur came to
// be six times too strong for the disc it was softening.
function blurSigma(d) {
  return (DISC_HALF_W * d.r / 14) / 2;
}

function card(parts) {
  return { backdrop: backdrop(parts), foreground: foreground(parts), disc: parts.disc };
}

// dd.MM.yyyy, the same shape the poster sets — a date there is a block on the
// grid rather than a sentence, which is why it is numeric and tabular.
function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/London"
  }).format(date).replace(/\//g, ".");
}

// The week note's own number, the way collections.publicWeeknotes gets it:
// every non-preview post in date order, oldest first. Front matter is enough —
// that collection is date-sorted too — so the card does not need Eleventy.
function weekNumbers() {
  const posts = [];
  for (const file of fs.readdirSync(POSTS_DIR)) {
    if (!file.endsWith(".md")) continue;
    const inputPath = path.join(POSTS_DIR, file);
    const { data } = matter.read(inputPath);
    if (data.preview) continue;
    posts.push({ file, date: new Date(data.date) });
  }
  posts.sort((a, b) => a.date - b.date);
  return new Map(posts.map((p, i) => [p.file, i + 1]));
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
  const numbers = weekNumbers();
  // The revision count and the publish time both come from git, the same
  // source the colophon and the poster read, so a card says what the page
  // says. Guarded: a post that git has never seen still gets a card, just
  // without the fraction.
  let versionOf = () => null;
  try {
    const { postVersion } = require("./post-versions.js");
    versionOf = postVersion;
  } catch {}

  for (const file of fs.readdirSync(POSTS_DIR)) {
    if (!file.endsWith(".md")) continue;
    const inputPath = path.join(POSTS_DIR, file);
    // Mirror Eleventy's fileSlug: strip the date prefix and extension.
    const slug = file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const outputPath = path.join(outputDir, `${slug}.png`);
    if (isFresh(outputPath, inputPath, __filename)) continue;

    const { data } = matter.read(inputPath);
    const hue1 = hueFromSlug(slug);
    const version = versionOf(inputPath);
    const number = numbers.get(file);
    const when = (version && version.published) || data.date;
    jobs.push(render(card({
      slug,
      title: data.title || slug,
      description: data.description || null,
      weekNote: number ? `${number}${version ? "." + version.iteration : ""}` : null,
      published: when ? formatDate(new Date(when)) : null,
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
      footer: "ralphhawkins.co.uk",
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

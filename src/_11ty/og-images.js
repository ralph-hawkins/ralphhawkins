// Build-time Open Graph images (1200×630) for week notes and the homepage.
// Each card recreates the site's gradient blob (same three-radial-gradient
// recipe as base.css) with hues seeded from the post's slug, so every post
// gets its own colourway that is stable across builds.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const WIDTH = 1200;
const HEIGHT = 630;
const SRC_DIR = path.join(__dirname, "..");
const POSTS_DIR = path.join(SRC_DIR, "posts", "weeknotes");
const FONT_PATH = path.join(SRC_DIR, "fonts", "volksans", "volksans-SemiBold.woff");

// djb2 hash → base hue. The site picks hues at random on each visit; here the
// slug stands in for the dice roll so the card matches itself forever.
// How far the disc's second hue sits from its first, and the hue the CSS falls
// back to before random-gradients.js has run. Both are mirrored in
// src/css/variables.css and src/js/random-gradients.js — keep the three in step.
const HUE_OFFSET = 65;
const HUE_FALLBACK = 70;

function hueFromSlug(slug) {
  let hash = 5381;
  for (const char of slug) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return hash % 360;
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
// washes the first hue out. Each pair is at the most chroma sRGB holds at that
// lightness for every hue, measured across 360°.
//
// These must stay in step with the oklch() values in src/css/variables.css.
const BLOB_L = [0.99, 0.8, 0.74];
const BLOB_C = [0, 0.095, 0.118];

// oklch → sRGB, clamped to 0–255. Done here rather than left to CSS because
// Satori parses the card's colours itself and can't be relied on for oklch(),
// and <meta name="theme-color"> takes a plain hex.
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
  const [r, g, b] = oklchToRgb(BLOB_L[lobe], BLOB_C[lobe], hue);
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Same disc as body::before (see --blob-gradient in src/css/variables.css),
// sized off the canvas rather than the viewport and pushed toward the
// top-right so the title sits on plain ground.
const DISC_R = 200;
const DISC_X = 940;
const DISC_Y = 260;
const disc = (rx, ry, dy) =>
  `ellipse ${Math.round(DISC_R * rx)}px ${Math.round(DISC_R * ry)}px` +
  ` at ${DISC_X}px ${Math.round(DISC_Y + DISC_R * dy)}px`;

function blobBackground(hue1, hue2) {
  return [
    `radial-gradient(${disc(0.72, 0.56, -0.46)}, ${blobColor(0, hue1)}, ${blobColor(0, hue1, 0.72)} 40%, ${blobColor(0, hue1, 0)} 100%)`,
    `radial-gradient(${disc(1, 0.85, -0.2)}, ${blobColor(1, hue1, 0.95)}, ${blobColor(1, hue1, 0.55)} 45%, ${blobColor(1, hue1, 0)} 100%)`,
    `radial-gradient(${disc(1.15, 1, 0.08)}, ${blobColor(2, hue2)}, ${blobColor(2, hue2, 0.85)} 68%, ${blobColor(2, hue2, 0)} 92%)`
  ].join(", ");
}

function titleFontSize(title) {
  if (title.length <= 22) return 112;
  return 96;
}

const PADDING = 72;
const TITLE_MAX_WIDTH = 950;
const TITLE_LINE_HEIGHT = 1.08;

// The title's first line sits at the vertical mid-point of the card. Long
// titles that would run past the bottom padding get nudged up just enough to
// fit; line count is estimated from average glyph width (~0.5em for volksans).
function titleTop(title, fontSize) {
  const charsPerLine = TITLE_MAX_WIDTH / (fontSize * 0.5);
  const lines = Math.max(1, Math.ceil(title.length / charsPerLine));
  const height = lines * fontSize * TITLE_LINE_HEIGHT;
  return Math.round(Math.min(HEIGHT / 2, HEIGHT - PADDING - height));
}

// The page's surface: one flat tint of the background laid over the whole
// blob, at the same strength as --glass-opacity in src/css/variables.css —
// keep the two in step. It replaced a stack of 15 bars easing from clear at
// the top to a 75% tint at the bottom, which is what the header used to do
// and no longer does; the card drew them long after the site had dropped them.
//
// The page also blurs, but only under the post body, which the card has no
// equivalent of — and over a gradient this smooth the tint alone reads the
// same, which is why Satori's lack of backdrop-filter costs nothing here.
const GLASS_OPACITY = 0.6;

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

function card({ kicker, title, footer, hue1, hue2 }) {
  const text = (value, style) => ({ type: "div", props: { style, children: value } });
  const children = [glassTint()];

  if (kicker) {
    children.push(text(kicker, { fontSize: 60, color: "#0b0c0c" }));
  }

  const fontSize = titleFontSize(title);
  children.push(text(title, {
    position: "absolute",
    top: titleTop(title, fontSize),
    left: PADDING,
    fontSize,
    color: "#0b0c0c",
    lineHeight: TITLE_LINE_HEIGHT,
    letterSpacing: "-0.01em",
    maxWidth: TITLE_MAX_WIDTH
  }));

  if (footer) {
    children.push(text(footer, {
      position: "absolute",
      bottom: PADDING,
      left: PADDING,
      fontSize: 30,
      color: "#0b0c0c"
    }));
  }

  return {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        padding: PADDING,
        backgroundColor: "#EBEDF0",
        backgroundImage: blobBackground(hue1, hue2),
        fontFamily: "volksans"
      },
      children
    }
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  }).format(date);
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

  async function render(element, outputPath) {
    const svg = await satori(element, {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: "volksans", data: fontData, weight: 600, style: "normal" }]
    });
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
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
      kicker: data.date ? formatDate(data.date) : null,
      title: data.title || slug,
      hue1,
      hue2: (hue1 + HUE_OFFSET) % 360
    }), outputPath));
  }

  const homePath = path.join(outputDir, "home.png");
  if (!isFresh(homePath, __filename)) {
    // The CSS fallback hue, and the same +65 the rest of the site uses, so the
    // card matches the face the page wears before random-gradients.js runs.
    jobs.push(render(card({
      title: "Ralph Hawkins",
      footer: "ralphhawkins.co.uk",
      hue1: HUE_FALLBACK,
      hue2: (HUE_FALLBACK + HUE_OFFSET) % 360
    }), homePath));
  }

  await Promise.all(jobs);
  return jobs.length;
}

// Per-post favicon: the same three-layer disc on a rounded tile, with the
// site's "R" mark (favicon.png) over it, as an inline data URI (no extra file
// or request).
let rMarkBase64;
function faviconDataUri(slug) {
  const hue1 = hueFromSlug(slug);
  const hue2 = (hue1 + HUE_OFFSET) % 360;
  if (!rMarkBase64) {
    rMarkBase64 = fs.readFileSync(path.join(SRC_DIR, "images", "favicon.png")).toString("base64");
  }
  // Sized so the disc nearly fills the tile — at the 16px this usually renders
  // at, the colour has to reach the edges to register at all.
  const R = 26, CX = 32, CY = 30;
  const el = (rx, ry, dy, id) =>
    `<ellipse cx="${CX}" cy="${Math.round(CY + R * dy)}"` +
    ` rx="${Math.round(R * rx)}" ry="${Math.round(R * ry)}" fill="url(#${id})"/>`;
  const grad = (id, lobe, hue, a0, a1, off1, off2) =>
    `<radialGradient id="${id}">` +
    `<stop offset="0" stop-color="${blobColor(lobe, hue)}" stop-opacity="${a0}"/>` +
    `<stop offset="${off1}" stop-color="${blobColor(lobe, hue)}" stop-opacity="${a1}"/>` +
    `<stop offset="${off2}" stop-color="${blobColor(lobe, hue)}" stop-opacity="0"/>` +
    `</radialGradient>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<defs>` +
    grad("a", 0, hue1, "1", "0.72", "0.4", "1") +
    grad("b", 1, hue1, "0.95", "0.55", "0.45", "1") +
    grad("c", 2, hue2, "1", "0.85", "0.68", "0.92") +
    `<clipPath id="k"><rect width="64" height="64" rx="14"/></clipPath>` +
    `</defs>` +
    `<rect fill="#EBEDF0" width="64" height="64" rx="14"/>` +
    `<g clip-path="url(#k)">` +
    el(1.15, 1, 0.08, "c") + el(1, 0.85, -0.2, "b") + el(0.72, 0.56, -0.46, "a") +
    `</g>` +
    `<image href="data:image/png;base64,${rMarkBase64}" x="7" y="7" width="50" height="50"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// The post's colour itself — the foot of its disc, undiluted, as hex. The foot
// rather than the head because that is where the colour actually is: the head
// is a near-white bloom carrying no chroma at all, so it would identify
// nothing.
//
// Distinct from themeColor below, which is the same colour mixed 20/80 with
// the background for browser chrome. That mix is why the two read so
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
  const [r, g, b] = oklchToRgb(BLOB_L[2], BLOB_C[2], hue);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Browser-chrome theme colour: the same foot colour mixed 20/80 with the site
// background, precomputed to hex because <meta name="theme-color"> can't use
// color-mix(). Reads the same layer the page does, so the chrome and the
// rubber-band area still match the disc.
function themeColor(slug) {
  const hue = (hueFromSlug(slug) + HUE_OFFSET) % 360;
  const [r, g, b] = oklchToRgb(BLOB_L[2], BLOB_C[2], hue);
  // 20% colour over the #EBEDF0 background
  const background = [235, 237, 240];
  return "#" + [r, g, b]
    .map((v, i) => Math.round(0.2 * v + 0.8 * background[i]).toString(16).padStart(2, "0"))
    .join("");
}

module.exports = { generateOgImages, hueFromSlug, faviconDataUri, postColor, themeColor };

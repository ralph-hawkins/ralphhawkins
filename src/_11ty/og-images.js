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
function hueFromSlug(slug) {
  let hash = 5381;
  for (const char of slug) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

// Same lobes as body::before in base.css, sized for a 1200×630 canvas and
// pushed toward the top-right so the text sits on plain background.
function blobBackground(hue1, hue2) {
  return [
    `radial-gradient(circle 560px at 1000px 140px, hsla(${hue1}, 90%, 72%, 1), hsla(${hue1}, 90%, 72%, 0.82) 45%, hsla(${hue1}, 90%, 72%, 0) 78%)`,
    `radial-gradient(circle 680px at 900px 380px, hsla(${hue2}, 75%, 70%, 1), hsla(${hue2}, 75%, 70%, 0.52) 50%, hsla(${hue2}, 75%, 70%, 0) 82%)`,
    `radial-gradient(ellipse 1600px 1150px at 940px 460px, hsla(${hue2}, 70%, 72%, 0.42), hsla(${hue2}, 70%, 72%, 0) 70%)`
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

// The header's transparency effect (header-bars.js): stacked bars easing from
// clear at the top to a 75% background tint at the bottom. Satori has no
// backdrop blur, but over a smooth gradient the tint alone reads the same.
function headerBars() {
  const BARS = 15;
  const OPACITY_STEP = 0.05;
  const bars = [];
  for (let i = 0; i < BARS; i++) {
    const t = i / BARS;
    const ease = 1 - (1 - t) * (1 - t);
    const opacity = (ease * BARS * OPACITY_STEP).toFixed(2);
    bars.push({
      type: "div",
      props: {
        style: {
          position: "absolute",
          left: 0,
          // 630 / 15 = 42 exactly, so bars abut with no gap and no overlap —
          // an overlap would double the tint and draw a hairline.
          top: (i * HEIGHT) / BARS,
          width: WIDTH,
          height: HEIGHT / BARS,
          backgroundColor: `rgba(235, 237, 240, ${opacity})`
        }
      }
    });
  }
  return bars;
}

function card({ kicker, title, footer, hue1, hue2 }) {
  const text = (value, style) => ({ type: "div", props: { style, children: value } });
  const children = [...headerBars()];

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
      hue2: (hue1 + 40) % 360
    }), outputPath));
  }

  const homePath = path.join(outputDir, "home.png");
  if (!isFresh(homePath, __filename)) {
    // The CSS fallback hues (70/130) so the card matches the site's default face.
    jobs.push(render(card({
      title: "Ralph Hawkins",
      footer: "ralphhawkins.co.uk",
      hue1: 70,
      hue2: 130
    }), homePath));
  }

  await Promise.all(jobs);
  return jobs.length;
}

// Per-post favicon: the post's two blob lobes as soft radial gradients on a
// rounded tile, with the site's "R" mark (favicon.png) layered on top, as an
// inline data URI (no extra file or request).
let rMarkBase64;
function faviconDataUri(slug) {
  const hue1 = hueFromSlug(slug);
  const hue2 = (hue1 + 40) % 360;
  if (!rMarkBase64) {
    rMarkBase64 = fs.readFileSync(path.join(SRC_DIR, "images", "favicon.png")).toString("base64");
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<defs>` +
    `<radialGradient id="a"><stop offset="0" stop-color="hsl(${hue1},90%,72%)"/><stop offset="0.45" stop-color="hsla(${hue1},90%,72%,0.82)"/><stop offset="0.78" stop-color="hsla(${hue1},90%,72%,0)"/></radialGradient>` +
    `<radialGradient id="b"><stop offset="0" stop-color="hsl(${hue2},75%,70%)"/><stop offset="0.5" stop-color="hsla(${hue2},75%,70%,0.52)"/><stop offset="0.82" stop-color="hsla(${hue2},75%,70%,0)"/></radialGradient>` +
    `<clipPath id="c"><rect width="64" height="64" rx="14"/></clipPath>` +
    `</defs>` +
    `<rect fill="#EBEDF0" width="64" height="64" rx="14"/>` +
    `<g clip-path="url(#c)">` +
    `<circle cx="42" cy="18" r="34" fill="url(#a)"/>` +
    `<circle cx="28" cy="42" r="44" fill="url(#b)"/>` +
    `</g>` +
    `<image href="data:image/png;base64,${rMarkBase64}" x="7" y="7" width="50" height="50"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

module.exports = { generateOgImages, hueFromSlug, faviconDataUri };

// Per-page transfer weight for the post colophon, measured after the build
// from the files that actually ship.
//
// Compression: GitHub Pages serves text assets gzipped and binary assets
// untouched. It never negotiates brotli — asking for `br` returns the file
// uncompressed. Probing the live site, the Content-Length it reports matches
// zlib's gzip at level 5 exactly (verified against main.css, and against the
// notes-list and graphic-design documents; a 1.4 kB XML file came out a byte
// apart, which is gzip header noise). So level 5 here is not a model of the
// bytes a visitor receives, it reproduces them.
//
// The weight has to be measured after Eleventy writes its HTML, because the
// number counts the document that contains it — see solve() below.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const GZIP_LEVEL = 5;

// What the host compresses on the way out. Fonts and images are already
// compressed formats and ship as-is.
const TEXT_EXTENSIONS = new Set([".html", ".css", ".js", ".svg", ".xml", ".json", ".txt"]);

// Rendered into the colophon by post.njk and substituted here.
const TOKEN = "@@PAGE_WEIGHT_KB@@";

// Dropped from the page when a weight can't be worked out, so a failed
// measurement loses the row rather than shipping a placeholder.
const ROW = /\n?\s*<dt>Weight<\/dt>\s*<dd>@@PAGE_WEIGHT_KB@@[^<]*<\/dd>/;

function transferSize(filePath) {
  const bytes = fs.readFileSync(filePath);
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())
    ? zlib.gzipSync(bytes, { level: GZIP_LEVEL }).length
    : bytes.length;
}

function gzipLength(text) {
  return zlib.gzipSync(Buffer.from(text, "utf8"), { level: GZIP_LEVEL }).length;
}

// Every root-relative subresource the document causes a browser to fetch.
//
// Preloaded fonts are counted because a preload is fetched whether or not the
// page ends up using the face. The PNG favicon is not: post pages declare an
// SVG one after it as a data URI, which browsers prefer and which is already
// inside the HTML being weighed. The Open Graph card is not either — that is
// fetched by crawlers, never by the page.
const PATTERNS = [
  /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="(\/[^"]+)"/g,
  /<link\b[^>]*\brel="preload"[^>]*\bhref="(\/[^"]+)"/g,
  /<script\b[^>]*\bsrc="(\/[^"]+)"/g,
  /<img\b[^>]*\bsrc="(\/[^"]+)"/g,
];

function subresources(html) {
  const urls = new Set();
  for (const pattern of PATTERNS) {
    for (const match of html.matchAll(pattern)) urls.add(match[1]);
  }
  return urls;
}

// Thousands separators, so an image-heavy post reads "10,521 kB" rather than
// "10521 kB". Done by hand rather than with toLocaleString so the output
// can't shift with the build machine's locale or ICU build.
function thousands(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// The figure is part of the page it describes, so it can't simply be read off
// once: writing "137" changes the document, which changes its gzipped size.
// Substitute a candidate, weigh the result, and repeat until the answer stops
// moving. One or two passes in practice — the digits are worth a byte or two
// compressed, and whole-kB rounding absorbs that. The candidate is formatted
// before substitution, since the comma is a byte that ships too. If it ever
// oscillates between two adjacent values, settle on the repeat rather than
// spin.
function solve(template, assetBytes) {
  let display = "0";
  let kb = 0;
  const seen = new Set();
  for (let pass = 0; pass < 8; pass++) {
    const html = template.split(TOKEN).join(display);
    const total = gzipLength(html) + assetBytes;
    kb = Math.round(total / 1024);
    const next = thousands(kb);
    if (next === display) return { display, kb, total, settled: true };
    if (seen.has(next)) return { display: next, kb, total, settled: false };
    seen.add(next);
    display = next;
  }
  return { display, kb, total: null, settled: false };
}

function weighPage(htmlPath, outputDir) {
  const template = fs.readFileSync(htmlPath, "utf8");
  if (!template.includes(TOKEN)) return null;

  const breakdown = [];
  const missing = [];
  let assetBytes = 0;

  for (const url of subresources(template)) {
    const assetPath = path.join(outputDir, url.replace(/^\//, ""));
    if (!fs.existsSync(assetPath)) {
      missing.push(url);
      continue;
    }
    const size = transferSize(assetPath);
    assetBytes += size;
    breakdown.push({ url, size });
  }

  if (missing.length > 0) {
    fs.writeFileSync(htmlPath, template.replace(ROW, ""));
    return { htmlPath, missing, dropped: true };
  }

  const { display, kb, total, settled } = solve(template, assetBytes);
  fs.writeFileSync(htmlPath, template.split(TOKEN).join(display));

  return {
    htmlPath,
    kb,
    display,
    total,
    settled,
    assetBytes,
    htmlBytes: total === null ? null : total - assetBytes,
    breakdown,
    dropped: false,
  };
}

function htmlFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...htmlFiles(full));
    else if (entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

function weighPages(outputDir) {
  const results = [];
  for (const file of htmlFiles(outputDir)) {
    const result = weighPage(file, outputDir);
    if (result) results.push(result);
  }
  return results;
}

module.exports = { weighPages, weighPage, transferSize, GZIP_LEVEL, TOKEN };

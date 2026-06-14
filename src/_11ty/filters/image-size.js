const fs = require("fs");
const path = require("path");

// Read intrinsic pixel dimensions straight from an image file's header.
// Zero-dependency: parses PNG, JPEG, GIF and WebP signatures. Used at build
// time to stamp width/height on <img> so the browser can reserve space and
// avoid layout shift (CLS). Returns null for anything it can't read, so the
// template simply omits the attributes rather than breaking the build.
//
// Note: EXIF orientation is not honoured — none of this site's images carry a
// rotation flag. If a rotated photo is ever added, add orientation handling
// here so the reserved box matches the displayed (rotated) dimensions.

function fromBuffer(buf) {
  if (buf.length < 24) return null;

  // PNG: 8-byte signature, then IHDR with width/height as big-endian uint32.
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF: "GIF8", logical screen width/height as little-endian uint16.
  if (buf.toString("ascii", 0, 4) === "GIF8") {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP: RIFF container, "WEBP" at offset 8, then a VP8/VP8L/VP8X chunk.
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const fmt = buf.toString("ascii", 12, 16);
    if (fmt === "VP8 ") {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (fmt === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (fmt === "VP8X") {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { width, height };
    }
    return null;
  }

  // JPEG: walk the marker segments until a Start-Of-Frame (SOFn) carries the
  // frame dimensions. Skip APPn/COM/quantisation etc. by their length field.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xff) { offset++; continue; }
      const marker = buf[offset + 1];
      // Standalone markers (no length): RSTn (D0-D7), SOI/EOI, TEM.
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        offset += 2;
        continue;
      }
      const len = buf.readUInt16BE(offset + 2);
      // SOF markers carry dimensions; exclude DHT(C4), DAC(CC) and RSTn.
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      offset += 2 + len;
    }
  }

  return null;
}

// Resolve a site-absolute image URL (e.g. "/images/foo.jpg") to its source
// file and read its dimensions. Cached so repeated references in a build only
// touch the disk once.
const cache = new Map();

function imageSize(url) {
  if (!url || typeof url !== "string" || !url.startsWith("/")) return null;
  if (cache.has(url)) return cache.get(url);

  const filePath = path.join(__dirname, "..", "..", url.replace(/^\//, ""));
  let result = null;
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(65536);
    const bytes = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    result = fromBuffer(buf.subarray(0, bytes));
  } catch (e) {
    result = null;
  }

  cache.set(url, result);
  return result;
}

module.exports = { imageSize };

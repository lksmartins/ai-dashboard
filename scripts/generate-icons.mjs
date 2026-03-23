/**
 * Generates PWA icons as PNG files using pure Node.js (no canvas dependency).
 * Creates minimal valid PNG files with the app's color scheme.
 * Run with: node scripts/generate-icons.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "../public/icons");

mkdirSync(iconsDir, { recursive: true });

// CRC32 lookup table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint32BE(n) {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function deflateRaw(data) {
  // Simple store compression (type 0, uncompressed)
  const chunks = [];
  const BLOCK_SIZE = 65535;
  for (let i = 0; i < data.length; i += BLOCK_SIZE) {
    const block = data.slice(i, i + BLOCK_SIZE);
    const isLast = i + BLOCK_SIZE >= data.length;
    const len = block.length;
    const nlen = (~len) & 0xffff;
    chunks.push(
      isLast ? 1 : 0,
      len & 0xff, (len >>> 8) & 0xff,
      nlen & 0xff, (nlen >>> 8) & 0xff,
      ...block
    );
  }
  return new Uint8Array(chunks);
}

function adler32(data) {
  let a = 1, b = 0;
  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return (b << 16) | a;
}

function zlib(data) {
  const raw = deflateRaw(data);
  const adler = adler32(data);
  return new Uint8Array([
    0x78, 0x01, // zlib header (deflate, no dict)
    ...raw,
    (adler >>> 24) & 0xff, (adler >>> 16) & 0xff, (adler >>> 8) & 0xff, adler & 0xff,
  ]);
}

function pngChunk(type, data) {
  const typeBytes = type.split("").map((c) => c.charCodeAt(0));
  const crcData = [...typeBytes, ...data];
  const crc = crc32(crcData);
  return [
    ...uint32BE(data.length),
    ...typeBytes,
    ...data,
    ...uint32BE(crc),
  ];
}

function createPNG(size, bgR, bgG, bgB, maskable = false) {
  const width = size;
  const height = size;

  // Build raw image data (RGBA)
  const pixels = new Uint8Array(width * height * 4);

  // Background color
  const bg = [bgR, bgG, bgB, 255];

  // For maskable icons: safe zone is inner 80% (Google's spec)
  const safeMargin = maskable ? Math.floor(size * 0.1) : 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Background
      pixels[idx] = bg[0];
      pixels[idx + 1] = bg[1];
      pixels[idx + 2] = bg[2];
      pixels[idx + 3] = bg[3];
    }
  }

  // Draw "AI" text as pixel art centered in safe zone
  const innerSize = size - safeMargin * 2;
  const cx = size / 2;
  const cy = size / 2;

  // Accent color: a nice blue-purple
  const accent = [139, 92, 246, 255]; // violet-500

  // Draw a rounded rect border inside safe zone
  const borderThickness = Math.max(2, Math.floor(innerSize * 0.04));
  const cornerRadius = Math.floor(innerSize * 0.15);
  const rectLeft = safeMargin + Math.floor(innerSize * 0.08);
  const rectTop = safeMargin + Math.floor(innerSize * 0.08);
  const rectRight = size - safeMargin - Math.floor(innerSize * 0.08);
  const rectBottom = size - safeMargin - Math.floor(innerSize * 0.08);

  for (let y = rectTop; y <= rectBottom; y++) {
    for (let x = rectLeft; x <= rectRight; x++) {
      // Simple rounded rect: check if near edge
      const dx = Math.min(x - rectLeft, rectRight - x);
      const dy = Math.min(y - rectTop, rectBottom - y);
      const inCorner = dx < cornerRadius && dy < cornerRadius;
      const distFromCorner = inCorner
        ? Math.sqrt((cornerRadius - dx) ** 2 + (cornerRadius - dy) ** 2)
        : 0;

      const onBorder =
        (x - rectLeft < borderThickness ||
          rectRight - x < borderThickness ||
          y - rectTop < borderThickness ||
          rectBottom - y < borderThickness) &&
        (!inCorner || distFromCorner <= cornerRadius);

      const outside = inCorner && distFromCorner > cornerRadius;

      if (!outside && onBorder) {
        const idx = (y * width + x) * 4;
        pixels[idx] = accent[0];
        pixels[idx + 1] = accent[1];
        pixels[idx + 2] = accent[2];
        pixels[idx + 3] = accent[3];
      }
    }
  }

  // Draw pixel-art "AI" letters
  const letterScale = Math.floor(innerSize / 10);
  const lx = Math.floor(cx - letterScale * 3.5);
  const ly = Math.floor(cy - letterScale * 3);

  // "A" pixel art (7x6 grid)
  const A = [
    [0, 0, 1, 1, 0, 0],
    [0, 1, 0, 0, 1, 0],
    [0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 1, 0],
    [0, 1, 0, 0, 1, 0],
  ];

  // "I" pixel art (7x6 grid)
  const I = [
    [1, 1, 1, 1],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [1, 1, 1, 1],
  ];

  const fg = [255, 255, 255, 255];

  function drawLetter(grid, startX, startY) {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col]) {
          for (let py = 0; py < letterScale; py++) {
            for (let px = 0; px < letterScale; px++) {
              const px2 = startX + col * letterScale + px;
              const py2 = startY + row * letterScale + py;
              if (px2 >= 0 && px2 < width && py2 >= 0 && py2 < height) {
                const idx = (py2 * width + px2) * 4;
                pixels[idx] = fg[0];
                pixels[idx + 1] = fg[1];
                pixels[idx + 2] = fg[2];
                pixels[idx + 3] = fg[3];
              }
            }
          }
        }
      }
    }
  }

  drawLetter(A, lx, ly);
  drawLetter(I, lx + A[0].length * letterScale + letterScale, ly);

  // Build scanlines with filter byte (0 = None)
  const scanlines = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    scanlines[y * (1 + width * 4)] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 4) + 1 + x * 4;
      scanlines[dst] = pixels[src];
      scanlines[dst + 1] = pixels[src + 1];
      scanlines[dst + 2] = pixels[src + 2];
      scanlines[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = zlib(scanlines);

  const ihdr = [
    ...uint32BE(width),
    ...uint32BE(height),
    8, // bit depth
    6, // color type: RGBA
    0, // compression
    0, // filter
    0, // interlace
  ];

  const png = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    ...pngChunk("IHDR", ihdr),
    ...pngChunk("IDAT", Array.from(compressed)),
    ...pngChunk("IEND", []),
  ];

  return Buffer.from(png);
}

// App background color: zinc-950 (#09090b)
const BG_R = 9, BG_G = 9, BG_B = 11;

const icons = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-maskable-192.png", size: 192, maskable: true },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
];

for (const { name, size, maskable } of icons) {
  const png = createPNG(size, BG_R, BG_G, BG_B, maskable);
  const path = join(iconsDir, name);
  writeFileSync(path, png);
  console.log(`Created ${path} (${png.length} bytes)`);
}

console.log("Done! PWA icons generated.");

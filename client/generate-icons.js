#!/usr/bin/env node
// Generates PNG icon files for the PWA without any external dependencies.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Draw a rounded-rectangle icon: forest-green bg + white leaf emoji text is
// not possible without a font engine, so we use a two-tone leaf shape instead.
function createIcon(size) {
  // Colours
  const bg  = [0x1B, 0x43, 0x32]; // #1B4332 forest green
  const fg  = [0x52, 0xB7, 0x88]; // #52B788 moss green (leaf body)
  const acc = [0x95, 0xD5, 0xB2]; // #95D5B2 mint  (leaf veins / highlight)

  const pixels = new Uint8Array(size * size * 3);

  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.42;   // leaf bounding radius

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 3;

      // Normalised coords relative to centre (-1..1)
      const nx = (x - cx) / r;
      const ny = (y - cy) / r;

      // Rounded-square background mask
      const corner = 0.22;
      const inBg = Math.pow(Math.abs(nx), 5) + Math.pow(Math.abs(ny), 5) < 1.2;

      // Leaf shape: teardrop tilted 45°
      const lx = (nx + ny) / Math.SQRT2;
      const ly = (nx - ny) / Math.SQRT2;
      const inLeaf = lx * lx + (ly - 0.05) * (ly - 0.05) * 0.55 < 0.38 && ly < 0.55;

      // Vein: thin vertical stripe inside leaf
      const inVein = inLeaf && Math.abs(lx) < 0.045;

      let colour;
      if (!inBg) {
        colour = [0xff, 0xff, 0xff]; // transparent (white) outside rounded rect
      } else if (inVein) {
        colour = acc;
      } else if (inLeaf) {
        colour = fg;
      } else {
        colour = bg;
      }

      pixels[idx]     = colour[0];
      pixels[idx + 1] = colour[1];
      pixels[idx + 2] = colour[2];
    }
  }

  // Build PNG
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB colour type

  // Raw scanlines: filter byte (0) + RGB row
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0; // filter = None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 3;
      const dst = y * (1 + size * 3) + 1 + x * 3;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = path.join(__dirname, 'public');

const icons = [
  { file: 'pwa-192x192.png',      size: 192 },
  { file: 'pwa-512x512.png',      size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-32x32.png',    size: 32  },
];

for (const { file, size } of icons) {
  const outPath = path.join(publicDir, file);
  fs.writeFileSync(outPath, createIcon(size));
  console.log(`✓ ${file} (${size}×${size})`);
}

console.log('\nAll PWA icons generated successfully.');

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const svg = readFileSync(new URL('../src/app/icon.svg', import.meta.url));

const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((s) => sharp(svg, { density: 300 }).resize(s, s).png().toBuffer())
);

// ICO container with embedded PNGs
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);

const entries = [];
let offset = 6 + 16 * sizes.length;
for (let i = 0; i < sizes.length; i++) {
  const e = Buffer.alloc(16);
  e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 0); // width
  e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 1); // height
  e.writeUInt8(0, 2); // palette
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // planes
  e.writeUInt16LE(32, 6); // bit depth
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  entries.push(e);
}

writeFileSync(
  new URL('../src/app/favicon.ico', import.meta.url),
  Buffer.concat([header, ...entries, ...pngs])
);

await sharp(svg, { density: 300 })
  .resize(180, 180)
  .png()
  .toFile(fileURLToPath(new URL('../src/app/apple-icon.png', import.meta.url)));

console.log('done');

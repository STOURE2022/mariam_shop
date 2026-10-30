// ===========================================================================
// Génère public/assets/img/og-default.png (1200×630, fond vert, bande or)
// sans aucune dépendance. À remplacer par un visuel avec le logo si souhaité.
// Usage : node scripts/generer-og.mjs
// ===========================================================================
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const L = 1200, H = 630;
const vert = [0x14, 0x53, 0x2d], or = [0xd4, 0xa0, 0x17], creme = [0xfd, 0xfa, 0xf3];

const brut = Buffer.alloc((L * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  brut[y * (L * 3 + 1)] = 0; // filtre « none »
  for (let x = 0; x < L; x++) {
    let c = vert;
    if (y >= 560) c = or;                                   // bande or en bas
    else if (y >= 300 && y < 316 && x >= 100 && x < 420) c = creme; // trait décoratif
    const i = y * (L * 3 + 1) + 1 + x * 3;
    brut[i] = c[0]; brut[i + 1] = c[1]; brut[i + 2] = c[2];
  }
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(L, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(brut, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const sortie = join(dirname(dirname(fileURLToPath(import.meta.url))), 'public', 'assets', 'img', 'og-default.png');
await writeFile(sortie, png);
console.log('Image OG générée :', sortie, `(${png.length} octets)`);

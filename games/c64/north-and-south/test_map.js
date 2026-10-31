#!/usr/bin/env node
// Hold the page's map of a start year (index.html's ns-map block, nsYearMap, the map's own code run
// on the kit's 6502) against the emulator's picture of the game: reference/map-1861.png, the map of
// January 1861 as VICE showed it, 384 x 272 with the border. The page's 320 x 200 picture of year 0
// is found inside it, and each pixel's colour number compared with the reference's colour: every
// colour of the reference must stand for one colour number, and the pixels that disagree with the
// colour number most of that colour's pixels have are counted. The cursor, a sprite, covers 184;
// more than CURSOR differing pixels fails. It also checks that the other three years draw.
//   node games/c64/north-and-south/test_map.js [page.html]
const path = require('path'), fs = require('fs'), zlib = require('zlib'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.lib('cpu6502'); const C64Cpu = globalThis.C64Cpu;
const { nsYearMap } = g.run(page, 'ns-map', 'nsYearMap');
const L = g.listing('parts/map/listing.json').ram;
const CURSOR = 184;                                  // the arrow, at x 96-111, y 9-26 of the picture

function png(file) {                                   // 8-bit RGB or RGBA, not interlaced
  const b = fs.readFileSync(file);
  let o = 8, w, h, ct, idat = [];
  while (o < b.length) {
    const n = b.readUInt32BE(o), t = b.toString('latin1', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12]) throw new Error(file + ': not 8-bit, or interlaced'); }
    if (t === 'IDAT') idat.push(d);
    o += 12 + n;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0;
  if (!bpp) throw new Error(file + ': colour type ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, px = Buffer.alloc(st * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (st + 1)], src = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1));
    for (let x = 0; x < st; x++) {
      const a = x >= bpp ? px[y * st + x - bpp] : 0, up = y ? px[(y - 1) * st + x] : 0, c = x >= bpp && y ? px[(y - 1) * st + x - bpp] : 0;
      const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
      const pr = f === 0 ? 0 : f === 1 ? a : f === 2 ? up : f === 3 ? (a + up) >> 1 : (pa <= pb && pa <= pc ? a : pb <= pc ? up : c);
      px[y * st + x] = (src[x] + pr) & 255;
    }
  }
  return { w, h, rgb: (x, y) => { const i = (y * w + x) * bpp; return (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]; } };
}
function picture(r) {                                  // colour numbers of the 320 x 200 multicolour bitmap
  const m = r.m, out = new Uint8Array(320 * 200);
  for (let c = 0; c < 1000; c++) {
    const cy = (c / 40) | 0, cx = c % 40, s = m[0x6000 + c], cl = [0, s >> 4, s & 15, r.col[c] & 15];
    for (let y = 0; y < 8; y++) { const b = m[0x4000 + c * 8 + y]; for (let k = 0; k < 8; k++) out[(cy * 8 + y) * 320 + cx * 8 + k] = cl[(b >> (6 - 2 * (k >> 1))) & 3]; }
  }
  return out;
}
const ref = png(path.join(__dirname, 'reference/map-1861.png'));
const mine = picture(nsYearMap(L, 0, C64Cpu));
let best = null;
for (let oy = 0; oy <= ref.h - 200; oy++) for (let ox = 0; ox <= ref.w - 320; ox++) {
  if (best && best.diff === 0) break;
  if (Math.abs(ox - 32) > 4 || Math.abs(oy - 35) > 4) continue;
  const votes = new Map();
  for (let i = 0; i < 64000; i++) {
    const k = ref.rgb(ox + i % 320, oy + ((i / 320) | 0)), v = votes.get(k) || new Uint32Array(16);
    v[mine[i]]++; votes.set(k, v);
  }
  let diff = 0;
  for (const v of votes.values()) diff += v.reduce((s, n) => s + n, 0) - Math.max(...v);
  if (!best || diff < best.diff) best = { ox, oy, diff };
}
let bad = 0;
console.log(`1861: ${best.diff} of 64,000 pixels differ from the emulator's picture (at ${best.ox}, ${best.oy} in it)`);
if (best.diff > CURSOR) bad++;
for (let y = 1; y < 4; y++) {
  const r = nsYearMap(L, y, C64Cpu), owners = Array.from(r.m.subarray(0x0DAB, 0x0DAB + 26));
  if (!owners.some((o) => o === 0) || !owners.some((o) => o === 1)) { bad++; console.log(`DIFFERS ${1861 + y}: the owners are not both sides'`); }
}
console.log(bad ? 'FAILED' : 'the map draws every year, and 1861 as the emulator shows it');
process.exit(bad ? 1 : 0);

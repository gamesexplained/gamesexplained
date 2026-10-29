#!/usr/bin/env node
// Hold the Maps tab's arenas (levels.html's bb-backdrop block, which runs the game's own routines on
// the kit's 6502) to the screens VICE showed. For each side, bbBackdrops draws the arena on screen at
// the load and, after swap_backdrop, the one stored under the chips; each is rendered by
// C64.renderFrame and compared with a screenshot of that arena taken in VICE (reference/), over the
// whole arena and its pillars, cell rows 7 to 22 and columns 0 to 39, leaving out only the cells
// where the screenshot's fighters stand. The swap must also bring in the stored arena's bitmap
// ($D000-$DFFF) whole and put the first away in its place. It exits 1 on any difference.
//   node games/c64/barbarian/test_levels.js
const path = require('path'), fs = require('fs'), zlib = require('zlib'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname), page = 'levels.html';
g.sameBlock('bb-frame');
const { bbBackdrops } = g.run(page, 'bb-backdrop', 'bbBackdrops');
const { BB_FRAME } = g.run(page, 'bb-frame', 'BB_FRAME'), { BB_FRAME2 } = g.run(page, 'bb-frame2', 'BB_FRAME2');
g.lib('cpu6502'); g.lib('c64');
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };

function readPng(file) {                                  // 8-bit RGB or RGBA, not interlaced
  const buf = fs.readFileSync(file);
  let o = 8, w, h, ct, idat = [];
  while (o < buf.length) {
    const n = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || (ct !== 2 && ct !== 6) || d[12]) throw new Error('only 8-bit RGB(A), not interlaced'); }
    else if (t === 'IDAT') idat.push(d);
    o += 12 + n;
  }
  const bpp = ct === 2 ? 3 : 4, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = raw[p++];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  const rgb = new Array(w * h);
  for (let i = 0; i < w * h; i++) rgb[i] = out.readUIntBE(i * bpp, 3);
  return { w, h, rgb };
}
// VICE's palette as these screenshots were saved, colour by colour (blue and light green appear in none)
const VICE = { 0x000000: 0, 0xFFFFFF: 1, 0xAF3C58: 2, 0x7EF3D6: 3, 0xAA40F5: 4, 0x62D532: 5, 0xFFFF46: 7, 0xB7631E: 8,
  0x775300: 9, 0xEE7B95: 10, 0x626262: 11, 0x949494: 12, 0x7385FF: 14, 0xCDCDCD: 15 };
// each screenshot, and the columns its two fighters cover in the band they walk in (cell rows 14 to 21)
const SHOTS = [
  [['practice-demo-volcano.png', [14, 25]], ['practice-demo-forest.png', [12, 24]]],
  [['tournament-demo.png', [14, 24]], ['tournament-ending-arches.png', [4, 7]]],
];
const X0 = 32, Y0 = 35;                                      // the picture's top left in renderFrame's 384 x 272
let pixels = 0;
[BB_FRAME, BB_FRAME2].forEach((F, side) => {
  const L = g.listing(side ? 'parts/tournament/listing.json' : 'parts/practice/listing.json');
  const frames = bbBackdrops(L.ram, globalThis.C64Cpu, Object.assign({}, F, { colourMem: Buffer.from(F.colour, 'base64') }), side);
  // the swap: the stored arena's 4,096 bytes are the bitmap's arena now, and the first arena is stored
  const arena = (m) => { const o = []; for (let row = 7; row < 23; row++) for (let k = 0; k < 256; k++) o.push(m[0x6000 + 320 * row + 32 + k]); return o; };
  const before = arena(frames[0].mem), after = arena(frames[1].mem);
  for (let i = 0; i < 4096; i++) {
    if (after[i] !== L.ram[0xD000 + i]) { fail('side', side + 1, 'arena byte', i, 'is not the stored one'); break; }
    if (frames[1].mem[0xD000 + i] !== before[i]) { fail('side', side + 1, 'stored byte', i, 'is not the first arena\'s'); break; }
  }
  frames.forEach((f, b) => {
    const [file, [c0, c1]] = SHOTS[side][b], shot = readPng(path.join(__dirname, 'reference', file)), r = C64.renderFrame(f);
    let off = 0;
    for (let y = 7 * 8; y < 23 * 8; y++) for (let x = 0; x < 320; x++) {
      const row = y >> 3, col = x >> 3;
      if (row >= 14 && row <= 21 && col >= c0 && col <= c1) continue;
      const want = VICE[shot.rgb[(y + Y0) * shot.w + x + X0]], got = r.px[(y + Y0) * r.w + x + X0] & 15;
      pixels++;
      if (want !== got && off++ < 3) fail('side', side + 1, 'arena', b, file, 'at', x, y, 'draws', got, 'VICE shows', want);
    }
    if (off) fail('side', side + 1, 'arena', b, off, 'pixels differ');
  });
});
if (bad) { console.log(bad, 'differences'); process.exit(1); }
console.log('4 arenas, ' + pixels.toLocaleString('en') + ' pixels: every one matches VICE');

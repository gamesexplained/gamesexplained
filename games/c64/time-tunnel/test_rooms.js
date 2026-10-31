#!/usr/bin/env node
// Hold the Maps tab's rooms (levels.html's tt-rooms block, which runs the game's own routines on the
// kit's 6502, and the same block on the How it works page) to the screens VICE showed. Each picture
// in ROOMS was taken in VICE from work/play-mansion.vsf with the era and room set and era_enter
// ($38A4) run, as the game enters an era, once the first pass of play_state had run. ttRoom draws
// the same room, C64.renderFrame renders it, and every pixel must match but those under the gnome
// (sprite 0, which the page leaves out) at the era's arrival x and y from its record, and in the
// throne room those under the staff (object $58), which play_state recolours and doubles in height
// each pass. It exits 1 on any difference.
//   node games/c64/time-tunnel/test_rooms.js
const path = require('path'), fs = require('fs'), zlib = require('zlib'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.sameBlock('tt-rooms');
const { ttRoom } = g.run('levels.html', 'tt-rooms', 'ttRoom');
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
// VICE's palette as these screenshots were saved, colour by colour (red, light green and light
// blue appear in none)
const VICE = { 0x000000: 0, 0xFFFFFF: 1, 0x7EF3D6: 3, 0xAA40F5: 4, 0x62D532: 5, 0x2C3DEC: 6, 0xFFFF46: 7, 0xB7631E: 8,
  0x775300: 9, 0xEE7B95: 10, 0x626262: 11, 0x949494: 12, 0xCDCDCD: 15 };
const ROOMS = [[1, 2, 'room-mansion-hall.png'], [2, 1, 'room-gold-rush-street.png'], [4, 1, 'room-persia.png'],
  [5, 1, 'room-stone-age.png'], [6, 1, 'room-greece.png'], [7, 2, 'room-spaceship.png'], [8, 1, 'room-salem-street.png'],
  [9, 1, 'room-throne.png']];
const L = g.listing();
const box = (x, y, wide, tall) => {        // a sprite's pixels in renderFrame's 384 x 272, from the game's x and y
  const px = 2 * (x + 12) + 8, py = y + 66 - 16;
  return [px - 2, py - 2, px + (wide ? 48 : 24) + 2, py + (tall ? 42 : 21) + 2];
};
let pixels = 0;
for (const [era, room, file] of ROOMS) {
  const F = ttRoom(L.ram, globalThis.C64Cpu, era, room);
  const out = C64.renderFrame(F), shot = readPng(path.join(__dirname, 'reference', file));
  if (shot.w !== out.w || shot.h !== out.h) { fail(file, 'is', shot.w + 'x' + shot.h); continue; }
  const rec = 0x0A76 + L.ram[0x0BA8 + era], skip = [box(L.ram[rec + 8], L.ram[rec + 9])];
  if (era === 9) { const s = F.mem[0x0840 + 0x58]; skip.push(box(F.mem[0x33 + s], F.mem[0x3B + s], false, true)); }
  let diff = 0;
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    if (skip.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1)) continue;
    const c = VICE[shot.rgb[y * out.w + x]];
    if (c === undefined) { fail(file, 'has a colour outside the palette at', x, y); diff++; continue; }
    if (c !== out.px[y * out.w + x]) diff++;
    pixels++;
  }
  if (diff) fail(file, diff, 'pixels differ');
}
console.log(`${ROOMS.length} rooms, ${pixels} pixels: ` + (bad ? bad + ' differences' : 'every pixel matches VICE but the gnome\'s and the throne\'s staff'));
process.exit(bad ? 1 : 0);

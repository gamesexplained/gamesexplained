#!/usr/bin/env node
// The rooms the pages draw (sp-room, sp-world and sp-draw in index.html and levels.html) against the
// game as it ran:
//   1. the three blocks are the same on every page that carries them;
//   2. six screenshots in reference/ (room-<row>-<col>-v<view>.png): each room is built by sp-room,
//      which runs the game's own enter_room and sprite routines on the listing's bytes in the kit's
//      6502, drawn by the site's model of the video chip with the sprites off, and compared with the
//      screenshot over the room's area (x 96-351, y 35-234), pixel by pixel. The colours are matched
//      as a one-to-one map, since the emulator's palette is not the site's. The boxes round the
//      sprites the game showed (positions from the VIC's registers when the screenshot was taken)
//      are left out: a sprite is drawn over the picture, and its place moves frame by frame;
//   3. the world sp-world reads: 386 rooms, and the moving pieces the pages count.
//   node games/c64/spindizzy/test_rooms.js
'use strict';
const path = require('path'), fs = require('fs'), zlib = require('zlib');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502', 'c64');
for (const b of ['sp-room', 'sp-world', 'sp-draw']) g.sameBlock(b);
const { spRoom } = g.run('levels.html', 'sp-room', 'spRoom');
const { spWorld } = g.run('levels.html', 'sp-world', 'spWorld');
const L = g.listing();
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };

// sprite positions on the screen (x, y of the top left), from the VIC's registers at each screenshot
const SHOTS = {
  'room-64-64-v0.png': { room: [64, 64], view: 0, sprites: [[216, 106], [132, 146], [212, 82]] },
  'room-61-71-v1.png': { room: [61, 71], view: 1, sprites: [[430, 12], [176, 12], [430, 14], [176, 14], [434, 12], [434, 141], [434, 14], [430, 141]] },
  'room-53-61-v2.png': { room: [53, 61], view: 2, sprites: [[216, 99], [160, 162], [176, 162], [192, 170], [208, 170]] },
  'room-65-66-v3.png': { room: [65, 66], view: 3, sprites: [[216, 97], [240, 171], [292, 146], [216, 83]] },
  'room-68-54-v0.png': { room: [68, 54], view: 0, sprites: [[216, 116], [212, 138]] },
  'room-70-58-v1.png': { room: [70, 58], view: 1, sprites: [[260, 66], [216, 229]] },
};

function readPng(file) {                         // 8-bit RGB or RGBA, not interlaced
  const buf = fs.readFileSync(file);
  let o = 8, w, h, ct;
  const idat = [];
  while (o < buf.length) {
    const n = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12]) throw new Error(file + ': not 8-bit or interlaced'); }
    else if (t === 'IDAT') idat.push(d);
    o += 12 + n;
  }
  const bpp = ct === 2 ? 3 : ct === 6 ? 4 : 0;
  if (!bpp) throw new Error(file + ': colour type ' + ct);
  const stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(h * stride);
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

let pixels = 0;
for (const [file, S] of Object.entries(SHOTS)) {
  const r = spRoom(L.ram, S.room[0], S.room[1], S.view, C64Cpu);
  const vic = Array.from(r.vic.subarray(0, 47));
  vic[0x15] = 0;
  const out = C64.renderFrame({ vic, cia2: [0xC0, 0x3F], writes: [], mem: r.mem, colourMem: r.colour });
  const shot = readPng(path.join(__dirname, 'reference', file));
  const boxes = S.sprites.map(([x, y]) => [x - 2, y - 2, x + 26, y + 23]);
  const map = new Map(), back = new Map();
  let diff = 0, n = 0;
  for (let y = 35; y < 235; y++) for (let x = 96; x < 352; x++) {
    if (boxes.some(([a, b, c, d]) => x >= a && x < c && y >= b && y < d)) continue;
    n++;
    const ci = out.px[y * out.w + x], rgb = shot.rgb[y * shot.w + x];
    if (!map.has(rgb)) map.set(rgb, ci);
    if (!back.has(ci)) back.set(ci, rgb);
    if (map.get(rgb) !== ci || back.get(ci) !== rgb) diff++;
  }
  pixels += n;
  if (diff) fail(`${file}: ${diff} of ${n} pixels differ from the screenshot`);
  if (n < 40000) fail(`${file}: only ${n} pixels compared`);
}

const W = spWorld(L.ram), count = { jewel: 0, lift: 0, inhabitant: 0, block: 0 };
for (const r of W.rooms) for (const p of r.pieces) count[p.kind]++;
const want = { rooms: 386, structures: 127, jewel: 220, lift: 64, inhabitant: 14, block: 70 };
const got = Object.assign({ rooms: W.rooms.length, structures: W.structures.length }, count);
for (const k in want) if (got[k] !== want[k]) fail(`the world has ${got[k]} ${k}, the pages say ${want[k]}`);
const start = W.rooms.find((r) => r.row === 64 && r.col === 64);
if (!start || start.length !== 54 || start.blocks.length !== 13) fail('the start room is not the 54-byte record of 13 block words the page shows');

if (bad) { console.log(`test_rooms: ${bad} failed`); process.exit(1); }
console.log(`test_rooms: ${Object.keys(SHOTS).length} rooms match their screenshots over ${pixels} pixels; the world's counts match the pages`);

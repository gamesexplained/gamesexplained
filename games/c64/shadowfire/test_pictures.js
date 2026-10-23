#!/usr/bin/env node
// Hold the page's picture decoder against the game's own drawing routine. index.html's sf-picture
// block (sfPicture) unpacks a picture as the page draws it: each cell's eight bitmap bytes, its
// screen colours and its colour RAM nibble. draw_picture ($42D9), run on the kit's simulator over
// the listing's bytes, must put the same bytes in the bitmap at $2000, the screen matrix at $0C00
// and colour RAM, for every picture the pages draw: the 54 objects' pictures, the six team
// pictures, the fifty entities' map icons and figures, the two halves of the attack craft and the
// eight portraits (a portrait's two size bytes, its bitmap and its colours lie in that order, the
// form of every other picture). Each is drawn at cell column 0, row 13, where the screens draw.
// It exits 1 on any difference.
//   node games/c64/shadowfire/test_pictures.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { sfPicture } = g.run(page, 'sf-picture', 'sfPicture');
const L = g.listing(), R = L.ram, w = (a) => R[a] | R[a + 1] << 8;
const pics = new Map();
const add = (p, what) => { if (!pics.has(p)) pics.set(p, what); };
for (let k = 0; k < 54; k++) add(w(0xCD98 + 7 * k + 3), 'object ' + k);
for (let t = 0; t < 6; t++) add(w(0x818F + 2 * t), 'team picture ' + t);
for (let e = 0; e < 50; e++) { add(w(0x6CFE + 4 * e), 'map icon ' + e); add(w(0x6D00 + 4 * e), 'figure ' + e); }
add(w(0x6DC7), 'attack craft, upper'); add(w(0x6DC9), 'attack craft, lower');
for (let n = 0; n < 8; n++) add(w(0x4A21 + 4 * n) - 2, 'portrait ' + n);
let bad = 0, cells = 0;
const fail = (...a) => { if (bad++ < 10) console.log('DIFFERS', ...a); };
for (const [p, what] of pics) {
  const m = R.slice(), cram = new Uint8Array(1024).fill(0xAA);
  const io = { read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD800 && a < 0xDC00) cram[a - 0xD800] = v & 15; else throw new Error('write $' + a.toString(16)); } };
  m[0x31] = p & 255; m[0x32] = p >> 8; m[0x4A1E] = 0;
  new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io }).call(0x42D9, { x: 0, y: 13 }, { maxSteps: 200000 });
  const pic = sfPicture(R, p);
  for (let cy = 0; cy < pic.h; cy++) for (let cx = 0; cx < pic.w; cx++) {
    const i = cy * pic.w + cx, cell = (13 + cy) * 40 + cx, b = 0x2000 + (13 + cy) * 320 + cx * 8;
    cells++;
    for (let y = 0; y < 8; y++) if (m[b + y] !== pic.bits[i * 8 + y]) { fail(what, 'cell', cx, cy, 'bitmap row', y); break; }
    if (m[0x0C00 + cell] !== pic.scr[i]) fail(what, 'cell', cx, cy, 'screen colours', m[0x0C00 + cell], pic.scr[i]);
    if (cram[cell] !== pic.cram[i]) fail(what, 'cell', cx, cy, 'colour RAM', cram[cell], pic.cram[i]);
  }
}
console.log(`${pics.size} pictures, ${cells} cells: ` + (bad ? bad + ' differences' : 'every byte matches draw_picture'));
process.exit(bad ? 1 : 0);

#!/usr/bin/env node
// Hold the page's two map drawings against the game's own. index.html's sf-map block has
// sfViewMap, the view screen's window of 5 x 5 tiles as draw_view_map ($6A50) draws it, and sfShip,
// the whole 32 x 32-tile map drawn the same way. draw_view_map, run on the kit's simulator over the
// listing's bytes for every one of the 164 locations in turn (memory and the page's 40-byte row
// buffer carried from one to the next, as the game carries them), must leave the same bitmap bytes,
// screen colours and colour RAM in the window (cell columns 15-24, rows 1-10) as sfViewMap; and
// every cell of a window that lies on the map must be the same cell of sfShip. It exits 1 on any
// difference.
//   node games/c64/shadowfire/test_map.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { SF } = g.run(page, 'sf-data', 'SF');
globalThis.SF = SF;
globalThis.sfPicture = g.run(page, 'sf-picture', 'sfPicture').sfPicture;
const { sfViewMap, sfShip } = g.run(page, 'sf-map', 'sfViewMap', 'sfShip');
const L = g.listing(), m = L.ram.slice(), cram = new Uint8Array(1024);
const io = { read(a) { throw new Error('read $' + a.toString(16)); },
  write(a, v) { if (a >= 0xD800 && a < 0xDC00) cram[a - 0xD800] = v & 15; else throw new Error('write $' + a.toString(16)); } };
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
const buf = L.ram.slice(0x6C64, 0x6C8C), ship = sfShip(L.ram);
let bad = 0, cells = 0, onMap = 0;
const fail = (...a) => { if (bad++ < 10) console.log('DIFFERS', ...a); };
for (let n = 0; n < SF.LOCATIONS; n++) {
  const loc = SF.location(L.ram, n);
  cpu.call(0x6A50, { x: loc.x, y: loc.y }, { maxSteps: 500000 });
  const v = sfViewMap(L.ram, loc.x, loc.y, buf);
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const o = r * 10 + c, b = 0x2000 + (1 + r) * 320 + (15 + c) * 8, cell = (1 + r) * 40 + 15 + c;
    cells++;
    for (let y = 0; y < 8; y++) if (m[b + y] !== v.bits[o * 8 + y]) { fail('location', n, 'cell', c, r, 'bitmap row', y); break; }
    if (m[0x0C00 + cell] !== v.scr[o]) fail('location', n, 'cell', c, r, 'screen colours', m[0x0C00 + cell], v.scr[o]);
    if (cram[cell] !== v.cram[o]) fail('location', n, 'cell', c, r, 'colour RAM', cram[cell], v.cram[o]);
    const mx = 2 * (loc.x - 1) + c, my = 2 * (loc.y - 1) + r;
    if (loc.x !== 0xFF && mx >= 0 && mx < 64 && my >= 0 && my < 64) {
      const s = my * 64 + mx;
      onMap++;
      if (ship.scr[s] !== v.scr[o] || ship.bits.subarray(s * 8, s * 8 + 8).join() !== v.bits.subarray(o * 8, o * 8 + 8).join())
        fail('location', n, 'cell', c, r, 'differs from the whole map');
    }
  }
}
console.log(`${SF.LOCATIONS} windows, ${cells} cells, ${onMap} of them on the whole map: ` + (bad ? bad + ' differences' : 'every byte matches draw_view_map'));
process.exit(bad ? 1 : 0);

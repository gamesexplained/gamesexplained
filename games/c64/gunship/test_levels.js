#!/usr/bin/env node
// Hold the Maps page's maps to the game. levels.html's gs-levels block (gsMapScreen) runs
// the flight's own draw_map on the kit's 6502. With the flight's listing as it is (Western Europe,
// its units as the snapshot left them), the screen it draws must be the screen of the big map's
// frame recorded in the emulator, which the page embeds, cell for cell, in all 864 cells draw_map
// writes, and so must the colour RAM. Each of the five theatres must then draw all 864 cells.
// It exits 1 on any difference.
//   node games/c64/gunship/test_levels.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'levels.html';
const { gsMapScreen, GS_MAPFRAME, GS_THEATRES } = g.run(page, 'gs-levels', 'gsMapScreen');
const r = g.run(page, 'gs-levels', 'GS_MAPFRAME', 'GS_THEATRES');
const L = g.listing('parts/flight/listing.json');
const b64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
const shown = new Uint8Array(0x10000);
for (const x of r.GS_MAPFRAME.ram) shown.set(b64(x.b), x.a);
const shownColour = b64(r.GS_MAPFRAME.colour);
const cells = [];
for (let row = 0; row < 24; row++) for (let col = 2; col < 38; col++) cells.push(row * 40 + col);
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const we = gsMapScreen(L.ram, r.GS_MAPFRAME, null, false, kit);
for (const c of cells) {
  if (we.mem[0xE800 + c] !== shown[0xE800 + c]) fail('screen cell', c, we.mem[0xE800 + c], 'where the frame has', shown[0xE800 + c]);
  if ((we.colour[c] & 15) !== (shownColour[c] & 15)) fail('colour cell', c, we.colour[c] & 15, 'where the frame has', shownColour[c] & 15);
}
for (const t of r.GS_THEATRES) {
  const m0 = L.ram.slice(); for (const c of cells) m0[0xE800 + c] = 0;
  const d = gsMapScreen(m0, { ...r.GS_MAPFRAME, ram: r.GS_MAPFRAME.ram.filter((x) => x.a !== 0xE800) }, t, true, kit);
  const unset = cells.filter((c) => d.mem[0xE800 + c] === 0).length;
  if (unset) fail(t.id, unset, 'cells left blank');
}
console.log(`${cells.length} cells against the recorded frame, ${r.GS_THEATRES.length} theatres: ` + (bad ? bad + ' differences' : 'draw_map draws the frame\'s map cell for cell'));
process.exit(bad ? 1 : 0);

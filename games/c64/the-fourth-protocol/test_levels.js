#!/usr/bin/env node
// Hold the Maps tab (levels.html) against the game's own drawing and printing.
// - tfp-names: tfpPrintName prints a place's two names as show_location ($A47C) does. Here episode
//   two's print_name_0 ($A49D) and print_name_1 ($A4A4) run on the kit's simulator for each of the
//   249 places, over episode two's listing with the OS's ($EB00-$FFFF) and the screen of the page's
//   office frame (TFP_OFFICE), the operating system's windows, icons and zero page as the office
//   leaves them (OFFICE below, read from the snapshot the frame was captured from). The bitmap and
//   the cell colours from $0C00 to $3FFF must be the page's. tfpGeiger must give the reading
//   use_geiger_counter ($6EF7) prints (a hook on print_number, $A97C), and no reading where it
//   prints that the counter shows nothing ($A828).
// - The presence texts: tfpText with episode two's dictionary ($C91C) must be the characters
//   print_text ($AA3B) prints (a hook on the OS's $EC03) for each of the 96 in presence_texts.
// - tfp-tiles: tfpTilePicture against show_tile_picture's three entries ($C427, $C43C, $C451), run
//   from the office until it waits ($A8F0): the 14 by 7 cells at 13, 10 and their colours. tfpPlan
//   against draw_plan ($7F97) on episode one's listing, and TFP_PLANS' windows against the
//   arguments building_17 opens them with. The room names, joined, against show_room_name ($7F65).
// - The tfp-text block must be the same in index.html and levels.html.
// It exits 1 on any difference.
//   node games/c64/the-fourth-protocol/test_levels.js [levels.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'levels.html';
g.sameBlock('tfp-text', 'index.html', page);
const { tfpWords, tfpText } = g.run(page, 'tfp-text', 'tfpWords', 'tfpText');
const { tfpLocation, tfpPrintName, tfpGeiger } = g.run(page, 'tfp-names', 'tfpLocation', 'tfpPrintName', 'tfpGeiger');
const { TFP_TILE_PICTURES, tfpTilePicture, TFP_PLANS, tfpPlan } = g.run(page, 'tfp-tiles', 'TFP_TILE_PICTURES', 'tfpTilePicture', 'TFP_PLANS', 'tfpPlan');
const { TFP_OFFICE } = g.run(page, 'TFP_OFFICE', 'TFP_OFFICE');
const B = g.listing('parts/the-bomb/listing.json'), R = g.listing('parts/resident/listing.json');
const N = g.listing('parts/nato-documents/listing.json');

// The OS's state at the office: window_table entries 0 and 1 (the two name windows; the other 14
// free), window_flags, the seven icons of icon_table (all on the screen, window $10), and zero page
// $06 (the bitmap at $2000) and $40-$5F (the current window, its rectangle and text cursor).
const OFFICE = {
  windows: [[9, 3, 22, 4, 255, 0, 16, 8, 64, 0], [9, 10, 22, 4, 255, 0, 16, 8, 0, 0]],
  icons: [[2, 11, 6, 4, 16, 19, 16, 16], [2, 4, 6, 5, 0, 16, 16, 16], [32, 4, 4, 4, 224, 21, 16, 16], [32, 11, 5, 4, 96, 22, 16, 16],
    [28, 17, 6, 6, 208, 19, 16, 16], [17, 18, 6, 5, 240, 20, 16, 16], [6, 17, 6, 6, 240, 17, 16, 16]],
  zp40: [0x10, 0x00, 0x00, 0xD0, 0x0A, 0x0B, 0x14, 0x02, 0xFF, 0x00, 0x10, 0x08, 0x58, 0x00, 0x01, 0x10,
    0x2E, 0x98, 0x45, 0x06, 0x00, 0x10, 0x00, 0x11, 0x00, 0x67, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00],
};
function office() {
  const m = B.ram.slice();
  for (let a = 0xEB00; a < 0x10000; a++) if (R.has[a]) m[a] = R.ram[a];
  for (const r of TFP_OFFICE.ram) m.set(Buffer.from(r.b, 'base64'), r.a);
  m.fill(0xFF, 0x200, 0x400);
  OFFICE.windows.forEach((w, i) => m.set(w, 0x200 + 16 * i));
  OFFICE.icons.forEach((e, i) => m.set(e, 0x300 + 8 * i));
  m[0x400] = m[0x401] = 0xFF;
  m[0x06] = 0xFF; m.set(OFFICE.zp40, 0x40);
  return m;
}
// The video chip's registers are kept (the OS hides and shows the pointer's sprites); any other
// chip stops the test.
const vic = new Uint8Array(64);
const io = {
  read(a) { if (a < 0xD400) return vic[a & 63]; throw new Error('read $' + a.toString(16)); },
  write(a, v) { if (a < 0xD400) vic[a & 63] = v; else throw new Error('write $' + a.toString(16)); },
};
const STOP = new Error('stop');
const run = (m, at, regs, hooks) => {
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  try { cpu.call(at, regs || {}, { maxSteps: 1e7, hooks: hooks || {} }); } catch (e) { if (e !== STOP) throw e; }
  return cpu;
};
let bad = 0;
const say = (...a) => { if (bad++ < 12) console.log(...a); };
const first = (a, b, lo, hi) => { for (let i = lo; i <= hi; i++) if (a[i] !== b[i]) return i; return -1; };

// The names, and the Geiger counter
const m0 = office();
let geigers = 0;
for (let n = 0; n < 249; n++) {
  const L = tfpLocation(B.ram, n), m = m0.slice();
  m[0x8F] = L.names[0]; run(m, 0xA49D);
  m[0x90] = L.names[1]; run(m, 0xA4A4);
  const mine = m0.slice();
  tfpPrintName(mine, R.ram, 0, L.first); tfpPrintName(mine, R.ram, 1, L.second);
  const d = first(m, mine, 0x0C00, 0x3FFF);
  if (d >= 0) say('place', n, JSON.stringify(L.first), JSON.stringify(L.second), 'differs at $' + d.toString(16));
  const g2 = m0.slice(); g2[0x4040] = n; g2[0x4017] = 0;
  let read;
  run(g2, 0x6EF7, {}, { 0xA97C: (c) => { read = c.x; throw STOP; }, 0xA828: () => { read = null; throw STOP; }, 0x4B81: (c) => c.rts() });
  if (read === undefined) say('place', n, 'the Geiger counter printed nothing');
  else if (read !== tfpGeiger(B.ram, n)) say('place', n, 'Geiger', read, 'page', tfpGeiger(B.ram, n));
  if (read !== null) geigers++;
}
console.log('249 places: names' + (geigers === 52 ? ', 52 Geiger readings' : `, ${geigers} Geiger readings (52 expected)`));
if (geigers !== 52) bad++;

// The presence texts
const W2 = tfpWords(B.ram, 0xC91C);
let chars = 0;
for (let p = 0; p < 96; p++) {
  const ad = B.ram[0x4BD5 + 2 * p] | B.ram[0x4BD6 + 2 * p] << 8;
  let out = '';
  run(m0.slice(), 0xAA3B, { x: ad & 255, y: ad >> 8 }, { 0xEC03: (c) => { out += String.fromCharCode(c.a); c.rts(); } });
  chars += out.length;
  const mine = tfpText(B.ram, W2, ad);
  if (mine !== out) say('presence text', p, JSON.stringify(out), '|', JSON.stringify(mine));
}
console.log(`96 presence texts, ${chars} characters`);

// The tile pictures
for (const p of TFP_TILE_PICTURES) {
  const m = m0.slice();
  run(m, p.entry, {}, { 0xA8F0: () => { throw STOP; } });
  const pic = tfpTilePicture(B.ram, p);
  for (let cy = 0; cy < 7; cy++) for (let cx = 0; cx < 14; cx++) {
    const i = cy * 14 + cx, at = 0x2000 + (10 + cy) * 320 + (13 + cx) * 8;
    for (let r = 0; r < 8; r++) if (m[at + r] !== pic.bits[8 * i + r]) { say(p.name, 'cell', cx, cy, 'row', r, m[at + r], pic.bits[8 * i + r]); break; }
    if (m[0x0C00 + (10 + cy) * 40 + 13 + cx] !== pic.colours[i]) say(p.name, 'colour of cell', cx, cy);
  }
}
console.log('3 tile pictures');

// Building 17
const WINDOW_ARGS = [0x7CCB, 0x7D88];          // the bytes after building_17's two OS $11 calls
TFP_PLANS.forEach((p, k) => {
  const a = WINDOW_ARGS[k], args = Array.from(N.ram.slice(a, a + 8));
  if (args[0] !== p.x || args[1] !== p.y || args[2] !== 14 || args[3] !== 10 || args[6] !== 0xC0) say(p.name, 'window', args.join(' '));
  const m = N.ram.slice(), at = 0x2000 + p.y * 320 + p.x * 8;
  m[0xAC] = at & 255; m[0xAD] = at >> 8;
  run(m, 0x7F97, { x: p.map & 255, y: p.map >> 8 });
  const pic = tfpPlan(N.ram, p);
  for (let cy = 0; cy < 10; cy++) for (let cx = 0; cx < 14; cx++) for (let r = 0; r < 8; r++)
    if (m[at + cy * 320 + cx * 8 + r] !== pic.bits[8 * (cy * 14 + cx) + r]) { say(p.name, 'cell', cx, cy); r = 8; }
});
const W1 = tfpWords(N.ram);
for (let i = 0; i < 15; i++) {
  let out = '';
  run(N.ram.slice(), 0x7F65, { a: i }, { 0xEC03: (c) => { if (c.a !== 12) out += String.fromCharCode(c.a); c.rts(); } });
  const mine = tfpText(N.ram, W1, N.ram[0x7F79 + 2 * i] | N.ram[0x7F7A + 2 * i] << 8, true);
  if (mine !== out) say('room name', i, JSON.stringify(out), '|', JSON.stringify(mine));
}
console.log('2 floor plans, 15 room names');
console.log(bad ? bad + ' differences' : 'the Maps tab draws and prints what the game does');
process.exit(bad ? 1 : 0);

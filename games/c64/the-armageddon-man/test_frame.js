#!/usr/bin/env node
// The rebuilt main screen (am-frame, index.html) against the game's own start-up code on the
// listing's bytes in the kit's 6502: sprites_init ($637C), the fill of the colour cells at
// hardware_init's $62DD, fill_cells with its inline bytes from cold_start's $7C59, and
// cursor_shape1 ($5F14). The colour cells at $DC00, the sprite pointers at $DFF8, the two sprites'
// shapes at $DA00 and the colours the code gives sprites 0 and 1 must be the page's.
//   node games/c64/the-armageddon-man/test_frame.js
'use strict';
const path = require('path');
const { game, differ } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { amScreen, AM_VIC } = g.run('index.html', 'am-frame', 'amScreen', 'AM_VIC');
const L = g.listing();

const m = L.ram.slice(), vic = new Uint8Array(64);
const io = {
  read(a) { if (a >= 0xD000 && a < 0xD040) return vic[a & 63]; throw new Error('read $' + a.toString(16)); },
  write(a, v) { if (a >= 0xD000 && a < 0xD040) { vic[a & 63] = v; return; } throw new Error('write $' + a.toString(16)); },
};
const cpu = new C64Cpu.CPU(m, { port: { dir: 0x2F, data: 0x04 }, io });   // all RAM, as the game keeps it
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
if (m[0x62DD] !== 0xA2 || m[0x62DF] !== 0x20) fail('$62DD is not ldx #, jsr');
cpu.call(0x637C, {});                                            // sprites_init
cpu.call(0x62DD, {}, { hooks: { 0x62E2: () => true } });         // ldx #$1E, jsr fill_screen_colour
cpu.call(0x7C59, {}, { hooks: { 0x7C61: () => true } });         // jsr fill_cells and its five bytes
cpu.call(0x5F14, {});                                            // cursor_shape1

const P = amScreen(L.ram).mem;
for (const [lo, hi, what] of [[0xDC00, 0xDFE7, 'colour cells'], [0xDFF8, 0xDFFF, 'sprite pointers'], [0xDA00, 0xDA7F, 'sprites 0 and 1']]) {
  const d = differ(m, P, [[lo, hi]]);
  if (d >= 0) fail(`${what}: the game has $${m[d].toString(16)} at $${d.toString(16)}, the page $${P[d].toString(16)}`);
}
for (const r of [0x27, 0x28]) if ((vic[r] & 15) !== (AM_VIC[r] & 15)) fail(`$D0${r.toString(16)}: the game sets ${vic[r] & 15}, the page has ${AM_VIC[r] & 15}`);
if (!(vic[0x15] & 3)) fail('cursor_shape1 left sprites 0 and 1 off');
if (bad) { console.log(`test_frame: ${bad} failed`); process.exit(1); }
console.log('test_frame: colour cells, sprite pointers, the arrow and its colours are the game\'s');

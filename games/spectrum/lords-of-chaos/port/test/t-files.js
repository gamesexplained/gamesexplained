'use strict';
// The cassette and the file panels (g-files.js) checked against the game's own, on moments of play
// with the panels' values, the cassette and the keys set at random. The options that start the
// panel again (a scenario, the designer or a game loaded, the end of turn menu) are checked in the
// whole game's lockstep, which goes through them.
const lib = require('./lib.js');
const { check, prefetch } = require('./check.js');
prefetch(['classify_step', 'draw_frame', 'print_tape_status', 'list_wizards'], { per: 4 });
let fails = 0;
const from = 'classify_step';
fails += check({ name: 'classify_step', outs: ['a'], cases: 300 }).fails;
fails += check({ name: 'draw_frame', from, setup: (c, rnd) => { const r0 = rnd(20), c0 = rnd(28); c.regs.l = r0; c.regs.h = c0; c.regs.e = r0 + 2 + rnd(22 - r0); c.regs.d = c0 + 2 + rnd(30 - c0); }, cases: 200, seed: 2 }).fails;
fails += check({ name: 'print_tape_status', from, setup: (c, rnd) => { c.regs.a = 1 + rnd(3); }, cases: 60, seed: 3 }).fails;
fails += check({ name: 'list_wizards', from, cases: 60, seed: 4 }).fails;
fails += check({ name: 'draw_file_panel', from, setup: (c, rnd) => { if (rnd(3) === 0) c.M[0xD03F] = 0; }, cases: 60, seed: 5 }).fails;
fails += check({ name: 'clear_name_lines', from, setup: (c, rnd) => { c.regs.a = rnd(256); c.M[0x5B1A] = rnd(22); c.M[0x5B1B] = rnd(18); }, cases: 100, seed: 6 }).fails;
fails += check({ name: 'random_wizard', from, setup: (c, rnd) => { const p = 1 + rnd(4); c.M[0x5B11] = p; const a = 0xCEEA + 70 * (p - 1); c.M[0x5B04] = a & 255; c.M[0x5B05] = a >> 8; }, cases: 100, seed: 7 }).fails;
fails += check({ name: 'show_name', from, setup: (c, rnd) => { c.regs.d = 0xC6; c.regs.e = 0x37; c.regs.b = 1 + rnd(12); c.M[0x5B1A] = rnd(22); c.M[0x5B1B] = rnd(20); }, cases: 100, seed: 8 }).fails;
fails += check({ name: 'set_extension', from, setup: (c, rnd) => { c.regs.h = 0xC6; c.regs.l = [0x4D, 0x50, 0x53][rnd(3)]; }, cases: 30, seed: 9 }).fails;
// the cassette: a wizard's file and a saved game's header on the tape after the game's own files
const tapeWith = (rnd) => {
  const t = lib.gameTape();
  const bytes = []; for (let i = 0; i < 70; i++) bytes.push(rnd(256));
  t.blocks.push(lib.header('FRED    .WIZ'), { flag: 0xC8, bytes: Uint8Array.from(bytes) });
  t.pos = rnd(t.blocks.length);
  return t.save_();
};
const name = (c, s) => { for (let i = 0; i < 12; i++) c.M[0xC637 + i] = (s.padEnd(12)).charCodeAt(i); };
fails += check({ name: 'save_header', from, tapeOut: true, setup: (c, rnd) => { c.tape = tapeWith(rnd); name(c, 'ABC     .WIZ'); }, cases: 40, seed: 10 }).fails;
fails += check({ name: 'save_wizard', from, tapeOut: true, setup: (c, rnd) => { c.tape = tapeWith(rnd); name(c, 'ABC'); c.M[0xC662] = rnd(4); }, cases: 40, seed: 11 }).fails;
fails += check({ name: 'tape_load', from, tapeOut: true, outs: ['a', 'cf', 'ix', 'd', 'e'], setup: (c, rnd) => {
  c.tape = tapeWith(rnd); const t = lib.Tape.from(c.tape); if (t.pos >= t.blocks.length) { t.pos = 0; c.tape = t.save_(); }
  const b = t.blocks[t.pos]; c.regs.b = rnd(3) ? b.flag : 0x64; const n = rnd(4) ? b.bytes.length : rnd(80); c.regs.d = n >> 8; c.regs.e = n & 255; c.regs.ix = 0x8000;
  if (rnd(8) === 0) c.keys = [0x38]; }, cases: 120, seed: 12 }).fails;
fails += check({ name: 'find_file', from, tapeOut: true, outs: ['zf'], setup: (c, rnd) => { c.tape = tapeWith(rnd); const t = lib.Tape.from(c.tape); t.pos = 0; c.tape = t.save_();
  name(c, ['DESIGNER.', '2', '3', 'FRED'][rnd(4)]); }, cases: 60, seed: 13 }).fails;
fails += check({ name: 'load_wizard', from, tapeOut: true, setup: (c, rnd) => { c.tape = tapeWith(rnd); const t = lib.Tape.from(c.tape); t.pos = rnd(4) ? 0 : 7; c.tape = t.save_();
  name(c, 'FRED'); c.M[0xC662] = rnd(4); }, cases: 40, seed: 14 }).fails;
// the file name: keys typed one at a time (each let go), the 0 key to rub out, ENTER to end
const typing = (c, rnd) => {
  const keys = [];
  const n = rnd(12);
  for (let i = 0; i < n; i++) { keys.push({ keys: [rnd(5) ? rnd(40) : 32], scans: 1 + rnd(2) }, { keys: [], scans: 1 + rnd(2) }); }
  keys.push({ keys: [48], scans: 1 });
  c.seq = keys; c.keys = [];
};
fails += check({ name: 'ask_file_name', from, setup: typing, cases: 120, seed: 15 }).fails;
process.exitCode = fails ? 1 : 0;

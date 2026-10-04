/* Synthetic terrain used by the published movement examples. Original movement
 * and spell code runs; the demo-input override is disabled, actors/timers omitted.
 */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const {ROOT, create} = require('./engine_harness');
const JOY = {neutral: 31, left: 27, right: 23, up: 30, down: 29, jumpRight: 7, jumpLeft: 11, jumpUp: 14};
let rom;
function script(s, entry, stops = [0x2b67]) {
  if (!rom) {
    const dir = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'tools/vice-mcp/share/vice/C64');
    rom = {basic: fs.readFileSync(path.join(dir, 'basic-901226-01.bin')),
      kernal: fs.readFileSync(path.join(dir, 'kernal-901227-03.bin'))};
  }
  const {cpu, m} = s;
  cpu.rom = rom; m[0x39] = entry & 255; m[0x3a] = entry >> 8;
  cpu.pc = 0x92c; cpu.d = 0; cpu.sp = 255;
  let at;
  cpu.run({maxSteps: 500000, hooks: {0x92c: () => {
    at = m[0x39] + 256 * m[0x3a]; return stops.includes(at);
  }}});
  assert(stops.includes(at), 'Unexpected bytecode stop');
  return at;
}
function setup({gap = 0, ladder = 0, rope = 0, x = 120, y = 133, floor = 13} = {}) {
  const s = create(0), {m, io} = s;
  m.fill(32, 0xc400, 0xc770); m.fill(0, 0xc370, 0xc376);
  io[0x15] = 128; io[0x1d] = io[0x17] = 0; io[0x2e] = 4;
  m[0xc376] = m[0x801d] = 0x60;
  m[0xc093] = m[0xc094] = m[0xc039] = m[0xc02a] = 0;
  io[0xc00] = 31; io[0xc01] = 255;
  for (let col = 0; col < 40; col++) m[0xc400 + floor * 40 + col] = m[0xc400 + 21 * 40 + col] = 92;
  for (let col = 15; col < 15 + gap; col++) m[0xc400 + floor * 40 + col] = 32;
  if (rope) {
    for (let row = 8; row < floor; row++) m[0xc400 + row * 40 + rope] = 99;
    m[0xc400 + floor * 40 + rope] = 100;
  }
  if (ladder) for (let row = 8; row < floor; row++) m.set([101, 102, 103], 0xc400 + row * 40 + ladder - 1);
  io.fill(13, 0x800, 0xb70);
  for (let i = 0; i < 880; i++) if ([99, 100, 102].includes(m[0xc400 + i])) io[0x800 + i] = 7;
  io[14] = x & 255; io[15] = y; io[16] = (io[16] & 127) | (x > 255 ? 128 : 0);
  m[0xc367] = m[0xc7ff] = 128; m[0xc36f] = 0;
  return s;
}
function frame({m, io}) {
  const address = 0xc000 + 64 * m[0xc7ff];
  return {v: [io[14] + (io[16] & 128 ? 256 : 0), io[15], m[0xc093], m[0xc02a], m[0xc02b], m[0xc035]],
    pixels: Buffer.from(m.slice(address, address + 63)).toString('base64'),
    color: io[0x2e] & 15, multi: !!(io[0x1c] & 128)};
}
function step(s, input) {
  assert(Object.hasOwn(JOY, input), 'Unknown input ' + input);
  s.io[0xc00] = JOY[input]; s.io[0xc01] = 255; s.io[0x1f] = 0;
  s.cpu.call(0x707b, {d: 0}, {maxSteps: 200000});
}
module.exports = {setup, frame, step, script};

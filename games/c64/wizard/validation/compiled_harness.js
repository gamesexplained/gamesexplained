/* Private-input harness for the original GAME interpreter and bytecode.
 * I/O is supplied, printing suppressed and selected calls hooked by each test.
 * This is not a full-machine emulator; pair results with the VICE observations.
 */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const GAME = path.resolve(__dirname, '..'), ROOT = path.resolve(GAME, '../../..');
const WORK = process.argv[2] ? path.resolve(process.argv[2]) : path.join(GAME, 'work');
const ROM = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'tools/vice-mcp/share/vice/C64');
const {CPU, readSnapshot} = require(ROOT + '/kit/c64/cpu6502');
const snap = readSnapshot(WORK + '/play-round1.vsf');
const rom = {
  basic: fs.readFileSync(ROM + '/basic-901226-01.bin'),
  kernal: fs.readFileSync(ROM + '/kernal-901227-03.bin')
};
function fresh() {
  const io = new Uint8Array(4096);
  io[0xc00] = 31;
  io[0xc01] = 255;
  const cpu = new CPU(Uint8Array.from(snap.ram), {
    port: {...snap.port}, rom,
    io: {read: a => io[a - 0xd000], write: (a, v) => io[a - 0xd000] = v}
  });
  return {cpu, m: cpu.m, io};
}
function set(s, i, n) {
  let v = [0, 0, (n >> 8) & 255, n & 255, 0, 0];
  if (n > 32767 || n < -32768) {
    const bits = Math.floor(Math.log2(Math.abs(n))) + 1;
    const man = Math.abs(n) * 2 ** (32 - bits);
    v = [128 + bits, Math.floor(man / 2 ** 24) & 255, Math.floor(man / 2 ** 16) & 255,
      Math.floor(man / 256) & 255, man & 255, n < 0 ? 128 : 0];
  }
  s.m.set(v, 0x2800 + 8 * i);
  s.m[0x2806 + 8 * i] = (s.m[0x2806 + 8 * i] & 4) | (v[0] ? 0 : 1);
}
function get(s, i) {
  const a = 0x2800 + 8 * i, v = s.m.slice(a, a + 6);
  if (s.m[a + 6] & 1) {
    const n = v[2] * 256 + v[3];
    return n >= 32768 ? n - 65536 : n;
  }
  if (!v[0]) return 0;
  return (v[5] & 128 ? -1 : 1) *
    (v[1] * 2 ** 24 + v[2] * 2 ** 16 + v[3] * 256 + v[4]) * 2 ** (v[0] - 160);
}
function run(s, entry, stops, extra = {}, options = {}) {
  const {cpu, m} = s;
  m[0x39] = entry & 255;
  m[0x3a] = entry >> 8;
  cpu.pc = 0x92c;
  cpu.sp = 255;
  cpu.d = 0;
  let at, observedStop = false;
  cpu.run({maxSteps: options.maxSteps || 12000000, hooks: {
    0xbbc: c => { c.pc = 0x926; },
    0xc6d: c => { c.pc = 0x926; },
    0xc40: c => { c.pc = 0x926; },
    0xc57: c => { c.pc = 0x926; },
    0xffd2: c => c.rts(),
    0xff9f: c => c.rts(),
    0xffe4: c => { c.a = 0; c.rts(); },
    0x92c: c => {
      at = m[0x39] + m[0x3a] * 256;
      observedStop = options.observe ? options.observe(at, c) === true : false;
      return observedStop || stops.includes(at);
    },
    ...extra
  }});
  assert(observedStop || stops.includes(at), 'Unexpected stop at ' + at.toString(16));
  return at;
}
module.exports = {fresh, set, get, run};

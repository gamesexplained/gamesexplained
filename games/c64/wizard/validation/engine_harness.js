/* Controlled original-engine fixtures, built from private inputs, never page data.
 * These are isolated routine tests: no automatic IRQ, elapsed time or collision geometry.
 */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const GAME = path.resolve(__dirname, '..'), ROOT = path.resolve(GAME, '../../..');
const WORK = process.argv[2] ? path.resolve(process.argv[2]) : path.join(GAME, 'work');
const {CPU, readSnapshot} = require(path.join(ROOT, 'kit/c64/cpu6502'));
const snap = readSnapshot(path.join(WORK, 'play-round1.vsf'));
function program(name, address, length) {
  const b = fs.readFileSync(path.join(WORK, name));
  assert.equal(b.readUInt16LE(), address, name + ': unexpected load address');
  assert.equal(b.length - 2, length, name + ': unexpected size');
  return b.subarray(2);
}
const font = program('chrw.prg', 0xc800, 2048);
function roomBytes(n) {
  assert(Number.isInteger(n) && n >= 0 && n < 40);
  return program('l' + String(n).padStart(2, '0') + 't.prg', 0xc300, 0x470);
}
function create(n, {simonStartup = true} = {}) {
  const io = new Uint8Array(4096), raw = roomBytes(n);
  const cpu = new CPU(Uint8Array.from(snap.ram), {port: {...snap.port}, io: {
    read: a => io[a - 0xd000], write: (a, v) => { io[a - 0xd000] = v; }
  }}), m = cpu.m;
  m.set(raw, 0xc300); m.set(font, 0xc800);
  cpu.call(0x8e9f, {d: 0}); // reset game display and runtime fields
  m[0xfb] = 0;
  cpu.call(0x910c, {d: 0}, {maxSteps: 300000, hooks: {
    0xff9f: c => { c.m[198] = 0; c.rts(); },
    0xffe4: c => { c.a = 0; c.rts(); }
  }});
  cpu.call(0x96bb, {d: 0});
  cpu.call(0x7baa, {d: 0}); // build the game's own treasure/fire index
  m[0xc07a] = 0; m[0xc078] = 2;
  cpu.call(0x7b27, {d: 0});
  cpu.call(0x8f2f, {d: 0});
  m[0xc007] = Math.floor(n / 10);
  m.set(Buffer.from('00000000'), 0xc7b7);
  m[0xc7ab] = 48; m[0xc051] = 0; m[0xc066] = 0;
  io[14] = raw[30]; io[15] = raw[31]; io[16] = raw[0x52]; io[0x15] = 128;
  for (let slot = 0; slot < 6; slot++) {
    io[slot * 2] = raw[slot]; io[slot * 2 + 1] = raw[slot + 6];
    io[0x27 + slot] = raw[0x10 + slot]; m[0xc7f8 + slot] = raw[0x60 + slot];
    if (raw[0x70 + slot]) io[0x15] |= 1 << slot;
  }
  const s = {cpu, m, io, raw};
  s.slots = Array.from({length: 16}, (_, slot) => ({slot,
    offset: m[0xc00a + slot] + 256 * m[0xc01a + slot]
  })).filter(s => s.offset < 840);
  // Controlled replay of the independently observed automatic starting pearl.
  // This does not itself prove the movement path to that pearl.
  if (n === 7 && simonStartup) collect(s, 0x333);
  return s;
}
function collect(s, offset) {
  const {cpu, m} = s, address = 0xc400 + offset, glyph = m[address];
  assert(glyph >= 28 && glyph <= 31, 'No treasure at offset ' + offset);
  m[0xfb] = address & 255; m[0xfc] = address >> 8;
  m[0xc031] = m[0xc032] = 0x12; m[0xc02a] = 0;
  cpu.call(0x7ace, {a: glyph, y: 0, d: 0}, {maxSteps: 300000});
}
function state({m, io}) {
  return {
    screen: Array.from(m.slice(0xc400, 0xc770)),
    colors: Array.from(io.slice(0x800, 0xb70), x => x & 15),
    font: Array.from(m.slice(0xc800, 0xd000)),
    actors: Array.from(m.slice(0xc370, 0xc376)),
    actorColors: Array.from(io.slice(0x27, 0x2d), x => x & 15),
    positions: Array.from({length: 6}, (_, i) => [io[i * 2] + ((io[16] >> i & 1) * 256), io[i * 2 + 1]]),
    header: Array.from(m.slice(0xc300, 0xc376)),
    dead: m[0xc02a], expansion: io[0x1d]
  };
}
function publicJSON(filename, name) {
  const text = fs.readFileSync(path.join(GAME, filename), 'utf8');
  const match = text.match(new RegExp('(?:^|\\n)const ' + name + '=(.*);(?:\\n|$)'));
  assert(match, 'Missing public dataset ' + name);
  return JSON.parse(match[1]);
}
const equal = (got, want, label) => assert.deepStrictEqual(Array.from(got), Array.from(want), label);
module.exports = {GAME, ROOT, WORK, snap, font, roomBytes, create, collect, state, publicJSON, equal};

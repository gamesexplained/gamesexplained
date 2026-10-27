'use strict';
// The KERNAL's keyboard scan as the ROM runs it, recorded so that C16.scnkey (site/lib/c16.js) can
// be checked against it with no ROM: kit/c16/test_scnkey.js. Each case holds some keys and the
// joysticks, sets the KERNAL bytes the scan reads, and runs SCNKEY from $FF9F on the kit's machine
// (kit/c16/machine.js) with the emulator's own ROMs, read at run time from the kit's plus4emu
// (tools/c16/plus4emu/roms) and never written anywhere: the fixture keeps what the scan did, its
// reads and writes of the chips in order, the RAM it changed, its cycles and the registers it left.
//   node kit/c16/scnkey_record.js            # writes kit/c16/fixtures/scnkey.json
const fs = require('fs');
const path = require('path');
const { Machine } = require('./machine.js');

const ROMS = path.join(__dirname, '..', '..', 'tools', 'c16', 'plus4emu', 'roms');
const FIXTURE = path.join(__dirname, 'fixtures', 'scnkey.json');
const CASES = 500;
// The KERNAL bytes the scan reads, and the values a case may give them
const SET = {
  0x0540: [0x00, 0x80, 0x40], 0x0541: [1, 2, 3, 4], 0x0542: [0, 1, 2, 16], 0x0544: [0, 0, 1, 8], 0x0547: [0x00, 0x00, 0x80],
  0x07F7: [0, 0, 1], 0x00EF: [0, 0, 1, 5, 9, 10], 0x053F: [10], 0x00F0: [0, 0x0D], 0x00C6: [0x40, 0x12],
  0x0543: [0, 1], 0x00EC: [0x26], 0x00ED: [0xE0], 0x00EE: [0xFF],
};
const MODIFIERS = [15, 61, 58];                    // SHIFT, C=, CTRL
const RAM_AT = [...Object.keys(SET).map(Number), 0x07F6, 0x055F, 0x0560, 0x0561, 0x0562, 0x0563, 0x0564, 0x0565, 0x0566,
  0x0545, 0x0546].sort((a, b) => a - b);
// The fixture's short form of a chip access: what the scan does to $FD30, $FF08 and $FF13
const CODES = { w64816: 'R', w65288: 'L', r65288: 'K', r65299: 'c', w65299: 'C' };
const hex = v => v.toString(16).toUpperCase().padStart(2, '0');
function access(op, a, v) {
  const c = CODES[op + a];
  if (!c) throw new Error('the scan ' + (op === 'r' ? 'read' : 'wrote') + ' $' + a.toString(16) + ', which the fixture has no letter for');
  return c + hex(v);
}
function changes(before, mem) {
  const l = [];
  for (let a = 0; a < 0x4000; a++) if (mem[a] !== before[a] && (a >> 8) !== 1) l.push(a.toString(16).toUpperCase().padStart(4, '0') + ':' + hex(mem[a]));
  return l.join(' ');
}

function rng(seed) {
  let s = seed >>> 0 || 1;
  return n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s % n; };
}

function record() {
  const rom = new Uint8Array(0x8000);
  rom.set(fs.readFileSync(path.join(ROMS, 'p4_basic.rom')), 0);
  rom.set(fs.readFileSync(path.join(ROMS, 'p4kernal.rom')), 0x4000);
  const rnd = rng(20261027), pick = l => l[rnd(l.length)];
  const cases = [];
  for (let n = 0; n < CASES; n++) {
    const keys = new Set();
    for (let k = rnd(4); k > 0; k--) keys.add(rnd(64));
    if (rnd(3) === 0) keys.add(pick(MODIFIERS));
    if (rnd(8) === 0) { keys.add(15); keys.add(61); }               // C= with SHIFT
    if (rnd(10) === 0) { keys.add(58); keys.add(13); }              // CTRL with S
    if (rnd(8) === 0) keys.add(4 + rnd(4));                         // F1, F2, F3, HELP
    const joy = rnd(4) ? 0x1F : rnd(32), joy1 = rnd(6) ? 0x1F : rnd(32);
    const ram = {};
    for (const [a, l] of Object.entries(SET)) ram[a] = pick(l);
    ram[0x07F6] = rnd(2) && keys.size ? [...keys][rnd(keys.size)] : pick([0x40, rnd(64)]);
    for (let i = 0; i < 8; i++) ram[0x055F + i] = 1 + rnd(20);
    ram[0x0545] = 0x7A; ram[0x0546] = 0xDB;
    const ff13 = (rnd(64) << 2) & 0xFC;
    // the machine: the case's RAM, a JSR $FF9F from $1000 (returning to $1003), the interrupts off
    const mem = new Uint8Array(65536);
    for (const [a, v] of Object.entries(ram)) mem[a] = v;
    mem.set([0x20, 0x9F, 0xFF, 0x4C, 0x03, 0x10], 0x1000);
    const ted = [0xE1, 0x01, 0x71, 0x7E, 0x80, 0x7E, 0x1B, 0x08, 0xFF, 0x7D, 0x02, 0xCC, 0xFC, 0xA0, 0x00, 0x00,
      0x7C, 0x00, 0x04, ff13, 0x08, 0x71, 0x5B, 0x75, 0x77, 0x6E, 0xFC, 0x00, 0xFE, 0x00, 0xC6, 0xA8];
    const m = new Machine({ ram: mem, pc: 0x1000, rom, ted });
    m.cpu.sp = 0xFF;
    for (const k of keys) m.keys.add(k);
    m.joy = joy; m.joy1 = joy1;
    m.step();                                                         // the JSR
    const before = mem.slice(0, 0x4000), c0 = m.cpu.cycles, io = [];
    const read = m.ioRead.bind(m), write = m.ioWrite.bind(m);
    const chip = a => a >= 0xFD00 && a < 0xFF40;
    m.ioRead = a => { const v = read(a); if (chip(a)) io.push(access('r', a, v)); return v; };
    m.ioWrite = (a, v) => { if (chip(a)) io.push(access('w', a, v)); return write(a, v); };
    let steps = 0;
    while (m.cpu.pc !== 0x1003) { m.step(); if (++steps > 20000) throw new Error('case ' + n + ': SCNKEY did not return'); }
    cases.push({ keys: [...keys], joy, joy1, ff13, ram: RAM_AT.map(a => hex(ram[a])).join(''), io: io.join(''),
      changed: changes(before, mem), cycles: m.cpu.cycles - c0, a: m.cpu.a, x: m.cpu.x, y: m.cpu.y });
  }
  const fixture = { source: 'kit/c16/scnkey_record.js', recorded: new Date().toISOString().slice(0, 10),
    rom: 'the 318004-05 PAL KERNAL, as plus4emu 1.2.11 (git 939e652) ships it, run on kit/c16/machine.js',
    format: 'ram: the bytes at ramAt, two hex digits each; io: one access to three characters, a letter (' +
      Object.entries(CODES).map(([k, c]) => c + ' ' + (k[0] === 'r' ? 'read' : 'write') + ' $' + (+k.slice(1)).toString(16).toUpperCase()).join(', ') +
      ') and the value in hex; changed: the RAM below $4000 the scan changed, but the stack page, as address:value in hex',
    ramAt: RAM_AT, cases };
  fs.writeFileSync(FIXTURE, JSON.stringify(fixture) + '\n');
  console.log('wrote', path.relative(process.cwd(), FIXTURE) + ':', cases.length, 'cases');
}

module.exports = { CODES, access, changes };

if (require.main === module) {
  if (process.argv[2] === '-h' || process.argv[2] === '--help') { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 9).join('\n')); process.exit(0); }
  record();
}

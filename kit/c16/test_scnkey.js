'use strict';
// A self-test of C16.scnkey (site/lib/c16.js), the KERNAL's keyboard scan in JavaScript, against
// the ROM's own: each case of kit/c16/fixtures/scnkey.json (kit/c16/scnkey_record.js) run again,
// with the same keys, joysticks and RAM, must make the same reads and writes of the chips in the
// same order, leave the same RAM (but the stack page, which the stand-in does not write), take the
// same cycles and leave A, X and Y the same. Exits 1 on any failure.  node kit/c16/test_scnkey.js
const fs = require('fs');
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'c16.js'));
const C16 = globalThis.C16;
const { access, changes } = require('./scnkey_record.js');

const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'scnkey.json'), 'utf8'));
const hex = (v, n = 2) => '$' + v.toString(16).toUpperCase().padStart(n, '0');
const ramOf = c => {
  const mem = new Uint8Array(65536);
  F.ramAt.forEach((a, i) => { mem[a] = parseInt(c.ram.substr(2 * i, 2), 16); });
  return mem;
};
let fails = 0, first = '';
for (const [n, c] of F.cases.entries()) {
  const mem = ramOf(c);
  const before = mem.slice(0, 0x4000), io = [];
  let rows = 0xFF, ff08 = 0xFF, ff13 = c.ff13;
  const chips = {
    read(a) {
      const v = a === 0xFF08 ? ff08 : a === 0xFF13 ? (ff13 & 0xFE) | 1 : 0xFF;
      io.push(access('r', a, v)); return v;
    },
    write(a, v) {
      io.push(access('w', a, v));
      if (a === 0xFD30) rows = v;
      else if (a === 0xFF08) ff08 = C16.latch(v, rows, c.keys, c.joy, c.joy1);
      else if (a === 0xFF13) ff13 = v;
    },
  };
  let r, why = '';
  try { r = C16.scnkey(a => mem[a], (a, v) => { mem[a] = v; }, chips); } catch (e) { why = e.message; }
  if (!why) {
    const changed = changes(before, mem), got = io.join('');
    if (got !== c.io) {
      let i = 0;
      while (i < got.length && got[i] === c.io[i]) i++;
      i -= i % 3;
      why = 'the chips differ at access ' + i / 3 + ': ' + (got.substr(i, 3) || 'none') + ' where the ROM made ' + (c.io.substr(i, 3) || 'none');
    } else if (changed !== c.changed) {
      why = 'the RAM differs: ' + changed + ' where the ROM left ' + c.changed;
    } else if (r.cycles !== c.cycles) why = r.cycles + ' cycles where the ROM took ' + c.cycles;
    else if (r.a !== c.a || r.x !== c.x || r.y !== c.y) why = 'A X Y ' + [r.a, r.x, r.y].map(v => hex(v)) + ' where the ROM left ' + [c.a, c.x, c.y].map(v => hex(v));
  }
  if (why) { fails++; if (!first) first = 'case ' + n + ' (keys ' + c.keys.join(' ') + ', joysticks ' + hex(c.joy) + ' ' + hex(c.joy1) + '): ' + why; }
}
console.log((fails ? 'FAIL ' : 'ok   ') + (F.cases.length - fails) + ' of ' + F.cases.length + ' keyboard scans as the ROM made them' + (first ? '\n     first: ' + first : ''));

// The kit's machine with no ROM, through kernalHooks: a JSR $FF9F from $1000 does what the ROM's
// did, in its cycles, and returns.
{
  const { Machine, kernalHooks } = require('./machine.js');
  let bad = 0, why = '';
  for (const [n, c] of F.cases.entries()) {
    if (n % 8) continue;
    const mem = ramOf(c);
    mem.set([0x20, 0x9F, 0xFF, 0x4C, 0x03, 0x10], 0x1000);
    const ted = Array.from(require('./machine.js').KERNAL_TED); ted[0x13] = c.ff13;
    const m = new Machine({ ram: mem, pc: 0x1000, ted });
    Object.assign(m.hooks, kernalHooks(m));
    m.cpu.sp = 0xFF;
    for (const k of c.keys) m.keys.add(k);
    m.joy = c.joy; m.joy1 = c.joy1;
    m.step();
    const before = mem.slice(0, 0x4000), c0 = m.cpu.cycles, io = [];
    const read = m.ioRead.bind(m), write = m.ioWrite.bind(m);
    m.ioRead = a => { const v = read(a); io.push(access('r', a, v)); return v; };
    m.ioWrite = (a, v) => { io.push(access('w', a, v)); return write(a, v); };
    m.step();
    const got = JSON.stringify([io.join(''), changes(before, mem), m.cpu.cycles - c0, m.cpu.pc, m.cpu.a, m.cpu.x, m.cpu.y]);
    if (got !== JSON.stringify([c.io, c.changed, c.cycles, 0x1003, c.a, c.x, c.y])) { bad++; if (!why) why = 'case ' + n + ': ' + got.slice(0, 200); }
  }
  console.log((bad ? 'FAIL ' : 'ok   ') + 'the machine\'s SCNKEY hook does what the ROM did' + (why ? '\n     first: ' + why : ''));
  if (bad) fails++;
}
process.exit(fails ? 1 : 0);

'use strict';
// Interrupts inside a handler that clears I, held against the emulator: kit/c64/fixtures/vic-nest.json,
// which `kit/c64/frame.py nest --record` recorded in VICE. Its program runs a raster handler that
// clears I and waits about 80 lines, CIA 1's timer A every 1,500 cycles, and sprite 0 over solid
// characters with the sprite-to-scenery interrupt on; every timer and collision interrupt writes
// what it was and its line to a table.
// - machine.js, the same program: each timer interrupt on VICE's line or the next
//   or last (the program starts the timer from a loop that waits for a line, which leaves it a few
//   cycles from where VICE's started); between two timer interrupts, the same collision
//   interrupts within two, each inside the raster handler's wait, on the sprite's lines, with what
//   $D01F read. Where a collision interrupt falls after the last depends on the cycle of the
//   handler's read in its line, which the machine keeps to within four cycles
//   (kit/c64/test_machine_collide.js), so its lines are not held to VICE's one by one.
// - With legacyInterrupts the machine runs the raster handler whole: the interrupts that fall due
//   in its wait are taken after it, and the collisions it has cleared are lost, so the table differs.
// Exits 1 on any failure. node kit/c64/test_machine_nest.js
const fs = require('fs');
const path = require('path');
const { Machine } = require('./machine.js');

const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'vic-nest.json'), 'utf8'));
let fails = 0, checked = 0;
function check(ok, what) { checked++; if (!ok) { fails++; console.log('FAIL ' + what); } }
const bytes = (h) => Uint8Array.from(Buffer.from(h, 'hex'));
const show = (w, y) => w.map((v, i) => (v === 0xC1 ? 'timer' : '$D01F=' + v.toString(16).padStart(2, '0')) + '@' + y[i]).join(' ');

function run(nest) {
  const ram = new Uint8Array(65536);
  for (const [a, h, n] of F.mem) ram.set(n === undefined ? bytes(h) : new Uint8Array(n).fill(parseInt(h, 16)), a);
  ram.set(bytes(F.program), F.org);
  ram.set(bytes(F.code), F.handler);
  const m = new Machine({ ram, pc: F.org, cia: true, dma: true, collide: true, legacyInterrupts: !nest });
  m.runFrames(F.frames);
  const n = ram[F.table];
  return { what: Array.from(ram.subarray(F.table + 0x40, F.table + 0x40 + n)), lines: Array.from(ram.subarray(F.table + 0x80, F.table + 0x80 + n)) };
}

// the table as runs: each timer interrupt's line, and the collisions after it, [what, line]
function runs(t) {
  const out = [{ line: null, hits: [] }];
  t.what.forEach((w, i) => { if (w === 0xC1) out.push({ line: t.lines[i], hits: [] }); else out[out.length - 1].hits.push([w, t.lines[i]]); });
  return out;
}
const V = runs(F);
const span = [Math.min(...F.what.map((w, i) => (w === 0xC1 ? 999 : F.lines[i]))), Math.max(...F.what.map((w, i) => (w === 0xC1 ? 0 : F.lines[i])))];
// how a machine's table differs from VICE's, as above
function offs(t) {
  const G = runs(t), off = [];
  for (let i = 0; i < V.length - 1; i++) {               // the last of VICE's runs ends where its table filled
    const v = V[i], g = G[i];
    if (!g) { off.push(`run ${i}: missing`); continue; }
    if (v.line !== null && Math.abs(((g.line - v.line + 128) & 255) - 128) > 1) off.push(`timer ${i} on line ${g.line}, VICE ${v.line}`);
    if (Math.abs(g.hits.length - v.hits.length) > 2) off.push(`after timer ${i}, ${g.hits.length} collision interrupts, VICE ${v.hits.length}`);
    for (const [w, y] of g.hits) if (y < span[0] - 1 || y > span[1] + 2 || !v.hits.some(([vw]) => vw === w)) off.push(`after timer ${i}, $D01F=${w} on line ${y}`);
  }
  return off;
}
const got = run(true), off = offs(got);
check(!off.length, `nest: ${off.slice(0, 4).join('; ')}\n  nest: ${show(got.what, got.lines)}\n  VICE: ${show(F.what, F.lines)}`);
const whole = run(false);
check(offs(whole).length > 0, `with legacyInterrupts the table passes as VICE's, so the program does not tell the two apart: ${show(whole.what, whole.lines)}`);
console.log(`${checked - fails} of ${checked} checks pass (${F.what.length} interrupts, ${F.recorded}, ${F.emulator})`);
process.exit(fails ? 1 : 0);

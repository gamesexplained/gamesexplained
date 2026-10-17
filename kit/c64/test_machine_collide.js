'use strict';
// The sprite collisions held against the emulator (#406): every case in
// kit/c64/fixtures/vic-collide.json, which kit/c64/frame.py recorded in VICE (`frame.py collide
// --record`). Each case is a scene in the video bank at $4000 and the cycles in which the program
// there read $D01E and $D01F, once to clear them and once to see what the beam had set since.
// - site/lib/collide.js on its own: the scene, the reads in the cycles VICE made them, every case.
// - kit/c64/machine.js with collide: true, running the same program on the same scene for three
//   frames: what it stored is VICE's, for every case read after the whole of the scene was drawn
//   (the timing cases read in the middle of a line, in cycles the kit's machine does not keep to
//   the cycle, and are left to the first half).
// - A save and restore in the middle of a frame, and the character ROM read through rom.char.
// Exits 1 on any failure. node kit/c64/test_machine_collide.js
const fs = require('fs');
const path = require('path');
const { Machine, LINE, FRAME } = require('./machine.js');
const { C64Collide } = globalThis;

const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'vic-collide.json'), 'utf8'));
let fails = 0, checked = 0;
function check(ok, what) { checked++; if (!ok) { fails++; console.log('FAIL ' + what); } }
const hex = (v) => '$' + v.toString(16).toUpperCase().padStart(2, '0');
const bytes = (h) => Uint8Array.from(Buffer.from(h, 'hex'));

// The scene: the 64 KB, colour RAM and the registers, from the base and the case.
function scene(c) {
  const ram = new Uint8Array(65536), colour = new Uint8Array(1024);
  for (const [a, h, n] of F.base.mem.concat(c.mem)) {
    const b = n === undefined ? bytes(h) : new Uint8Array(n).fill(parseInt(h, 16));
    if (a >= 0xD800) colour.set(b, a - 0xD800); else ram.set(b, a);
  }
  const regs = new Uint8Array(64);
  regs.set(bytes(c.regs));
  return { ram, colour, regs };
}
const at = ([line, cycle], frame) => frame * FRAME + line * LINE + cycle - 1;

// site/lib/collide.js: the beam from the top of a frame before, then the reads where VICE made them.
for (const c of F.cases) {
  const { ram, colour, regs } = scene(c);
  const C = C64Collide.create(regs, (a) => ram[0x4000 | a], (i) => colour[i]);
  C.at(0);
  const later = c.read[0][0] * LINE + c.read[0][1] <= c.clear[0][0] * LINE + c.clear[0][1] ? 2 : 1;
  C.read(0x1E, at(c.clear[0], 1)); C.read(0x1F, at(c.clear[1], 1));
  const e = C.read(0x1E, at(c.read[0], later)), f = C.read(0x1F, at(c.read[1], later));
  check(e === c.d01e && f === c.d01f, `${c.name}: collide.js reads ${hex(e)} ${hex(f)}, VICE ${hex(c.d01e)} ${hex(c.d01f)}`);
}

// machine.js: the program VICE ran, on the scene, with its table, for three frames.
function machine(c, opts = {}) {
  const { ram, colour, regs } = scene(c);
  ram.set(bytes(F.program.code), F.program.org);
  const read = [c.clear[0][0], c.read[0][0]];
  ram.set([...regs.subarray(0, 47), ...F.base.cia2, read[0] > 255 ? 0x80 : 0, read[0] & 255, read[1] > 255 ? 0x80 : 0, read[1] & 255, 1],
    F.program.table);
  const m = new Machine(Object.assign({ ram, pc: F.program.org, collide: true, dma: true }, opts));
  m.colour.set(colour);
  return m;
}
for (const c of F.cases.filter((c) => !c.name.startsWith('timing'))) {
  const m = machine(c);
  m.runFrames(3);
  check(m.ram[2] === c.d01e && m.ram[3] === c.d01f,
    `${c.name}: machine.js stored ${hex(m.ram[2])} ${hex(m.ram[3])}, VICE ${hex(c.d01e)} ${hex(c.d01f)}`);
}

// Saved in the middle of a frame (line 150, after the clear and before the read) and restored: the
// machine goes on as one never stopped.
{
  const c = F.cases.find((c) => c.name === 'two sprites overlapping');
  const a = machine(c), b = machine(c);
  a.runFrames(2); b.runFrames(2);
  a.runCycles(150 * LINE); b.runCycles(150 * LINE);
  const r = Machine.restore(b.save());
  check(!!r.collide, 'a restored machine keeps collide');
  a.runFrames(1); r.runFrames(1);
  check(a.ram[2] === r.ram[2] && a.ram[2] === c.d01e, `restored in the middle of a frame: ${hex(r.ram[2])}, the machine never stopped ${hex(a.ram[2])}`);
}

// The character ROM, which the chip sees at $1000-$1FFF of banks 0 and 2: a sprite over a character
// of it collides with the ROM's glyph when rom.char gives it, and with nothing otherwise, counted.
{
  const c = F.cases.find((c) => c.name === 'a sprite over a solid character');
  const glyphs = new Uint8Array(4096);
  glyphs.fill(0xFF, 8 * 1, 8 * 2);                       // glyph 1 solid, as the scene's own
  for (const [rom, want] of [[glyphs, 1], [null, 0]]) {
    const m = machine(c, rom ? { rom: { char: glyphs } } : {});
    m.ram[F.program.table + 47] = 0x97;                   // bank 0, the characters at $1000 in it
    m.ram[F.program.table + 0x18] = 0x14;
    for (let i = 0; i < 1024; i++) m.ram[0x0400 + i] = m.ram[0x4400 + i];
    m.ram[0x07F8] = m.ram[0x47F8]; m.ram.set(m.ram.subarray(0x4C00, 0x4C40), 0x0C00);
    m.runFrames(3);
    check(m.ram[3] === want && (rom ? m.collideRomReads === 0 : m.collideRomReads > 0),
      `the character ROM ${rom ? 'given' : 'not given'}: $D01F ${hex(m.ram[3])}, ${m.collideRomReads} ROM reads counted`);
  }
}

console.log(`${checked - fails} of ${checked} checks pass (${F.cases.length} cases, ${F.recorded}, ${F.emulator})`);
process.exit(fails ? 1 : 0);

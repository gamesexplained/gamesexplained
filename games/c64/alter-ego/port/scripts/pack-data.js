'use strict';
// The machine and the disks as the Play page carries them: the game's data, and none of its
// program. The page starts where the loader jumps to the game ($4000, parts/main/work/entry.vsf),
// with memory, colour RAM and the chips as they stand there, and with the files the game reads as
// it plays. Left out:
// - every byte of a 6502 instruction, as the three parts' listings mark them, and every byte of
//   the p-code, the program the interpreter at $713C runs: each procedure's adjust word and every
//   instruction its body reaches (port/scripts/vm.py --bytes), and the saved byte and adjust word
//   of each 6502 body with a frame ($7059). In memory these are the resident program's; in MAP1
//   they are the start and life objects', which the game reads into its heap at $8466;
// - what the loader left in memory that the game never reads before it writes it: $0800-$1FFF
//   and $8466-$FFFF hold the loader's work and the emulator's power-on pattern at the hand-over,
//   and the page has zeros there (test_play.js runs the page on this memory and on the whole one);
// - the loader's own files (ACTIVISION, SIGNI1, SIGNI2, 1985, COPYRIGHT), which the game never
//   opens once it runs.
// The character ROM (901225-01) is the machine's: the page carries the 91 glyphs the game copies
// from it, the ones its table at $4825 points at (ASCII $20-$7A), and nothing else of it.
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
// The result: { state: kit/c64/machine.js's save() of the machine, its memory blanked, files:
// { NAME: base64 }, glyphs: { at: offset in the ROM, b64 }, kept: counts }.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const lib = require('../test/lib.js');
const GAME = lib.GAME;
const VM = path.join(__dirname, 'vm.py');
// the files the game opens as it plays: the six sides' MAP files and the saved games
const FILES = ['MAP1', 'MAP27', 'MAP3', 'MAP4', 'MAP5', 'MAP6', 'AES0', 'AES1', 'AES2', 'AES3', 'AES4', 'AESD'];
// MAP1's payload offsets of the start and life objects' four-byte headers (port/src/runtime.js)
const OBJECTS = { start: 6104, life: 11528 };

// The program's bytes in a part: { addr: true } for every instruction byte, p-code included
function program(part) {
  const dir = path.join(GAME, 'parts', part);
  const L = JSON.parse(fs.readFileSync(path.join(dir, 'listing.json'), 'utf8'));
  const out = new Set(), stubs = [];
  for (const r of L.records) {
    if (r.t !== 'code') continue;
    for (let i = 0; i < r.b.length; i++) out.add(r.a + i);
    if (r.b[0] === 0x20 && r.b[1] === 0xF8 && r.b[2] === 0x70) stubs.push(r.a);
    if (r.b[0] === 0x20 && r.b[1] === 0x59 && r.b[2] === 0x70) for (let k = 3; k < 6; k++) out.add(r.a + k);
  }
  const bytes = JSON.parse(execFileSync('python3', [VM, path.join(dir, 'listing.json'), '0', '0', '--bytes'],
    { input: stubs.map(a => a.toString(16)).join('\n') }).toString());
  for (const a of bytes) out.add(a);
  return out;
}

// A relative file's payload offset p as its place in the file: records of [':', 252 bytes, ':']
const inFile = p => Math.floor(p / 252) * 254 + 1 + (p % 252);

function pack() {
  const m = lib.machine('parts/main/work/entry.vsf');
  const s = m.save(), ram = Uint8Array.from(m.ram);
  let blanked = 0;
  // memory: the resident program out, and the loader's leftovers
  const L = JSON.parse(fs.readFileSync(path.join(GAME, 'parts/main/listing.json'), 'utf8')), at = new Map();
  for (const r of L.records) if (r.b) for (let i = 0; i < r.b.length; i++) at.set(r.a + i, r.b[i]);
  let differ = 0;
  for (const a of program('main')) if (a < 0x8466) { if (at.get(a) !== ram[a]) differ++; ram[a] = 0; blanked++; }
  // memory whose program is not the listing's is the wrong memory
  if (differ) throw new Error(differ + ' bytes of the program at the hand-over differ from the listing');
  ram.fill(0, 0x0800, 0x2000);
  ram.fill(0, 0x8466, 0x10000);
  s.ram = Buffer.from(ram).toString('base64');
  for (const k of ['passAt', 'frames', 'passes', 'skipOnce', 'keys', 'dma', 'nmiDue', 'collide']) delete s[k];
  delete s.drive;
  // the disks: the objects' program out of MAP1
  const all = lib.files(), files = {};
  for (const n of FILES) {
    if (!all[n]) throw new Error('no ' + n + ' in work/files');
    files[n] = Uint8Array.from(all[n]);
  }
  const map1 = files.MAP1;
  let inMap = 0;
  for (const [part, at] of Object.entries(OBJECTS)) {
    const h = [0, 1, 2, 3].map(i => map1[inFile(at + i)]);
    const base = h[0] | h[1] << 8, len = h[2] | h[3] << 8;
    for (const a of program(part)) {
      if (a < base || a >= base + len) throw new Error(part + ': $' + a.toString(16) + ' is outside its object');
      map1[inFile(at + 4 + a - base)] = 0; inMap++;
    }
  }
  // the glyphs the game copies from the character ROM
  const rom = lib.charRom();
  if (!rom) throw new Error('no character ROM in tools/ (kit/INSTALL.md)');
  const glyphs = new Uint8Array(0x1000);
  let nGlyphs = 0;
  for (let ch = 0x20; ch <= 0x7A; ch++) {
    const i = (ch - 0x20) * 2, src = (m.ram[0x4825 + i] | m.ram[0x4826 + i] << 8) - 0xD000;
    if (src < 0 || src > 0xFF8) throw new Error('glyph $' + ch.toString(16) + ' at $' + (src + 0xD000).toString(16));
    glyphs.set(rom.subarray(src, src + 8), src); nGlyphs++;
  }
  const b64 = u => Buffer.from(u).toString('base64');
  return { state: s, files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, b64(v)])), glyphs: b64(glyphs),
    kept: { blanked, inMap, glyphs: nGlyphs } };
}

if (require.main === module) {
  const p = pack();
  console.log('memory: ' + p.kept.blanked + ' bytes of the resident program left out; MAP1: ' + p.kept.inMap +
    ' bytes of the start and life objects; ' + p.kept.glyphs + ' glyphs of the character ROM');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(p));
}
module.exports = { pack, program, FILES, OBJECTS, inFile };

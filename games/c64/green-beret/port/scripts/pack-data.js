'use strict';
// The machine as the Play page carries it: the game's data, and none of its program. The page
// starts at the start-up the depacker jumps to ($4000), as the port's tests start the game
// (test/lib.js, boot: the memory listing.json records, the chips as kit/c64/machine.js starts
// them), but every byte of an instruction, as the listing marks them, is a zero. What is left is
// the game's tables, texts, character sets, sprites, maps and tunes, which the port reads where the
// game keeps them. Some instructions are the game's state or data too, and stay:
// - the bytes port/src reads or writes in the game's code, by the names it gives them (GBNames:
//   the operands the code rewrites, its tables' first bytes) or by address (M[0x....]), each with
//   the two bytes after it (../test_play.js runs the page's machine on this beside the whole
//   memory, and finds any it reads that this misses);
// - the sound driver ($E000-$EC07, its crash $F1FB-$F27C and its pulse helpers $3F58-$3FA2), which
//   the port runs on a 6502 core of its own as a music player does (src/g-sound.js).
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
// pack() gives { state, kept }: kit/c64/machine.js's save() of the machine, its memory blanked, and
// [code bytes blanked, bytes kept, code bytes kept as state or data].
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const GAME = path.resolve(ROOT, '..');

const DRIVER = [[0xE000, 0xEC07], [0xF1FB, 0xF27C], [0x3F58, 0x3FA2]];

// The addresses the port names in the game's code
function named() {
  const keep = new Set(), SRC = path.join(ROOT, 'src');
  const add = a => { for (let k = 0; k < 3; k++) keep.add((a + k) & 0xFFFF); };
  require(path.join(SRC, 'names.js'));
  for (const a of Object.values(globalThis.GBNames)) add(a);
  for (const f of fs.readdirSync(SRC)) {
    const text = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const m of text.matchAll(/\bM\[\(?\s*0x([0-9A-Fa-f]{4})\b/g)) add(parseInt(m[1], 16));
  }
  return keep;
}

// The addresses of the instructions in the listing
function code(L) {
  const at = new Set();
  for (const r of L.records) if (r.t === 'code') for (let i = 0; i < r.b.length; i++) at.add(r.a + i);
  return at;
}

// the machine at the start-up, as the page carries it
function pack() {
  const lib = require(path.join(ROOT, 'test', 'lib.js'));
  const s = lib.boot().save();
  const L = JSON.parse(fs.readFileSync(path.join(GAME, 'listing.json'), 'utf8'));
  const ram = Uint8Array.from(Buffer.from(s.ram, 'base64')), keep = named(), at = code(L);
  let n = 0, state = 0;
  for (const a of at) {
    if (DRIVER.some(([f, l]) => a >= f && a <= l)) continue;
    if (keep.has(a)) { state++; continue; }
    ram[a] = 0; n++;
  }
  s.ram = Buffer.from(ram).toString('base64');
  // what the page needs of the machine, and nothing of the emulator's own bookkeeping
  for (const k of ['passAt', 'frames', 'passes', 'skipOnce', 'keys', 'nmiDue', 'legacyInterrupts', 'under', 'joy', 'joy1', 'collide']) delete s[k];
  return { state: s, kept: [n, 0x10000 - n, state] };
}

if (require.main === module) {
  const p = pack();
  const [n, k, st] = p.kept;
  console.log(n + ' bytes of code blanked, ' + k + ' kept, ' + st + ' of them code the port keeps state or data in');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(p.state));
}
module.exports = { pack, DRIVER };

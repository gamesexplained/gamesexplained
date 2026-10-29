'use strict';
// The machine as the Play page carries it: the game's data, and none of its program. The page
// starts at the game's first instruction ($8009), as test_route.js starts the game (the memory
// listing.json records, the few bytes below it BASIC and the loader leave, the chips as
// kit/c64/machine.js starts them), but every byte of an instruction, as the listing marks them, is a
// zero. What is left is the game's tables, texts, character sets, sprites, rooms and tunes, which
// the port reads where the game keeps them. Some instructions are the game's state or data too,
// and stay:
// - operands the code rewrites, wherever port/src names their address (../test_play.js runs the
//   page's machine on this beside the whole memory, and finds any it reads that this misses);
// - the sound driver ($AFC5-$B499), which the port runs on a 6502 core of its own as a music player
//   does (src/g-sound.js).
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
// pack() gives { state, kept }: kit/c64/machine.js's save() of the machine, its memory blanked, and
// [code bytes blanked, bytes kept, code bytes kept as state or data].
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const GAME = path.resolve(ROOT, '..');

const DRIVER = [0xAFC5, 0xB499];

// The addresses the port reads or writes in the game's code, as port/src names them: M[$xxxx] and
// M[$xxxx + ...], each with the two bytes after it (an instruction's operand, where the code
// rewrites an instruction's operand by the instruction's address).
function named() {
  const keep = new Set(), SRC = path.join(ROOT, 'src');
  for (const f of fs.readdirSync(SRC)) {
    const text = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const m of text.matchAll(/\bM\[\(?\s*0x([0-9A-Fa-f]{4})\b/g)) {
      const a = parseInt(m[1], 16);
      for (let k = 0; k < 3; k++) keep.add((a + k) & 0xFFFF);
    }
  }
  return keep;
}

// The addresses of the instructions in the listing
function code(L) {
  const at = new Set();
  for (const r of L.records) if (r.t === 'code') for (let i = 0; i < r.b.length; i++) at.add(r.a + i);
  return at;
}

// the machine at the game's first instruction, as the page carries it
function pack() {
  const { boot } = require(path.join(GAME, 'test_route.js'));
  const s = boot().save();
  const L = JSON.parse(fs.readFileSync(path.join(GAME, 'listing.json'), 'utf8'));
  const ram = Uint8Array.from(Buffer.from(s.ram, 'base64')), keep = named(), at = code(L);
  let n = 0, state = 0;
  for (const a of at) {
    if (a >= DRIVER[0] && a <= DRIVER[1]) continue;
    if (keep.has(a)) { state++; continue; }
    ram[a] = 0; n++;
  }
  s.ram = Buffer.from(ram).toString('base64');
  // what the page needs of the machine, and nothing of the emulator's own bookkeeping
  for (const k of ['passAt', 'frames', 'passes', 'skipOnce', 'keys', 'nmiDue', 'sid', 'legacyInterrupts', 'under', 'joy', 'joy1']) delete s[k];
  return { state: s, kept: [n, 0x10000 - n, state] };
}

if (require.main === module) {
  const p = pack();
  const [n, k, st] = p.kept;
  console.log(n + ' bytes of code blanked, ' + k + ' kept, ' + st + ' of them code the port keeps state or data in');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(p.state));
}
module.exports = { pack, DRIVER };

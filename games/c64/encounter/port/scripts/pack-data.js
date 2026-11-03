'use strict';
// The machine as the Play page carries it: the game's data, and none of its program. The page
// starts at the game's first instruction ($9C3E, where a reset enters it: test/lib.js, boot: the
// memory listing.json records, the chips as kit/c64/machine.js starts them), but every byte of an
// instruction, as the listing marks them, is a zero. What is left is the game's tables, shapes,
// scenes, screens and texts, which the port reads where the game keeps them. Some instructions
// are the game's data too, and stay:
// - any instruction's bytes whose address port/src reads or writes by name (M[$xxxx], or a helper
//   given an address to read, abx and shr2), with the two bytes after it: none of the game's code
//   is written as it runs, so there are none;
// - $A800-$A8FF, the game's own code, which the death's flash shows as colours (P.flash,
//   src/g-main.js): only their low nibbles, all the video chip shows of a colour.
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
// The result is kit/c64/machine.js's save() of the machine, its memory blanked; kept: [code bytes
// blanked, bytes kept, code bytes the port reads as data, code bytes kept as nibbles]; and
// blanked(a), true for an address it changed. blank(saved) does the same to any save(), a moment
// of play (test/t-page.js).
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

const FLASH = [0xA800, 0xA8FF];

// The addresses the port reads or writes in the game's code, as port/src names them
const SRC = path.join(__dirname, '../src');
function named() {
  const keep = new Set();
  for (const f of fs.readdirSync(SRC)) {
    const text = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const m of text.matchAll(/(?:\bM\[\(?\s*|\b(?:abx|shr2)\()0x([0-9A-Fa-f]{4})\b/g)) {
      const a = parseInt(m[1], 16);
      if (a >= FLASH[0] && a <= FLASH[1]) continue;
      for (let k = 0; k < 3; k++) keep.add((a + k) & 0xFFFF);
    }
  }
  return keep;
}

// The addresses of the instructions in the listing
function code() {
  const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'listing.json'), 'utf8'));
  const at = new Set();
  for (const r of L.records) if (r.t === 'code') for (let i = 0; i < r.b.length; i++) at.add(r.a + i);
  return at;
}

// a machine's save() as the page carries it: every instruction's byte a zero but those kept
function blank(saved) {
  const s = Object.assign({}, saved), ram = Uint8Array.from(Buffer.from(s.ram, 'base64')), keep = named(), at = code();
  let n = 0, state = 0, nibbles = 0;
  for (const a of at) {
    if (a >= FLASH[0] && a <= FLASH[1]) { ram[a] &= 0x0F; nibbles++; continue; }
    if (keep.has(a)) { state++; continue; }
    ram[a] = 0; n++;
  }
  s.ram = Buffer.from(ram).toString('base64');
  // what the page needs of the machine, and nothing of the emulator's own bookkeeping
  for (const k of ['passAt', 'frames', 'passes', 'skipOnce', 'keys', 'nmiDue', 'cia', 'collide', 'sidBus']) delete s[k];
  return { state: s, kept: [n, 0x10000 - n - nibbles, state, nibbles], blanked: a => at.has(a) && !keep.has(a) };
}
function pack() { return blank(lib.boot().save()); }

if (require.main === module) {
  const p = pack();
  const [n, k, st, nb] = p.kept;
  console.log(n + ' bytes of code blanked, ' + nb + ' kept as nibbles, ' + k + ' kept whole, ' + st + ' of them code the port reads as data');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(p.state));
}
module.exports = { pack, blank, FLASH };

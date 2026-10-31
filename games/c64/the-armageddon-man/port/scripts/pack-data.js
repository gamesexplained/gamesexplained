'use strict';
// The machine as the Play page carries it: the game's data, and none of its program. The page
// starts where the loader hands over (game_start, $4E96: test/lib.js, boot: the memory listing.json
// records, the chips as kit/c64/machine.js starts them), but every byte of an instruction, as the
// listing marks them, is a zero. What is left is the game's tables, texts, pictures, scripts and
// map, which the port reads where the game keeps them. Some instructions are the game's state or
// data too, and stay:
// - operands the code rewrites, and the calls whose targets it sets (read_controls's at $512C),
//   wherever port/src names their address (../test_play.js runs the page on this beside the page
//   on the whole memory, and finds any it reads that this misses);
// - the sound driver ($4000-$4DE7, its random numbers at $4DCF included), which the port runs on
//   a 6502 core of its own as a music player does (src/g-irq.js).
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
// The result is kit/c64/machine.js's save() of the machine, its memory blanked; kept: [code bytes
// blanked, bytes kept, code bytes the port keeps state or data in]; and blanked(a), true for an
// address it zeroed. blank(saved) does the same to any save().
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

const DRIVER = [0x4000, 0x4DE7];

// The addresses the port reads or writes in the game's code, as port/src names them: M[$xxxx] and
// any helper given an address first, each with the two bytes after it (an instruction's operand,
// where the helper takes the instruction's address).
const SRC = path.join(__dirname, '../src');
function named() {
  const keep = new Set();
  for (const f of fs.readdirSync(SRC)) {
    if (f === 'names.js') continue;
    const text = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const m of text.matchAll(/(?:\bM\[\(?\s*|\b[A-Za-z_][\w.]*\((?:M,\s*)?)0x([0-9A-Fa-f]{4})\b/g)) {
      const a = parseInt(m[1], 16);
      for (let k = 0; k < 3; k++) keep.add((a + k) & 0xFFFF);
    }
  }
  return keep;
}

// The addresses of the instructions in the listing
function code() {
  const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'listing.json'), 'utf8'));
  const at = new Set();
  for (const r of L.records) if (r.t === 'code' && r.b) for (let i = 0; i < r.b.length; i++) at.add(r.a + i);
  return at;
}

// a machine's save() as the page carries it: every instruction's byte a zero but those kept
function blank(saved) {
  const s = Object.assign({}, saved), ram = Uint8Array.from(Buffer.from(s.ram, 'base64')), keep = named(), at = code();
  let n = 0, state = 0;
  for (const a of at) {
    if (a >= DRIVER[0] && a <= DRIVER[1]) continue;
    if (keep.has(a)) { state++; continue; }
    ram[a] = 0; n++;
  }
  s.ram = Buffer.from(ram).toString('base64');
  // what the page needs of the machine, and nothing of the emulator's own bookkeeping
  for (const k of ['passAt', 'frames', 'passes', 'skipOnce', 'keys', 'nmiDue', 'cia', 'collide', 'joy', 'joy1', 'lastCycles', 'under', 'legacyInterrupts']) delete s[k];
  return { state: s, kept: [n, 0x10000 - n, state], blanked: a => at.has(a) && !(a >= DRIVER[0] && a <= DRIVER[1]) && !keep.has(a) };
}
function pack() { return blank(lib.boot().save()); }

if (require.main === module) {
  const p = pack();
  const [n, k, st] = p.kept;
  console.log(n + ' bytes of code blanked, ' + k + ' kept, ' + st + ' of them code the port keeps state or data in');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(p.state));
}
module.exports = { pack, blank, DRIVER };

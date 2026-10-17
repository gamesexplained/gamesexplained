'use strict';
// The machine as the Play page carries it: the game's data, and none of its program. The page
// starts where the loader jumps to the game ($473B, work/entry.vsf), with memory, colour RAM and
// the chips as they stand there, but every byte of an instruction, as the listing marks them, is
// a zero. What is left is the game's tables, texts, objects, scripts, the panel and the font,
// which the port reads where the game keeps them.
// Some instructions are the game's state too, and the port keeps that state where the game does:
// operands the code rewrites, the patches it makes to itself. Those bytes stay, wherever port/src
// names their address (test/t-page.js runs the page's machine on this beside the whole memory, and
// finds any it reads that this misses). So does the music driver ($C800-$CFFF), which the port
// runs on a 6502 core of its own as a music player does (src/g-sound.js).
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
// The result is kit/c64/machine.js's save() of the machine, its memory blanked, and kept: [code
// bytes blanked, bytes kept, code bytes the port keeps state in].
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

const DRIVER = [0xC800, 0xCFFF];

// The addresses the port reads or writes in the game's code, as port/src names them: M[$xxxx] and
// any helper given an address first, each with the two bytes after it (an instruction's operand,
// where the helper takes the instruction's address).
const SRC = path.join(__dirname, '../src');
function named() {
  const keep = new Set();
  for (const f of fs.readdirSync(SRC)) {
    const text = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const m of text.matchAll(/(?:\bM\[\(?\s*|\b[A-Za-z_][\w.]*\((?:M,\s*)?)0x([0-9A-Fa-f]{4})\b/g)) {
      const a = parseInt(m[1], 16);
      for (let k = 0; k < 3; k++) keep.add((a + k) & 0xFFFF);
    }
  }
  return keep;
}

// The addresses of the instructions in the listing, with their bytes
function code() {
  const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'listing.json'), 'utf8'));
  const at = new Map();
  for (const r of L.records) if (r.t === 'code') for (let i = 0; i < r.b.length; i++) at.set(r.a + i, r.b[i]);
  return at;
}

function pack() {
  const m = lib.machine('entry');
  const s = m.save(), ram = Uint8Array.from(m.ram), keep = named(), at = code();
  let n = 0, differ = 0, state = 0;
  for (const [a, b] of at) {
    if (a >= DRIVER[0] && a <= DRIVER[1]) continue;
    if (keep.has(a)) { state++; continue; }
    // a byte the listing's snapshot holds otherwise is a self-modified operand: blanked too
    if (b !== ram[a]) differ++;
    ram[a] = 0; n++;
  }
  // memory whose bytes are not the listing's is the wrong memory
  if (differ > n / 20) throw new Error(differ + ' of ' + n + ' instruction bytes differ from the listing');
  s.ram = Buffer.from(ram).toString('base64');
  // what the page needs of the machine, and nothing of the emulator's own bookkeeping
  for (const k of ['passAt', 'frames', 'passes', 'skipOnce', 'keys', 'dma', 'nmiDue']) delete s[k];
  return { state: s, kept: [n, 0x10000 - n, state] };
}

if (require.main === module) {
  const p = pack();
  const [n, k, st] = p.kept;
  console.log(n + ' bytes of code blanked, ' + k + ' kept, ' + st + ' of them code the port keeps state in');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(p.state));
}
module.exports = { pack, DRIVER };

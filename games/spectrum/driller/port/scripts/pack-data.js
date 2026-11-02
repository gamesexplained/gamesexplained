'use strict';
// The machine as the Play page carries it: the game's data, and none of its program. The page
// starts where the loader hands over to the game ($97A4), with the 48 KB from $4000 as the listing
// holds it (test/lib.js's memory()), but every byte of an instruction, as the listing marks it, is
// a zero. What is left is the game's areas and their objects, its tables, texts, fonts, the
// console's picture and the sounds' tables, which the port reads where the game keeps them.
// Some instructions are the game's state too, and the port keeps that state where the game does:
// operands the code rewrites, and the PUSH IX the security question spoils and mends ($6B12).
// Those bytes stay, wherever port/src names their address. test/t-page.js runs the page's machine
// on this beside the whole memory, and finds any byte it reads that this misses.
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
// The result is the 48 KB at the hand-over (ram, from $4000), its border, and the ROM's bytes the
// game reads (rom-excerpt.json, which names the ROM; never the whole ROM).
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

const GAME = path.join(__dirname, '..', '..');
const LISTING = path.join(GAME, 'listing.json');

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

// o.whole: the same machine with nothing blanked (test/t-page.js runs the page on both); the
// blanked addresses are in .blank, a Uint8Array(0x10000)
function pack(o = {}) {
  const ram = lib.memory().slice();
  const keep = named(), blank = new Uint8Array(0x10000);
  let n = 0, state = 0;
  if (!fs.existsSync(LISTING)) throw new Error('pack-data: no listing.json yet, so no way to tell code from data');
  for (const r of JSON.parse(fs.readFileSync(LISTING, 'utf8')).records) {
    if (r.t !== 'code' || !r.b) continue;
    for (let i = 0; i < r.b.length; i++) {
      const a = r.a + i;
      if (a < 0x4000) continue;
      if (keep.has(a)) { state++; continue; }
      if (!o.whole) ram[a] = 0;
      blank[a] = 1; n++;
    }
  }
  const data = { ram: Buffer.from(ram.subarray(0x4000)).toString('base64'), from: 0x4000, border: 7, tstates: 0,
    rom: { from: lib.EXCERPT.from, bytes: Buffer.from(lib.ROM).toString('base64') } };
  return { state: data, blank, kept: [n, 0xC000 - n, state] };
}

if (require.main === module) {
  const p = pack();
  const [n, k, st] = p.kept;
  console.log(n + ' bytes of code blanked, ' + k + ' kept: ' + st + ' of them code the port keeps state in');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(p.state));
}
module.exports = { pack };

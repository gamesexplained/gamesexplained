'use strict';
// The machine as the Play page carries it: the game's data, and none of its program. The page
// starts where the loader hands over to the game ($8521), with the eight banks as the listings
// hold them (test/lib.js's boot()), but every byte of an instruction, as the listings mark them, is
// a zero. What is left is the game's tables, maps, pictures, texts, tunes and the panel, which the
// port reads where the game keeps them.
// Some instructions are the game's state too, and the port keeps that state where the game does:
// operands the code rewrites. Those bytes stay, wherever port/src names their address (in every
// bank, for an address above $C000). So does code the game reads as data (KEEP): bank 3 whole,
// because the game's random numbers are its bytes read in turn. test/t-page.js runs the page's
// machine on this beside the whole memory, and finds any byte it reads that this misses.
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
// The result is kit/spectrum/machine.js's save() of the machine at the hand-over, cut to what
// the page reads (the banks, the paging, the AY, the border and the clock), its banks blanked, and
// ROM 0's bytes the game reads (rom-excerpt.json, which names the ROM; never the whole ROM).
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

const GAME = path.join(__dirname, '..', '..');
// the parts' listings and the banks they hold: main's $4000-$FFFF is banks 5, 2 and 0
const PARTS = { main: null, 'bank-01': 1, 'bank-03': 3, 'bank-04': 4, 'bank-06': 6, 'bank-07': 7 };

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
// Code the game also reads as data, kept whole: [bank, from, to), by address
const KEEP = [
  // the random numbers ($E481) are bank 3's bytes in turn, the pointer stepping round
  // $C000-$FFFF through its code as well as its tables
  [3, 0xC000, 0x10000],
  // the start-up code is the visibility mask's buffer ($8521-$85E0): until the first cut-out
  // fills it with $FF ($A6F2), sprites take its bytes as their mask, and the tallest frames read
  // on past its end into the code at $85E1
  [2, 0x8521, 0x8600],
  // tune 17's notes on channel A ($7188) are read from $7212, the code of tune 18's section
  [5, 0x7212, 0x7232],
];
const kept = (bank, a) => KEEP.some(([b, f, t]) => b === bank && a >= f && a < t);
// Each bank's offset of an address in a part, or -1
const where = (bank, a) => {
  if (bank !== null) return a >= 0xC000 ? [[bank, a - 0xC000]] : [];
  if (a < 0x4000) return [];
  return [[a < 0x8000 ? 5 : a < 0xC000 ? 2 : 0, a & 0x3FFF]];
};

// o.whole: the same machine with nothing blanked (test/t-page.js runs the page on both); the
// blanked addresses are in .blank, a Uint8Array(0x4000) for each bank
function pack(o = {}) {
  const m = lib.boot();
  const s = m.save(), keep = named();
  const banks = s.banks.map(b => new Uint8Array(Buffer.from(b, 'base64')));
  const blank = banks.map(() => new Uint8Array(0x4000));
  let n = 0, state = 0, read = 0;
  for (const [part, bank] of Object.entries(PARTS)) {
    const L = JSON.parse(fs.readFileSync(path.join(GAME, 'parts', part, 'listing.json'), 'utf8'));
    for (const r of L.records) {
      if (r.t !== 'code' || !r.b) continue;
      for (let i = 0; i < r.b.length; i++) {
        const a = r.a + i;
        if (keep.has(a)) { state++; continue; }
        for (const [b, i] of where(bank, a)) {
          if (kept(b, a)) { read++; continue; }
          if (!o.whole) banks[b][i] = 0; blank[b][i] = 1; n++;
        }
      }
    }
  }
  const data = { banks: banks.map(b => Buffer.from(b).toString('base64')), paging: s.paging, ay: s.ay, border: s.border, ear: s.ear,
    tstates: s.cpu.tstates, rom: { from: lib.EXCERPT.from, bytes: Buffer.from(lib.ROM0).toString('base64') } };
  return { state: data, blank, kept: [n, 8 * 0x4000 - n, state, read] };
}

if (require.main === module) {
  const p = pack();
  const [n, k, st, rd] = p.kept;
  console.log(n + ' bytes of code blanked, ' + k + ' kept: ' + st + ' of them code the port keeps state in, ' + rd + ' code the game reads as data');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(p.state));
}
module.exports = { pack };

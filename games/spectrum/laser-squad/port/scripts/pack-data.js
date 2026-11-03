'use strict';
// The machine as the Play page carries it: the game's data, and none of its program. The page
// starts at the engine's first instruction ($5E28), with the 48 KB from $4000 as the engine's
// listing holds it (test/lib.js, fromListing), and the five scenarios' blocks as the cassette holds
// them (listingTape), but every byte of an instruction, as the listings mark it, is a zero. What
// is left is the engine's tables, its messages, its font, its sound effects, and each scenario's
// header, units, map, tables of squares, tiles, messages and the computer player's tables, which
// the port reads where the game keeps them.
// Some instructions are the game's state too, and the port reads them where the game does: the
// eight hooks at the head of each scenario ($B621-$B638, a JP to the scenario's routine or a RET,
// which the port follows), and any byte port/src names by its address. Those bytes stay. The page
// gives the random numbers noise for every byte it leaves out (page/runtime.js), and
// ../../test_play.js runs the page on this beside the whole memory, and finds any other byte it
// reads that this misses.
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

const GAME = path.join(__dirname, '..', '..');
const SRC = path.join(__dirname, '../src');
const HOOKS = [0xB621, 0xB639];

// The addresses port/src names: M[$xxxx] and any helper given an address first, each with the two
// bytes after it (an instruction's operand, where the helper takes the instruction's address).
function named() {
  const keep = new Set();
  for (const f of fs.readdirSync(SRC)) {
    const text = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const m of text.matchAll(/(?:\bM\[\(?\s*|\b[A-Za-z_][\w.]*\((?:M,\s*)?)0x([0-9A-Fa-f]{4})\b/g)) {
      const a = parseInt(m[1], 16);
      for (let k = 0; k < 3; k++) keep.add((a + k) & 0xFFFF);
    }
  }
  for (let a = HOOKS[0]; a < HOOKS[1]; a++) keep.add(a);
  return keep;
}

// the bytes of code in a listing: blank[a] 1 for each
function codeIn(file, blank) {
  for (const r of JSON.parse(fs.readFileSync(file, 'utf8')).records) {
    if (r.t !== 'code' || !r.b) continue;
    blank.fill(1, r.a, r.a + r.b.length);
  }
  return blank;
}
// runs of set bytes from..to-1: [[address, length], ...]
function runsOf(blank, from, to) {
  const out = [];
  for (let a = from; a < to;) {
    if (!blank[a]) { a++; continue; }
    let b = a; while (b < to && blank[b]) b++;
    out.push([a, b - a]); a = b;
  }
  return out;
}
const b64 = u => Buffer.from(u).toString('base64');

// o.whole: the same machine with nothing blanked (test_play.js runs the page on both); blank, the
// same runs either way
function pack(o = {}) {
  const keep = named();
  const strip = (mem, blank, from, to) => {
    let n = 0;
    for (let a = from; a < to; a++) {
      if (!blank[a]) continue;
      if (keep.has(a)) { blank[a] = 0; continue; }
      if (!o.whole) mem[a] = 0;
      n++;
    }
    return n;
  };
  const ram = lib.listingBytes(path.join(GAME, 'parts', 'engine', 'listing.json'));
  const eb = codeIn(path.join(GAME, 'parts', 'engine', 'listing.json'), new Uint8Array(0x10000));
  const kept = { engine: strip(ram, eb, 0x4000, 0xB621) };
  const data = { ram: b64(ram.subarray(0x4000)), from: 0x4000, blank: runsOf(eb, 0x4000, 0xB621), scenarios: {} };
  lib.PARTS.forEach((p, k) => {
    const file = path.join(GAME, 'parts', p, 'listing.json');
    const mem = lib.listingBytes(file), sb = codeIn(file, new Uint8Array(0x10000));
    kept[p] = strip(mem, sb, 0xB621, 0x10000);
    const id = mem[0xB622] | mem[0xB623] << 8;
    data.scenarios[id] = { flag: lib.FLAGS[k], name: p, bytes: b64(mem.subarray(0xB621)), blank: runsOf(sb, 0xB621, 0x10000) };
  });
  return { state: data, kept };
}

if (require.main === module) {
  const p = pack();
  for (const [k, n] of Object.entries(p.kept)) console.log(k + ': ' + n + ' bytes of code left out');
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(p.state));
}
module.exports = { pack };

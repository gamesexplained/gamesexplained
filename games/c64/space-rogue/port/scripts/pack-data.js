'use strict';
// The disk as the Play page carries it: the game's data, and none of its program. Every file the
// port loads is there, at its own length with its two-byte address first, but in each file of
// code (TITLE, INTRO, SR, INIT/END, MAIN, SEG0, SEG1, SEG1A, HCODE, WON) every byte of an
// instruction, as its part's listing marks them, is a zero. What is left of those files is their
// tables, texts and variables, which the port reads where the game keeps them; the pictures, tile
// sets, maps, models, the font, TALK's scripts and the text sectors are data whole. BOOT, which the port never
// loads, is left out. The page reads this through P.io.load and P.io.block.
// Some instructions are the game's state too, and the port keeps that state where the game does:
// operands the code rewrites, the patches it makes to itself, the empty hooks it checks. Those
// bytes stay, wherever port/src names their address (test/t-page.js runs the page's machine on
// this disk beside the whole one, and finds any it reads that this misses).
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
// The result is { files: { NAME: base64 }, sectors: { 't,s': base64 }, kept: { NAME: [code, data] } }.
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

// Each file of code: where the game loads it and the part whose listing holds its instructions
const CODE = {
  TITLE: [0x2000, 'title'], INTRO: [0x6800, 'intro'], WON: [0x6800, 'ending'],
  SR: [0x0400, 'engine'], INIT: [0xE900, 'flight'], END: [0xE900, 'flight'], MAIN: [0x6400, 'engine'],
  SEG0: [0xA500, 'flight'], SEG1: [0xA500, 'station'], SEG1A: [0xE400, 'station'], HCODE: [0x5700, 'hive'],
};
const LEAVE = new Set(['BOOT']);

// The addresses the port reads or writes in the game's code, as port/src names them: M[$xxxx] and
// any helper given an address first, each with the two bytes after it (an instruction's operand,
// where the helper takes the instruction's address). The
// screens library names the title's addresses, which the intro and the ending move by their
// offsets (src/g-screens.js, OFF), so each of those is kept at every offset.
const SRC = path.join(__dirname, '../src');
const OFFSETS = [0, 0x47F6, 0x4E10, 0x47B4, 0x4801, 0x4E1B, 0x47BF, 0x0B];
function named() {
  const keep = new Set();
  for (const f of fs.readdirSync(SRC)) {
    const text = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const m of text.matchAll(/(?:\bM\[\(?\s*|\b[A-Za-z_][\w.]*\((?:M,\s*)?)0x([0-9A-Fa-f]{4})\b/g)) {
      const a = parseInt(m[1], 16);
      for (const o of f === 'g-screens.js' ? OFFSETS : [0]) for (let k = 0; k < 3; k++) keep.add((a + o + k) & 0xFFFF);
    }
  }
  return keep;
}

// The addresses of the instructions in a part's listing
const instructions = {};
function code(part) {
  if (!instructions[part]) {
    const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'parts', part, 'listing.json'), 'utf8'));
    const at = new Map();
    for (const r of L.records) if (r.t === 'code') for (let i = 0; i < r.b.length; i++) at.set(r.a + i, r.b[i]);
    instructions[part] = at;
  }
  return instructions[part];
}

function pack() {
  const d = lib.readDisk(), files = {}, kept = {}, keep = named();
  for (const [name, bytes] of Object.entries(d.files)) {
    if (LEAVE.has(name)) continue;
    const out = bytes.slice();
    if (CODE[name]) {
      const [to, part] = CODE[name], at = code(part);
      let n = 0, differ = 0, state = 0;
      for (let i = 2; i < out.length; i++) {
        const a = to + i - 2;
        if (!at.has(a)) continue;
        if (keep.has(a)) { state++; continue; }
        // a byte the listing's snapshot holds otherwise is a self-modified operand: blanked too
        if (at.get(a) !== out[i]) differ++;
        out[i] = 0; n++;
      }
      // a file whose bytes are not the listing's at its address is in the wrong place
      if (differ > n / 20) throw new Error(name + ': ' + differ + ' of ' + n + ' instruction bytes differ from ' + part + "'s listing");
      kept[name] = [n, out.length - 2 - n, state];
    } else kept[name] = [0, out.length - 2];
    files[name] = out;
  }
  return { files, sectors: d.sectors, kept };
}

if (require.main === module) {
  const p = pack(), b64 = u => Buffer.from(u).toString('base64');
  for (const [k, [c, n, st]] of Object.entries(p.kept)) if (c) console.log(k.padEnd(6) + ' ' + String(c).padStart(5) + ' bytes of code blanked, ' + n + ' kept, ' + st + ' of them code the port keeps state in');
  const total = Object.values(p.files).reduce((s, f) => s + f.length, 0) + Object.keys(p.sectors).length * 256;
  console.log(Object.keys(p.files).length + ' files and ' + Object.keys(p.sectors).length + ' sectors, ' + total + ' bytes');
  if (process.argv[2]) {
    const o = { files: {}, sectors: {}, kept: p.kept };
    for (const [k, v] of Object.entries(p.files)) o.files[k] = b64(v);
    for (const [k, v] of Object.entries(p.sectors)) o.sectors[k] = b64(v);
    fs.writeFileSync(process.argv[2], JSON.stringify(o));
  }
}
module.exports = { pack, CODE };

'use strict';
// The machine as the Play page carries it: the game's data, and none of its program. The page
// starts where the loader hands over to the game ($E1ED), with the 48 KB from $4000 as the
// listings hold it (test/lib.js's memory(): the engine, and the wizard designer above it), and the
// cassette as side one holds it after the program (lib.js's gameTape(): DESIGNER., 1.GAM, 2.GAM
// and 3.GAM, each a header and a block). In both, every byte of an instruction, as each part's
// listing marks it, is a zero. What is left is the game's tables, texts, fonts, maps, creatures
// and objects, which the port reads where the game keeps them.
// Some instructions are the game's state too, and the port keeps that state where the game does:
// operands the code rewrites, and each scenario's hooks ($D01B-$D02F), a JP to the scenario's own
// routine or a RET, which the port reads to know which. Those bytes stay, wherever port/src names
// their address. test/t-page.js runs the page's machine on this beside the whole memory, and finds
// any byte it reads that this misses.
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
//   node pack-data.js --rom         (write ../../rom-excerpt.json from the ROM, test/lib.js's rom())
// The result is the 48 KB at the hand-over (ram, from $4000), its border, the cassette's blocks
// (tape), and the ROM's bytes the game reads (rom-excerpt.json, which names the ROM; never the
// whole ROM): its font, which the game prints most of its text in.
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

const GAME = path.join(__dirname, '..', '..');
const EXCERPT = path.join(GAME, 'rom-excerpt.json');
// the ROM's font: characters $20 to $7F, eight bytes each, from $3D00 ($3C00 + 8 x $20)
const FONT = [0x3D00, 0x4000];
// the key table the hand-over holds at $CDD9: the ROM's at $0205, SYMBOL SHIFT and ENTER made 0
const KEYS = [0x0205, 0x022C];

// The addresses the port reads or writes in the game's code, as port/src names them: M[$xxxx] and
// any helper given an address first, each with the two bytes after it (an instruction's operand,
// where the helper takes the instruction's address), but for the helpers whose address is where a
// routine starts or a jump goes (def, P.jumpGen and the like), never a byte read; and the hooks,
// which g-scenario.js reads by a table of their addresses.
const SRC = path.join(__dirname, '../src');
const NOT_READ = new Set(['def', 'P.restart', 'P.jumpGen', 'P.jump', 'P.run', 'turnLoop', 'steps', 'throwAt', 'fire', 'cast',
  'select', 'P.io.out', 'P.io.in', 'inp', 'H.delayT', 'djnzT', 'Math.min', 'opt', 'per', 'spell']);
function named() {
  const keep = new Set();
  for (const f of fs.readdirSync(SRC)) {
    const text = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const m of text.matchAll(/(?:\bM\[\(?\s*|\b([A-Za-z_][\w.]*)\((?:M,\s*)?)0x([0-9A-Fa-f]{4})\b/g)) {
      if (m[1] && NOT_READ.has(m[1])) continue;
      const a = parseInt(m[2], 16);
      for (let k = 0; k < 3; k++) keep.add((a + k) & 0xFFFF);
    }
  }
  for (let a = 0xD01B; a < 0xD030; a++) keep.add(a);
  return keep;
}

// the code of a part, as its listing marks it: a Uint8Array(0x10000) with 1 at each byte of an
// instruction
function codeOf(part) {
  const code = new Uint8Array(0x10000);
  for (const r of JSON.parse(fs.readFileSync(path.join(GAME, 'parts', part, 'listing.json'), 'utf8')).records) {
    if (r.t === 'code' && r.b) code.fill(1, r.a, r.a + r.b.length);
  }
  return code;
}

function excerpt() {
  const e = JSON.parse(fs.readFileSync(EXCERPT, 'utf8'));
  return e.parts.map(p => ({ from: p.from, bytes: Uint8Array.from(Buffer.from(p.hex, 'hex')) }));
}

// o.whole: the same machine with nothing blanked (test/t-page.js runs the page on both); the
// blanked addresses of the hand-over's memory are in .blank, a Uint8Array(0x10000), each block's in
// .tapeBlank, by its place on the tape (null for a header), and every address that is code the page
// leaves out in any part (the engine, the designer or a scenario) in .code
function pack(o = {}) {
  const keep = named();
  const M = lib.memory();
  const [font, keys] = excerpt();
  M.set(keys.bytes, 0xCDD9);                      // the ROM's key table as the excerpt holds it
  M[0xCDD9 + 24] = 0; M[0xCDD9 + 33] = 0;
  const blank = new Uint8Array(0x10000);
  let n = 0, state = 0;
  const blanker = (into, code, from, to, mark) => {
    for (let a = from; a < to; a++) {
      if (!code[a]) continue;
      if (keep.has(a)) { state++; continue; }
      if (!o.whole) into[a] = 0;
      mark[a] = 1; n++;
    }
  };
  blanker(M, codeOf('engine'), 0x4000, 0xD003, blank);
  blanker(M, codeOf('designer'), 0xD003, 0xE221, blank);
  // the cassette: each part's block blanked by its own listing, at the address it loads to
  const tape = [], tapeBlank = [];
  const T = lib.gameTape();
  const parts = { 'DESIGNER.': ['designer', 0xD3DC], '1': ['scenario-1', 0xD003], '2': ['scenario-2', 0xD003], '3': ['scenario-3', 0xD003] };
  let last = null;
  for (const b of T.blocks) {
    const bytes = Uint8Array.from(b.bytes);
    if (b.flag === 0x64) {
      const name = Buffer.from(bytes).toString('latin1').trim();
      last = parts[name] || parts[name[0]];
      tapeBlank.push(null);
    } else {
      const [part, at] = last;
      const mem = new Uint8Array(0x10000), mark = new Uint8Array(0x10000);
      mem.set(bytes, at);
      blanker(mem, codeOf(part), at, at + bytes.length, mark);
      bytes.set(mem.subarray(at, at + bytes.length));
      tapeBlank.push(mark.slice(at, at + bytes.length));
    }
    tape.push({ flag: b.flag, bytes: Buffer.from(bytes).toString('base64') });
  }
  const data = { ram: Buffer.from(M.subarray(0x4000)).toString('base64'), from: 0x4000, border: 7, tstates: 0,
    rom: { from: font.from, bytes: Buffer.from(font.bytes).toString('base64') }, tape };
  // every byte that is code the page leaves out, in any part: the engine's and each upper part's
  const code = Uint8Array.from(blank);
  for (const part of ['designer', 'scenario-1', 'scenario-2', 'scenario-3']) {
    const c = codeOf(part);
    for (let a = 0xD003; a < 0x10000; a++) if (c[a] && !keep.has(a)) code[a] = 1;
  }
  return { state: data, blank, tapeBlank, code, kept: [n, state] };
}

if (require.main === module) {
  if (process.argv[2] === '--rom') {
    const R = lib.rom();
    const hex = ([a, b]) => Buffer.from(R.subarray(a, b)).toString('hex');
    const out = {
      rom: 'ZX Spectrum 48K ROM (© 1982 Sinclair Research Ltd)',
      source: '48.rom as SkoolKit ships it, sha1 ' + require('crypto').createHash('sha1').update(R).digest('hex'),
      parts: [
        { addresses: '$3D00-$3FFF', from: FONT[0], why: 'The font: the game prints its messages, the menus\' and panels\' headings and the names typed in the ROM\'s own characters ($5B0E set to $3C00, print_char_small $AF91 and print_char_big $AFE2 reading eight bytes from there for each character $20 to $7F).', hex: hex(FONT) },
        { addresses: '$0205-$022B', from: KEYS[0], why: 'The key table: the game keeps a copy at $CDD9, made from this one with SYMBOL SHIFT and ENTER as 0, and looks up the key KEY-SCAN gives in it for the number of players, the file name and a wizard\'s name.', hex: hex(KEYS) },
      ],
    };
    fs.writeFileSync(EXCERPT, JSON.stringify(out, null, 1) + '\n');
    console.log('wrote rom-excerpt.json: ' + out.parts.map(p => p.addresses).join(', '));
  } else {
    const p = pack();
    const [n, st] = p.kept;
    console.log(n + ' bytes of code blanked; ' + st + ' kept, code the port keeps state in');
    if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(p.state));
  }
}
module.exports = { pack, named, codeOf };

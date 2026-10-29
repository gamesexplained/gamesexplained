#!/usr/bin/env node
// Hold the pages' reading of the story against the interpreter. zork.js, the block every page of
// this game carries, ports five routines of the interpreter; each is run here on the committed
// listings' bytes (the interpreter's, with the story's resident pages laid over it as zork.js's
// machine() lays them) in the kit's 6502 simulator beside the port, and the two must agree:
//   text     $18D2, the string decoder: every object's short name through $0DDD, every
//            abbreviation and every dictionary word, as the output line at $0200 holds them
//   encode   $1A25 and $1B3C, the word encoder: the four bytes at $DA-$DD, for every dictionary
//            word and 2,000 typed words, punctuation and capitals among them
//   lookup   $1432, the dictionary search: the address it leaves in $E4-$E5
//   type     $1D69-$1D8F, the line reader's copy into the text buffer: the count and the buffer
//   split    $130B-$13CA, sread after its line is read: the parse buffer and the text buffer, byte
//            for byte, for lines of 0 to 110 commas and 400 random lines, capitals and all
// and the exits' names, which are the dictionary's direction words.
// and the division Discoveries runs is the interpreter's own div and mod, on the listing's bytes.
//   node games/apple2/zork-i/test_zork.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');                                    // C64Cpu, the 6502 the pages run (site/lib/cpu6502.js)
const { CPU } = C64Cpu;
const { Zork } = g.run('index.html', 'zork.js', 'Zork');
const L = Zork.machine(g.listing('parts/interpreter/listing.json'), g.listing('parts/story/listing.json'));

let bad = 0, cases = 0;
const fail = (...what) => { if (bad++ < 25) console.log('ZORK', ...what); };
const fresh = () => { const m = new Uint8Array(L.ram); m[0xD9] = 0xFF; return m; };
const run = (m, entry, regs = {}, stop) => {          // the routine on m, until it returns or reaches stop
  const cpu = new CPU(m);
  cpu.call(entry, regs, stop ? { hooks: { [stop]: () => true } } : {});
  return cpu;
};
// the output line as print_char ($1B90) leaves it: capitals, bit 7 set, control characters dropped
const shown = s => [...s].map(c => c.charCodeAt(0)).filter(c => c >= 0x20).map(c => (c >= 0x60 && c < 0x80 ? c - 0x20 : c) | 0x80);
const line = m => Array.from(m.subarray(0x200, 0x200 + m[0xEB]));
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// text: object names, through print_object_name $0DDD
const h = Zork.header(L.ram);
for (let n = 1; n <= 255; n++) {
  const o = Zork.object(L.ram, n);
  if (!o.name) continue;
  const m = fresh(); m[0xEB] = 0;
  run(m, 0x0DDD, { a: n }); cases++;
  if (!same(line(m), shown(o.name))) fail(`object ${n}: port ${JSON.stringify(o.name)}, interpreter ${JSON.stringify(String.fromCharCode(...line(m).map(c => c & 0x7F)))}`);
}
// text: the abbreviations through $17E2 (a word address) and the dictionary's words through $17D1
const strings = [];
for (let n = 0; n < 32; n++) strings.push([0x17E2, L.ram[0x2C00 + h.abbrevs + 2 * n] << 8 | L.ram[0x2C00 + h.abbrevs + 2 * n + 1], 2]);
const D = Zork.dictionary(L.ram);
for (const e of D.entries) strings.push([0x17D1, e.a, 1]);
for (const [entry, v, k] of strings) {
  const m = fresh(); m[0xEB] = 0; m[0xE6] = v & 0xFF; m[0xE7] = v >> 8;
  const cpu = new CPU(m); cpu.call(entry, {}); cpu.call(0x18D2, {}); cases++;
  const port = Zork.text(L.ram, v * k);
  if (!same(line(m), shown(port))) fail(`string at story $${(v * k).toString(16)}: port ${JSON.stringify(port)}`);
}

// encode and lookup
let seed = 0x5A17;
const rand = n => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % n); };
const ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?_#\'"/\\-:()`@[]^{}|~;<>=+*&%$';
const words = D.entries.map(e => e.word).concat(['lantern', 'lanter', 'xyzzy', 'frobozz', '`', '3', 'Zork', 'ZORK', 'a-b', 'x@y', 'egg'.repeat(3)]);
for (let k = 0; k < 2000; k++) { let s = ''; const n = 1 + rand(8); for (let j = 0; j < n; j++) s += ALPHA[rand(ALPHA.length)]; words.push(s); }
for (const word of words) {
  const w6 = word.slice(0, 6), m = fresh();
  for (let k = 0; k < 6; k++) m[0xD3 + k] = k < w6.length ? w6.charCodeAt(k) : 0;
  const cpu = new CPU(m); cpu.call(0x1A25, {}); cases++;
  const want = [m[0xDB], m[0xDA], m[0xDD], m[0xDC]], port = Zork.encode(L.ram, w6);
  if (!same(port.bytes, want)) { fail(`encode ${JSON.stringify(w6)}: port ${port.bytes}, interpreter ${want}`); continue; }
  cpu.call(0x1432, {});
  const at = m[0xE5] << 8 | m[0xE4];
  if (Zork.lookup(L.ram, port.bytes) !== at) fail(`lookup ${JSON.stringify(w6)}: port $${Zork.lookup(L.ram, port.bytes).toString(16)}, interpreter $${at.toString(16)}`);
}

// split: sread from $130B, the line already in the text buffer, A its count with the RETURN
const PARSE = 0x2C00 + 0x2396, TEXT = 0x2C00 + 0x2486;
const lines = [];
for (let n = 0; n <= 110; n++) lines.push(','.repeat(n));
const VOCAB = D.entries.map(e => e.word).filter(x => /^[a-z]+$/.test(x)).concat(['lantern', 'frobozz', 'xyzzy', 'the', 'and', 'then']);
const capital = w => [...w].map(c => (rand(5) ? c : c.toUpperCase())).join('');
for (let k = 0; k < 400; k++) {
  let s = ''; const n = 1 + rand(40);
  for (let j = 0; j < n; j++) s += capital(VOCAB[rand(VOCAB.length)]) + [' ', ' ', ' ', ',', '.', ', ', '"', '  ', '?'][rand(9)];
  lines.push(s);
}
for (const s of lines) {
  const a = fresh(), b = fresh();
  [...s + '\r'].forEach((c, k) => { a[0x200 + k] = c.charCodeAt(0) | 0x80; });
  a[0x82] = TEXT & 0xFF; a[0x83] = TEXT >> 8; a[0x84] = PARSE & 0xFF; a[0x85] = PARSE >> 8;
  const count = run(a, 0x1D69, { a: s.length + 1 }).a, port = Zork.type(b, TEXT, s); cases++;
  if (count !== port || differ(a, b, [[TEXT, TEXT + 0xC7]]) >= 0) { fail(`type ${JSON.stringify(s.slice(0, 40))}: count ${port}, interpreter ${count}`); continue; }
  run(a, 0x130B, { a: count }, 0x099F); cases++;
  Zork.split(b, TEXT, PARSE, count);
  for (let k = 0; k < 0xF0 + 200; k++)
    if (a[PARSE + k] !== b[PARSE + k]) { fail(`split ${JSON.stringify(s.slice(0, 40))}${s.length > 40 ? '...' : ''} (${count}): $${(PARSE + k).toString(16)} port ${b[PARSE + k]}, interpreter ${a[PARSE + k]}`); break; }
}

// the exits' names: each is the direction word whose dictionary entry gives that property number
for (const [num, name] of Object.entries(Zork.EXITS)) {
  const e = D.entries.find(x => x.word === name.replace('-', '').slice(0, 6)); cases++;
  const kinds = e ? e.data[0] : 0, n = !e ? -1 : (kinds & 0xF0) === 0x10 || (kinds & 3) === 3 ? e.data[1] : e.data[2];
  if (!e || !(kinds & 0x10) || n !== +num) fail(`exit ${num}: the dictionary's ${name} is ${e ? 'direction ' + n : 'missing'}`);
}

// the calculator on Discoveries: the interpreter's own handlers, as the page runs them
const LIVE = [['div', 7, 2, 3], ['div', 7, 3, 2], ['div', 7, -2, 0], ['div', -7, 2, -3], ['div', -7, -2, 0], ['div', -7, 3, -2],
              ['div', 100, -7, 0], ['div', 7, 0, -1], ['mod', 7, 3, 1], ['mod', -7, 3, 1], ['mod', 7, -3, 32761],
              ['mod', -7, -3, 32761], ['mul', 7, -3, -21], ['mul', -7, 3, -21], ['mul', -7, -3, 21], ['mul', 7, -2, -14],
              ['mul', 300, 300, 24464]];
const { calculate } = g.run('discoveries.html', 'calculate', 'calculate');
for (const [op, x, y, want] of LIVE) {
  const got = calculate(L.ram, CPU, op, x, y); cases++;
  if (got !== want) fail(`${x} ${op} ${y}: the page gives ${got}, the machine gave ${want} (live, 19 October 2026)`);
}
console.log(`zork: ${cases} cases; the block is the same on ${g.sameBlock('zork.js').pages.length} pages`);
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log('all passed');

'use strict';
// Holds the picture unpacker the How it works and Discoveries pages share (sr-unpack) against the
// intro's unpack_picture (12D) and the engine's (C1D), run in the kit's 6502 simulator on the
// committed listings: every picture the game packs (the title's, the intro's, the ending's and the
// four the engine loads, which How it works carries) and streams made up to reach every count.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/c64/cpu6502.js'));
const g = game(__dirname);
const { unpackPicture } = g.run('index.html', 'sr-unpack', 'unpackPicture');
g.sameBlock('sr-unpack');   // every page's copy is the one tested
const pics = JSON.parse(g.read('index.html').match(/<script type="application\/json" id="sr-pacs">([^<]*)<\/script>/)[1]);
const I = g.listing('parts/intro/listing.json'), E = g.listing('parts/engine/listing.json');
const T = g.listing('parts/title/listing.json'), N = g.listing('parts/ending/listing.json');
const CASES = [
  ['CREDITS', T.ram.slice(0x3000, 0x4000)], ['ROGUE', T.ram.slice(0xAC00, 0xB700)], ['SPACE', T.ram.slice(0xB700, 0xC000)],
  ['I1', I.ram.slice(0x8400, 0x9200)], ['I2', I.ram.slice(0x9200, 0xA100)], ['I3', I.ram.slice(0xA100, 0xB000)],
  ['F1', N.ram.slice(0x8400, 0x9200)], ['F2', N.ram.slice(0x9200, 0xA100)], ['F3', N.ram.slice(0xA100, 0xAD00)],
  ...Object.entries(pics).map(([k, v]) => [k, Buffer.from(v, 'base64')]),
];
// streams made up to reach every count: runs of every length, copies of every length, $80 alone
let seed = 7;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
// streams made up to reach every count, 10 KB or less of output as the game's are: runs of every
// length, copies of every length, and $80 alone
for (let n = 0; n < 4; n++) {
  const s = []; let out = 0;
  // $80 copies 256 bytes, then reads the first of them as the next control: 128 runs of one byte
  if (n === 0) { s.push(0x80); for (let i = 0; i < 256; i++) s.push(1); out = 128; }
  for (;;) {
    const c = 1 + rnd() % 255, w = c < 0x80 ? c : c & 0x7F;
    if (c === 0x80) continue;
    if (out + w > 0x27F0) break;
    s.push(c);
    if (c < 0x80) s.push(rnd() & 255); else for (let i = 0; i < w; i++) s.push(rnd() & 255);
    out += w;
  }
  s.push(0, 5);
  CASES.push(['made up ' + n, Uint8Array.from(s)]);
}
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { if (a !== 0xD020) throw new Error('write $' + a.toString(16)); } };
for (const [name, bytes] of CASES) {
  const p = unpackPicture(bytes, 0);
  // the intro's routine, from $8400 into the $4000 buffer
  const m = new Uint8Array(I.ram); m.fill(0, 0x4000, 0x6800); m.set(bytes.subarray(0, 0x3C00), 0x8400); m[0x1E] = 0x40;
  new CPU(m, { port: { dir: 0x2F, data: 0x34 }, io, strict: true }).call(0x712D, { a: 0x84 });
  let at = -1;
  for (let i = 0; i < 0x2800; i++) if (m[0x4000 + i] !== p.out[i]) { at = i; break; }
  if (at >= 0) fail(name, 'intro unpack_picture differs at +$' + at.toString(16), m[0x4000 + at], p.out[at]);
  if (p.size > 0x2800) fail(name, 'writes past the 10 KB', p.size);
  // the engine's, for the four pictures it loads, from $4000 into $C000
  if (pics[name]) {
    const e = new Uint8Array(E.ram); e.set(bytes, 0x4000); e.fill(0xAA, 0xC000, 0xE400);
    e[0x74] = 0; e[0x75] = 0x40; e[0x78] = 0; e[0x79] = 0xC0;
    new CPU(e, { port: { dir: 0x2F, data: 0x34 }, io, strict: true }).call(0x1C1D, {});
    for (let i = 0; i < 0x2400; i++) if (e[0xC000 + i] !== (i < p.size ? p.out[i] : (i >= 0x2000 ? 0 : 0xAA))) { fail(name, 'engine unpack_picture differs at +$' + i.toString(16)); break; }
  }
  }
if (bad) { console.log(bad + ' differ'); process.exit(1); }
console.log('test_unpack: ' + CASES.length + ' pictures unpack as the intro\'s and the engine\'s unpack_picture do');

#!/usr/bin/env node
// Holds the Music tab's player to the game's own code. The page's createDriver runs R-Type's music
// driver on the kit's 6502 simulator over bytes embedded in the page; this test checks that those
// bytes are the listing's (each stage part's $6370-$7ABF, the ending's $6800-$7FFF), then runs the
// driver straight from each part's listing on kit/cpu/cpu6502.js, started as the game starts it
// ($637C with the data's address, $6379 with the tune; the ending at $8016-$802A, which also sets
// the volume byte to 15), and compares every write to the sound chip, frame by frame, for all 35
// tunes. It also holds the lengths the page's table gives to what the driver does.
//   node games/c64/r-type/test_music.js [music.html]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const page = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'music.html');
globalThis.atob = globalThis.atob || ((s) => Buffer.from(s, 'base64').toString('latin1'));
const { createDriver, RT_MUSIC, RT_TUNES } = g.run(page, 'rt-music', 'createDriver', 'RT_MUSIC', 'RT_TUNES');
const html = fs.readFileSync(page, 'utf8');
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };

const ranges = { ending: [0x6800, 0x7FFF] };
for (let s = 1; s <= 8; s++) ranges['level-' + s] = [0x6370, 0x7ABF];
const rams = {};
for (const [part, [a, b]] of Object.entries(ranges)) {
  const L = g.listing(`parts/${part}/listing.json`);
  rams[part] = L.ram;
  for (let x = a; x <= b; x++) if (!L.has[x]) { fail(part, 'listing has no byte at', x.toString(16)); break; }
  const want = Buffer.from(L.ram.slice(a, b + 1)).toString('base64');
  if (!RT_MUSIC[part] || RT_MUSIC[part].base !== a || RT_MUSIC[part].b64 !== want) fail(part, 'page bytes are not the listing\'s', a.toString(16), b.toString(16));
}
if (RT_TUNES.length !== 35) fail('the page lists', RT_TUNES.length, 'tunes, not 35');

const FRAMES = 14000;
const M = { parts: RT_MUSIC, tunes: RT_TUNES };
let compared = 0;
RT_TUNES.forEach(([part, tune], n) => {
  const [a, b] = ranges[part], end = part === 'ending', D = end ? 0x490 : 0;
  const mem = new Uint8Array(0x10000);
  for (let x = a; x <= b; x++) mem[x] = rams[part][x];
  let w = [];
  const cpu = new CPU(mem, { port: 0x35, io: {
    read(addr) { throw new Error('read $' + addr.toString(16)); },
    write(addr, v) { if (addr < 0xD400 || addr > 0xD418) throw new Error('write $' + addr.toString(16)); w.push(addr - 0xD400, v); },
  } });
  const data = end ? 0x71D0 : 0x6D40;
  cpu.call(0x637C + D, { x: data & 255, y: data >> 8 });
  cpu.call(0x6379 + D, { a: tune, x: 0 });
  if (end) mem[0x680F] = 15;
  const d = createDriver(M, kit);
  d.init(n);
  let pending = w.slice(); w = [];
  let prev = mem[0x6380 + D], wraps = [], ps = '', last = 0;
  const sid = new Uint8Array(25);
  for (let f = 0; f < FRAMES; f++) {
    d.play();
    cpu.call(0x6370 + D, {});
    const got = pending.concat(w); pending = []; w = [];
    compared += got.length / 2;
    if (got.join() !== d.writes.join()) { fail(part, 'tune', tune, 'frame', f); return; }
    for (let i = 0; i < got.length; i += 2) sid[got[i]] = got[i + 1];
    const q = mem[0x6380 + D];
    if (q < prev && f > 2) wraps.push(f + 1);
    prev = q;
    const s = sid.join(); if (s !== ps) last = f + 1; ps = s;
  }
  const row = new RegExp(`<tr data-n="${n}"([^>]*)>`).exec(html);
  if (!row) { fail('no row for tune', n); return; }
  const attr = (k) => { const m = new RegExp(`data-${k}="(\\d+)"`).exec(row[1]); return m ? +m[1] : null; };
  if (wraps.length > 1) {
    if (attr('open') !== wraps[0] || attr('loop') !== wraps[1] - wraps[0]) fail(part, 'tune', tune, 'repeats from', wraps[0], 'every', wraps[1] - wraps[0], 'but the page says', row[1]);
  } else if (attr('end') !== last) fail(part, 'tune', tune, 'ends after', last, 'but the page says', row[1]);
});
console.log(`35 tunes, ${FRAMES} frames each, ${compared} writes compared`);
if (bad) { console.log(bad, 'differences'); process.exit(1); }
console.log('the page plays every tune as the game does');

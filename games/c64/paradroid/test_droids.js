#!/usr/bin/env node
// The droid pictures and the enquiry text (pd-droids, index.html) against the game's own code on
// the listing's bytes in the kit's 6502, for each of the 24 types:
//   picture   droidPicture against droid_picture ($3629): each sprite's place, shape number and
//             bytes, colour, multicolour bit, and the shared colour at $D026
//   title     pdDescribe's title against unit_line ($3149)
//   fields    each field against field_value ($2F57), fields $0D to $16
//   notes     the notes against describe ($2D92), page after page; the game keeps the first word
//             small and starts each page with one, so the letters at the start of a sentence are
//             compared without their case
// The text is the characters print_char ($0C5F) is given.
//   node games/c64/paradroid/test_droids.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = C64Cpu;
const { PD } = g.run('index.html', 'pd-core', 'PD');
globalThis.PD = PD;
const { droidPicture, pdDescribe } = g.run('index.html', 'pd-droids', 'droidPicture', 'pdDescribe');
const L = g.listing();
const W = PD.words(L.ram);
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const quiet = { read() { return 0; }, write() {} };

for (let t = 0; t < 24; t++) {
  const m = L.ram.slice(), vic = new Uint8Array(64);
  const io = {
    read(a) { if (a >= 0xD000 && a < 0xD040) return vic[a - 0xD000]; throw new Error('droid_picture read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD000 && a < 0xD040) { vic[a - 0xD000] = v; return; } throw new Error('droid_picture wrote $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x25 }, io });
  m[0x58] = t;
  cpu.call(0x3629, {});
  const p = droidPicture(L.ram, t);
  p.sprites.forEach((s, n) => {
    cases++;
    const got = {
      x: vic[2 * n] | ((vic[0x10] >> n) & 1) << 8, y: vic[2 * n + 1], n: m[0x020D + n],
      mc: (vic[0x1C] >> n) & 1, colour: vic[0x27 + n] & 15, on: (vic[0x15] >> n) & 1,
    };
    const shape = Array.from(m.slice(0x4000 + 64 * got.n, 0x4000 + 64 * got.n + 63)).join();
    if (got.x !== s.x || got.y !== s.y || got.n !== s.n || got.mc !== (s.mc ? 1 : 0) || got.colour !== s.colour || got.on !== 1 || shape !== Array.from(s.shape).join())
      fail(`type ${t} sprite ${n}: the game ${JSON.stringify(got)}, the page ${JSON.stringify({ x: s.x, y: s.y, n: s.n, mc: s.mc, colour: s.colour })}`);
  });
  cases++;
  if ((vic[0x26] & 15) !== p.mc2) fail(`type ${t}: shared colour ${vic[0x26] & 15}, the page ${p.mc2}`);
}

function printed(t, entry, field) {
  const m = L.ram.slice();
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x25 }, io: quiet });
  let out = '';
  cpu.call(0x2BCA, {});
  m[0x58] = t; m[0x5D] = 0xEB + (t >> 2); m[0x5C] = (t & 3) * 64;
  m[0xB4] = 10; m[0xB5] = 0;
  if (field !== undefined) m[0x2DA1] = field;
  cpu.call(entry, {}, { hooks: { 0x0C5F: (c) => { out += PD.ch(c.m[0xB6] & 0x7F); } } });
  return norm(out);
}
for (let t = 0; t < 24; t++) {
  const d = pdDescribe(L.ram, t, W);
  cases++;
  const title = printed(t, 0x3149);
  if (title !== norm(d.title)) fail(`type ${t} title: the game "${title}", the page "${d.title}"`);
  d.fields.forEach(([k, v], i) => {
    cases++;
    const got = printed(t, 0x2F57, 0x0D + i);
    if (got !== norm(v)) fail(`type ${t} ${k}: the game "${got}", the page "${v}"`);
  });
}

const fold = (x) => x.replace(/(^|\. )(\w)/g, (a, b, c) => b + c.toLowerCase());
for (let t = 0; t < 24; t++) {
  const d = pdDescribe(L.ram, t, W);
  const m = L.ram.slice();
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x25 }, io: quiet });
  let out = '', pages = 0;
  cpu.call(0x2BCA, {});
  m[0x58] = t; m[0x5D] = 0xEB + (t >> 2); m[0x5C] = (t & 3) * 64;
  m[0x2DA1] = 0x0D; m[0x45] = 12; m[0x46] = 12; m[0x5B] = 2;
  while (m[0x5B] !== 4 && pages++ < 20) {
    m[0xB4] = m[0x46] = 12; m[0xB5] = 12;
    cpu.call(0x2D92, {}, { hooks: { 0x0C5F: (c) => { out += PD.ch(c.m[0xB6] & 0x7F); } }, maxSteps: 5e6 });
    if (m[0x5B] === 3) m[0x5B] = 2;
  }
  cases++;
  const got = norm(out.slice(out.toLowerCase().lastIndexOf('notes') + 5).replace(/^[ :]*/, '')).replace(/ \./g, '.');
  const want = norm(d.notes);
  if (m[0x5B] !== 4) fail(`type ${t}: the notes did not end in ${pages} pages`);
  else if (fold(got) !== fold(want) || got.charAt(0) !== want.charAt(0)) fail(`type ${t} notes:\n  the game "${got}"\n  the page "${want}"`);
}
if (bad) { console.log(`test_droids: ${bad} failed of ${cases}`); process.exit(1); }
console.log(`test_droids: ${cases} pictures' sprites, titles, fields and notes agree with the game`);

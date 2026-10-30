#!/usr/bin/env node
// The satellite widget's test of cover (amInCover, am-cover, index.html) against the game's own
// in_cover ($C0AC) on the listing's bytes in the kit's 6502, with $80/$81 pointing at a country's
// record and $82/$83 at a satellite's record, as cover_report and sdi_check set them:
// - for each of the 16 countries' boxes from the listing ($5DA4), every satellite x from 0 to 255
//   with its y on the box, and every y with its x on the box, at the reach the satellites' records
//   hold (5 and 5, $5D5C);
// - 20,000 random boxes, positions and reaches, the reach 0 to 15.
//   node games/c64/the-armageddon-man/test_cover.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { amInCover } = g.run('index.html', 'am-cover', 'amInCover');
const L = g.listing();
const m = L.ram.slice();
const cpu = new C64Cpu.CPU(m, { port: { dir: 0x2F, data: 0x04 } });
const C = 0x5DA4, S = 0x5D5C;                        // Canada's record, and the first satellite's
let bad = 0, cases = 0, covered = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
function check(c, s) {
  m.set(c, C); m.set(s, S);
  m[0x80] = C & 0xFF; m[0x81] = C >> 8; m[0x82] = S & 0xFF; m[0x83] = S >> 8;
  cpu.call(0xC0AC, { c: 0 });
  const want = cpu.c === 1, got = amInCover(c, s);
  cases++; if (want) covered++;
  if (want !== got) fail(`box ${c.join(',')}, satellite ${s.join(',')}: the game says ${want}, the page ${got}`);
}
const reach = [L.ram[S + 2], L.ram[S + 3]];
if (reach.join() !== '5,5') fail('the satellites\' reach is ' + reach.join());
for (let n = 0; n < 16; n++) {
  const c = Array.from(L.ram.slice(0x5DA4 + 12 * n, 0x5DA4 + 12 * n + 4));
  for (let v = 0; v < 256; v++) {
    check(c, [v, c[1], reach[0], reach[1]]);
    check(c, [c[0], v, reach[0], reach[1]]);
  }
}
let seed = 20261030;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
for (let t = 0; t < 20000; t++) {
  const c = [rnd() & 255, rnd() & 255, rnd() & 127, rnd() & 127];
  const near = rnd() & 1;
  const s = [near ? c[0] + (rnd() % 24) - 8 & 255 : rnd() & 255, near ? c[1] + (rnd() % 24) - 8 & 255 : rnd() & 255, rnd() & 15, rnd() & 15];
  check(c, s);
}
if (bad) { console.log(`test_cover: ${bad} failed`); process.exit(1); }
console.log(`test_cover: ${cases} cases, ${covered} of them covered, every one the game's answer`);

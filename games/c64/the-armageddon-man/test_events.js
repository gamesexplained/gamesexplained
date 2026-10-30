#!/usr/bin/env node
// The events widget (am-events, index.html) against the game's own country_events ($AE77) on the
// listing's bytes in the kit's 6502, with random ($7BAE) answered by the test and the run stopped
// where an event starts (run_event, $B161: X the event, $8A A, $8B B) or where none was found
// (relations_row_up, $7E23):
// - every hostility 0 to 255 of every country A to all the others, with no country destroyed:
//   amEvent and amCountryEvents must pick the event the game picks;
// - 3,000 random worlds: hostilities spread over the ladders and near them, about one country in
//   five destroyed, and random numbers that pick A and the first B;
// - the memo texts: each event's text expanded with A and B by amExpand and by the game's
//   expand_text ($AB7C) into its buffer at $AC25, for every event and 40 pairs of countries.
//   node games/c64/the-armageddon-man/test_events.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { amEvent, amCountryEvents, amExpand } = g.run('index.html', 'am-events', 'amEvent', 'amCountryEvents', 'amExpand');
const L = g.listing();
const LEVELS = L.ram.slice(0x958C, 0x958C + 512);
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
let seed = 20261030;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };

// The game's search on a world: rel (256 bytes), hits (byte 11 of each record), and the random
// numbers it is to be given, in order.
function gameSearch(rel, hits, numbers) {
  const m = L.ram.slice();
  m.set(rel, 0x5C5C);
  for (let n = 0; n < 16; n++) m[0x5DA4 + 12 * n + 11] = hits[n];
  m[0x5B45] = 0;                                     // no exchange going on
  const cpu = new C64Cpu.CPU(m, { port: { dir: 0x2F, data: 0x04 } });
  let k = 0, out = null;
  cpu.call(0xAE77, {}, { hooks: {
    0x7BAE: (c) => { c.a = numbers[k++]; c.rts(); },
    0xB161: (c) => { out = { a: c.m[0x8A], b: c.m[0x8B], e: c.x }; return true; },
    0x7E23: (c) => { out = { a: c.m[0x8A], b: -1, e: -1 }; return true; },
  } });
  return out;
}
function compare(rel, hits, numbers, what) {
  cases++;
  const want = gameSearch(rel, hits, numbers);
  let k = 0;
  const got = amCountryEvents(rel, LEVELS, hits, () => numbers[k++]);
  if (want.a !== got.a || want.b !== got.b || want.e !== got.e) { fail(`${what}: the game picks ${JSON.stringify(want)}, the page ${JSON.stringify(got)}`); return; }
  if (want.e >= 0 && amEvent(LEVELS, want.a, rel[16 * want.a + want.b]) !== want.e) fail(`${what}: amEvent differs`);
}

for (let a = 0; a < 16; a++) for (let h = 0; h < 256; h++) {
  const rel = new Uint8Array(256), hits = new Uint8Array(16);
  for (let i = 0; i < 256; i++) rel[i] = rnd() & 0xFF;
  rel.fill(h, 16 * a, 16 * a + 16);
  compare(rel, hits, [a, rnd() & 0xFF], `A ${a}, hostility ${h}`);
}
for (let t = 0; t < 3000; t++) {
  const rel = new Uint8Array(256), hits = new Uint8Array(16);
  for (let i = 0; i < 256; i++) {
    const r = rnd();
    rel[i] = r & 1 ? LEVELS[(r >>> 1) & 511] + ((r >>> 10) % 5) - 2 & 0xFF : (r >>> 1) & 0xFF;
  }
  for (let n = 0; n < 16; n++) hits[n] = rnd() % 5 === 0 ? 0xFF : rnd() & 0x7F;
  hits[rnd() & 15] = 0;                              // at least one country standing
  const numbers = Array.from({ length: 64 }, () => rnd() & 0xFF);
  compare(rel, hits, numbers, `world ${t}`);
}
const top = gameSearch(new Uint8Array(256), new Uint8Array(16), [13, 8]);
if (top.e !== 0) fail(`hostility 0: the game picks ${JSON.stringify(top)}, not event 0`);

let texts = 0;
for (let e = 0; e < 32; e++) for (let p = 0; p < 40; p++) {
  const a = rnd() & 15, b = rnd() & 15;
  const m = L.ram.slice();
  const name = (n) => m[0xC04C + 2 * n] | m[0xC04D + 2 * n] << 8;
  m[0x5B35] = name(a) & 0xFF; m[0x5B36] = name(a) >> 8; m[0x5B3D] = name(b) & 0xFF; m[0x5B3E] = name(b) >> 8;
  const at = m[0x55B8 + 2 * e] | m[0x55B9 + 2 * e] << 8;
  m[0x88] = at & 0xFF; m[0x89] = at >> 8;
  const cpu = new C64Cpu.CPU(m, { port: { dir: 0x2F, data: 0x04 } });
  cpu.call(0xAB7C, {});
  const end = m.indexOf(0x24, 0xAC25);
  const want = Array.from(m.slice(0xAC25, end)), got = amExpand(L.ram, at, a, b);
  texts++;
  if (want.join() !== got.join()) fail(`event ${e}, ${a} on ${b}: the game's text ${want.join()}, the page's ${got.join()}`);
}
if (bad) { console.log(`test_events: ${bad} failed`); process.exit(1); }
console.log(`test_events: ${cases} searches and ${texts} memo texts, every one the game's`);

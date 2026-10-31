#!/usr/bin/env node
// Hold the Discoveries page's hit test (discoveries.html, gs-hits) against the game. gsHit is the
// test hit_helicopter ($5AE5) makes before a shot does damage. Here the routine itself runs on
// the kit's 6502 over the flight's listing, for every attacker (zpa_5A and 7, the table at $5ADD),
// every value of zpa_4C from 0 to 3, every pass counter's low two bits (zpa_6A) and every random
// number the SID's third oscillator can give (its low four bits decide): the shot hit when the
// routine set a bit of the damage word (zpa_74-zpa_75). The port must agree in every case. It exits
// 1 on any difference.
//   node games/c64/gunship/test_hits.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'discoveries.html';
const { gsHit } = g.run(page, 'gs-hits', 'gsHit');
const L = g.listing('parts/flight/listing.json');
let bad = 0, cases = 0, hits = 0;
for (let att = 0; att < 8; att++) for (let style = 0; style < 4; style++) for (let pass = 0; pass < 4; pass++)
  for (let rnd = 0; rnd < 256; rnd++) {
    const m = L.ram.slice();
    let reads = 0;
    const io = { read: (a) => { if (a === 0xD41B) return reads++ ? 0x55 : rnd; return 0; }, write: () => {} };
    m[0x5A] = att; m[0x4C] = style; m[0x6A] = pass; m[0x74] = 0; m[0x75] = 0; m[0x4D] = 0; m[0x6E] = 7;
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
    cpu.call(0x5AE5, { a: 0, x: 0, y: 0 }, { maxSteps: 1000000 });
    const game = (m[0x74] | m[0x75]) !== 0, port = gsHit(L.ram[0x5ADD + att], rnd, pass, style);
    cases++; if (game) hits++;
    if (game !== port && bad++ < 10) console.log('DIFFERS: attacker', att, 'zpa_4C', style, 'pass', pass, 'random', rnd, 'game', game, 'page', port);
  }
if (!hits) { console.log('no case hit: the test is not reaching the damage'); bad++; }
console.log(`${cases} cases, ${hits} hits: ` + (bad ? bad + ' differences' : 'the page\'s test agrees with hit_helicopter in every case'));
process.exit(bad ? 1 : 0);

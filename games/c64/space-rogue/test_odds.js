'use strict';
// Holds two of How it works' ports against the engine, run in the kit's 6502 simulator on the
// committed listing: the encounter odds (sr-odds, shipOdds) against pick_ship (C8C), fed every
// roll random_upto can give, for every system's class weights and every rank; and the Huffman codes
// the page derives from the tree (sr-huff, huffmanCodes) against decode_char (CE0).
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/c64/cpu6502.js'));
const g = game(__dirname);
const { shipOdds } = g.run('ships.html', 'sr-odds', 'shipOdds');
const { huffmanCodes } = g.run('index.html', 'sr-huff', 'huffmanCodes');
const E = g.listing('parts/engine/listing.json');
const maps = JSON.parse(g.read('levels.html').match(/<script type="application\/json" id="sr-maps">([^<]*)<\/script>/)[1]);
const classTypes = Array.from(E.ram.subarray(0x2D24, 0x2D38));
let bad = 0, runs = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
// pick_ship on the engine's code, every roll of random_upto ($A298) fed in turn
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const weightSets = Object.keys(maps).filter(k => k[0] === 'Q').map(k => [k, Array.from(Buffer.from(maps[k], 'base64').subarray(0x513, 0x518))]);
weightSets.push(['short of 100', [10, 20, 30, 0, 5]], ['over 100', [90, 0, 60, 3, 1]]);
for (const [name, w] of weightSets)
  for (let rank = 0; rank <= 5; rank++) {
    const R = rank + 2, got = {};
    const m = new Uint8Array(E.ram); m.set(w, 0x077D); m[0x0C79] = R; m[0x96] = 100;
    let feed = [];
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x34 }, io, strict: true });
    const hooks = { 0xA298: c => { const lim = c.a, v = feed.shift(); if (v === undefined || v > lim) throw new Error('feed'); c.a = c.y = v; c.rts(); } };
    const one = rolls => { feed = rolls.slice(); cpu.call(0x2C8C, {}, { hooks }); runs++; return { t: cpu.a, left: feed.length }; };
    for (let r2 = 0; r2 < 100; r2++) {
      const first = one([0, r2, 0]);
      if (first.t === 0xFF && first.left !== 1) fail(name, 'no ship took', 3 - first.left, 'rolls');
      if (first.t === 0xFF) { got.none = (got.none || 0) + 16 * (R + 1); continue; }
      for (let r3 = 0; r3 < 16; r3++) {
        if (r3 < 4) { const o = one([0, r2, r3]); if (o.left) fail('rolls left'); const t = o.t; got[t] = (got[t] || 0) + (R + 1); continue; }
        for (let r4 = 0; r4 <= R; r4++) { const o = one([0, r2, r3, r4]); if (o.left) fail('rolls left'); const t = o.t; got[t] = (got[t] || 0) + 1; }
      }
    }
    const port = shipOdds(w, R, classTypes);
    const keys = new Set([...Object.keys(got), ...Object.keys(port.count)]);
    for (const k of keys) if ((got[k] || 0) !== (port.count[k] || 0)) fail(name, 'rank', rank, 'type', k, 'game', got[k], 'page', port.count[k]);
  }
// decode_char ($9CE0) on each code the page derives, the bits fed by a stand-in for read_bit ($9D1E)
const codes = huffmanCodes(E.ram.subarray(0x9D66, 0x9D66 + 136));
for (const { ch, bits } of codes) {
  const cases = ch === 0x1B ? [0x5A, 0x31, 0x7E, 0x01] : [null];
  for (const lit of cases) {
    const m = new Uint8Array(E.ram);
    let feed = bits.split('').map(Number);
    if (lit !== null) for (let i = 6; i >= 0; i--) feed.push((lit >> i) & 1);    // the highest bit first
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x34 }, io, strict: true });
    cpu.call(0x9CE0, {}, { hooks: { 0x9D1E: c => { const v = feed.shift(); if (v === undefined) throw new Error('bits'); c.y = v; c.rts(); } } });
    const want = lit === null ? ch : lit;
    if (cpu.a !== want && (cpu.a & 0x7F) !== want) fail('char', ch, bits, 'literal', lit, 'game gives', cpu.a);
    if (feed.length) fail('char', ch, 'bits left', feed.length);
  }
}
if (bad) { console.log(bad + ' differ'); process.exit(1); }
console.log('test_odds: pick_ship over ' + runs.toLocaleString('en') + ' runs and all ' + codes.length + ' Huffman codes agree');

'use strict';
// The healing counter in loads 4, 9, 19, 20 and 30 reads its price table by player number, not by
// the visit count it keeps, so the price never rises. Runs each load's payment path from the listing.
const assert = require('assert'), fs = require('fs'), path = require('path');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const records = p => JSON.parse(fs.readFileSync(path.join(__dirname, 'parts', p, 'listing.json'))).records;
const base = new Uint8Array(65536);
for (const p of ['resident', 'stage-01']) for (const r of records(p)) if (r.b) base.set(r.b, r.a);
const counters = { 4: [0xA58F, 0xA679], 9: [0xA0BB, 0xA1A5], 19: [0xA378, 0xA462], 20: [0x9E75, 0x9F5F], 30: [0xB07C, 0xB166] };
const number = b => (b >> 4) * 10 + (b & 15);
let cases = 0;
for (const [load, [pay, table]] of Object.entries(counters)) {
  const m0 = base.slice();
  for (const r of records(`stage-${String(load).padStart(2, '0')}`)) if (r.b) m0.set(r.b, r.a);
  assert.deepEqual([...m0.slice(table, table + 7)], [0x02, 0x04, 0x07, 0x10, 0x11, 0x12, 0x13], `load ${load} price table`);
  for (const player of [0, 1]) for (let visits = 0; visits < 7; visits++) {
    const m = m0.slice();
    m[0x4DBD] = player; m[0x528C + player] = visits; m[0x4DC7 + player] = 0x09; m[0x4DC9 + player] = 0x99;
    const rts = c => { c.rts(); };
    const hooks = { 0x3C2A: rts, 0x370B: rts, 0x4A90: rts, 0x6097: rts, 0x77E0: rts };
    hooks[pay + 0x30] = () => true;                       // stop at the message wait after the payment
    new CPU(m).call(pay, {}, { hooks, maxSteps: 2000 });
    const left = number(m[0x4DC7 + player]) * 100 + number(m[0x4DC9 + player]);
    assert.equal(999 - left, number(m0[table + player]) * 10, `load ${load}, player ${player + 1}, visit ${visits + 1}`);
    assert.equal(m[0x528C + player], visits + 1, 'the visit count goes up');
    cases++;
  }
}
console.log(`OK - ${cases} counter visits in five loads: the price stays at the player's entry`);

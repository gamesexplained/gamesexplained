'use strict';
// The Discoveries page: Broadway's clock switch and the museum's third status word.
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const g = game(__dirname);
const page = g.read('discoveries.html');
const graphics = g.read('graphics.html');
const block = (html, id) => JSON.parse(html.match(new RegExp(`<script id="${id}" type="application/json">([^<]+)</script>`))[1]);
const bytes = s => Array.from(Buffer.from(s, 'base64'));
const broadway = g.listing('parts/broadway/listing.json');

// The switch at $8016 loads as zero, and Broadway's code only reads it: before the clock ends
// the walk, before a fresh fireball takes a row of slime, and before a ghost at the statue does.
assert(broadway.has[0x8016]);
assert.equal(broadway.ram[0x8016], 0);
const records = require('./parts/broadway/listing.json');
const all = (records.records || records.lines || records);
const uses = (Array.isArray(all) ? all : Object.values(all)).filter(r => r && r.oa === 0x8016);
assert.deepStrictEqual(uses.map(r => [r.a, r.m.split(' ')[0]]), [[0x847B, 'lda'], [0x91AC, 'lda'], [0xAC4E, 'lda']]);
for (const at of [0x847B, 0x91AC, 0xAC4E]) assert.equal(broadway.ram[at + 3], 0xD0, `a branch follows the read at $${at.toString(16)}`);

// The page's clock model against the game's clock routine at $8423, with the switch off and on.
const {clockStep} = g.run('discoveries.html', 'clock-model', 'clockStep');
let calls = 0;
for (const on of [false, true]) {
  for (const start of [
    {count: 0, ones: 1, tens: 2, digits: [0x21, 0x20, 0x89, 0x21, 0x20]},   // 10:10
    {count: 0, ones: 6, tens: 6, digits: [0x21, 0x21, 0x89, 0x25, 0x25]},   // 11:55, as the page starts
  ]) {
    const ram = broadway.ram.slice();
    ram[0x8016] = on ? 1 : 0;
    ram[0x8024] = start.count; ram[0x8420] = start.ones; ram[0x8421] = start.tens;
    ram.set(start.digits, 0x47B2);
    const cpu = new CPU(ram, {port: 0x35});
    let state = {...start, on, over: false};
    for (let n = 0; n < 58 * 60 * 5; n++) {
      let over = false;
      cpu.call(0x8423, {}, {hooks: {0xCA30: () => { over = true; return true; }}});
      state = clockStep(state);
      calls++;
      assert.equal(state.over, over, `call ${n}: the walk ends`);
      assert.deepStrictEqual([state.count, state.ones, state.tens, ...state.digits],
        [ram[0x8024], ram[0x8420], ram[0x8421], ...ram.slice(0x47B2, 0x47B7)], `call ${n}, switch ${on ? 'on' : 'off'}`);
      if (over) break;
    }
    if (!on) assert(state.over, 'with the switch off the walk ends at twelve');
    else assert(state.digits[1] > 0x22, 'with the switch on the clock passes twelve');
  }
}
console.log(`OK - ${calls} calls of the page's clock match Broadway's clock routine, switch off and on`);

// The clock is drawn into the Broadway frame on Graphics, with the digit shapes from the listing.
const clock = block(page, 'clock-frame-data');
assert.deepStrictEqual(clock.frame, block(graphics, 'broadway-frame-data'));
for (const glyph of clock.glyphs) {
  const b = bytes(glyph.b);
  assert.deepStrictEqual(b, Array.from(broadway.ram.slice(glyph.a, glyph.a + b.length)), `glyphs at $${glyph.a.toString(16)}`);
}
console.log('OK - the clock panel draws from the Broadway frame and its digit shapes');

// The three status words, with DAZED from the museum listing.
const museum = g.listing('parts/museum/listing.json');
const words = block(page, 'status-words-data');
assert.deepStrictEqual(words, block(graphics, 'museum-status-data'));
assert.deepStrictEqual(words.dazed, [0x0DC0, 0x0E00].map(a => Array.from(museum.ram.slice(a, a + 63))));
console.log('OK - DAZED is the stored pair at $0DC0 and $0E00');

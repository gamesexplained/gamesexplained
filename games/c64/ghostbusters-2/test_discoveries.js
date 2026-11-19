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

// The partner check. The cracked load the listing holds keeps each of the original's eight checks
// whole after its first instruction, which the crack replaced with a JMP to the step; the original
// disk has LDA $804A (first Ghostbuster) or LDA $804B (second) there (facts.md, "The original disk").
// Each check is run from the instruction after that one, with A holding the walker's room, and the
// page's model must refuse exactly the steps the game's code refuses.
const {partnerBlocks, walkFrame, doorway} = g.run('discoveries.html', 'partner-model', 'partnerBlocks', 'walkFrame', 'doorway');
const CHECKS = [
  {at: 0xB7FB, step: 0xB833, who: 1, dir: 'up'}, {at: 0xB911, step: 0xB949, who: 1, dir: 'down'},
  {at: 0xBA0A, step: 0xBA42, who: 1, dir: 'left'}, {at: 0xBB5F, step: 0xBBA4, who: 1, dir: 'right'},
  {at: 0xBC92, step: 0xBCCA, who: 2, dir: 'up'}, {at: 0xBD79, step: 0xBDB1, who: 2, dir: 'down'},
  {at: 0xBE43, step: 0xBE7B, who: 2, dir: 'left'}, {at: 0xBF69, step: 0xBFA1, who: 2, dir: 'right'},
];
let checked = 0;
for (const c of CHECKS) {
  const hex = n => '$' + n.toString(16).toUpperCase();
  assert.deepStrictEqual(Array.from(museum.ram.slice(c.at, c.at + 3)), [0x4C, c.step & 0xFF, c.step >> 8], 'the crack jumps at ' + hex(c.at));
  assert.deepStrictEqual(Array.from(museum.ram.slice(c.at + 3, c.at + 6)), [0xCD, c.who === 1 ? 0x4B : 0x4A, 0x80], 'the room comparison after ' + hex(c.at));
  for (const w of [{x: 64, y: 116}, {x: 200, y: 90}, {x: 250, y: 150}, {x: 300, y: 60}]) {
    for (let dx = -24; dx <= 24; dx++) for (let dy = -10; dy <= 10; dy++) {
      const p = {x: w.x + dx, y: w.y + dy};
      const one = c.who === 1 ? w : p, two = c.who === 1 ? p : w;
      const ram = museum.ram.slice();
      ram[0x804A] = ram[0x804B] = 1;
      ram[0xFC05] = one.x & 0xFF; ram[0xFC0D] = one.x >> 8; ram[0xFC15] = one.y;
      ram[0xFC07] = two.x & 0xFF; ram[0xFC0F] = two.x >> 8; ram[0xFC17] = two.y;
      let stepped = false;
      const hooks = {};
      hooks[c.step] = () => { stepped = true; return true; };
      new CPU(ram, {port: 0x35}).call(c.at + 3, {a: 1}, {hooks});
      assert.equal(partnerBlocks(w, p, c.dir), !stepped,
        'Ghostbuster ' + c.who + ' ' + c.dir + ', partner at ' + dx + ',' + dy + ' from ' + w.x + ',' + w.y);
      checked++;
    }
  }
}
// The steps: one line per call up ($B83A) and down ($B950), two pixels per call left ($BA58) and
// right ($BBD5); the doorway ($BBB5) sets room 1 and X 64 and leaves the height alone.
assert.deepStrictEqual(Array.from(museum.ram.slice(0xB83A, 0xB840)), [0xCE, 0x15, 0xFC, 0xCE, 0x16, 0xFC]);
assert.deepStrictEqual(Array.from(museum.ram.slice(0xB950, 0xB956)), [0xEE, 0x15, 0xFC, 0xEE, 0x16, 0xFC]);
assert.deepStrictEqual(Array.from(museum.ram.slice(0xBA57, 0xBA5A)), [0x38, 0xE9, 0x02]);
assert.deepStrictEqual(Array.from(museum.ram.slice(0xBBD4, 0xBBD7)), [0x18, 0x69, 0x02]);
assert.deepStrictEqual(Array.from(museum.ram.slice(0xBBB5, 0xBBD1)),
  [0xA9, 0x01, 0x8D, 0x41, 0x80, 0x8D, 0x4A, 0x80, 0xA9, 0x40, 0x8D, 0x05, 0xFC, 0x8D, 0x06, 0xFC,
   0xA9, 0x00, 0x8D, 0x0D, 0xFC, 0x8D, 0x0E, 0xFC, 0x20, 0x96, 0x83, 0x60]);
assert.deepStrictEqual(doorway({x: 330, y: 116}), {x: 64, y: 116});
// Walked in on his partner's line, a Ghostbuster can go nowhere, and nor can his partner; two
// lines apart, one of them can back away; on the cracked copy both walk.
const trappedOne = doorway({x: 330, y: 116}), trappedTwo = {x: 64, y: 116};
for (const d of ['up', 'down', 'left', 'right']) {
  assert.equal(walkFrame(trappedOne, trappedTwo, d, true).moved, 0, 'trapped walker ' + d);
  assert.equal(walkFrame(trappedTwo, trappedOne, d, true).moved, 0, 'trapped partner ' + d);
  assert(walkFrame(trappedOne, trappedTwo, d, false).moved > 0, 'cracked ' + d);
}
assert(walkFrame({x: 64, y: 114}, trappedTwo, 'up', true).moved > 0, 'two lines apart, the upper one can step up');
console.log('OK - the page\'s partner check matches the museum\'s eight checks in ' + checked + ' cases, and the doorway traps the pair');

/* Semantic tests for every non-RTS room callback and both resident callers.
 * Usage: node .../validation/audit_room_rules.js [private-directory]
 * Prepared indices/states test the code, not routes that reach those states.
 */
'use strict';
const assert = require('assert');
const {create, roomBytes, equal} = require('./engine_harness');
const active = [2, 3, 4, 6, 7, 8, 17, 18, 19, 21, 23, 26, 27, 28, 29, 30, 31, 33, 38, 39];
equal(Array.from({length: 40}, (_, n) => n).filter(n => roomBytes(n)[0x76] !== 0x60), active, 'callback inventory');
let cases = 0, playerCalls = 0, thiefCalls = 0;
const callback = (s, x, c = 0) => { s.cpu.call(0xc376, {x, c, d: 0}, {maxSteps: 100000}); cases++; };
// Exercise actual patch -> spell-name -> callback paths, including every indexed
// saved treasure. Only the callback body is hooked here; it is tested below.
for (let n = 0; n < 40; n++) {
  const base = create(n, {simonStartup: false});
  for (const {slot, offset} of base.slots) {
    const glyph = base.m[0xc400 + offset];
    if (glyph < 28 || glyph > 31) continue;
    for (const thief of [false, true]) {
      const s = create(n, {simonStartup: false}), {cpu, m, io} = s;
      m[0xc031] = m[0xc032] = 0x12;
      let hits = 0;
      const hooks = {0xc376: c => {
        assert.equal(c.x, slot, 'caller index ' + n + ':' + slot);
        assert.equal(c.c, 0, 'callback carry ' + n + ':' + slot);
        hits++; c.rts();
      }};
      if (thief) {
        const x = 12 + 8 * (offset % 40), y = 30 + 8 * Math.floor(offset / 40);
        io[0] = x & 255; io[1] = y; io[16] = (io[16] & 254) | (x > 255 ? 1 : 0);
        m[0xc370] = 19;
        cpu.call(0x7f7a, {y: 0, d: 0}, {hooks, maxSteps: 300000}); thiefCalls++;
      } else {
        m[0xfb] = (0xc400 + offset) & 255; m[0xfc] = (0xc400 + offset) >> 8;
        cpu.call(0x7ace, {a: glyph, y: 0, d: 0}, {hooks, maxSteps: 300000}); playerCalls++;
      }
      assert.equal(hits, 1, 'callback must run once');
    }
  }
}
for (let slot = 0; slot < 16; slot++) {
  for (const n of [2, 3, 8, 17, 18, 19, 21, 23, 26, 27, 28, 29, 31, 38, 39]) {
    const s = create(n), {m, io} = s, before = Uint8Array.from(m);
    callback(s, slot);
    if (n === 2) for (const a of [0xc402, 0xc403, 0xc404, 0xc423, 0xc424, 0xc425]) assert.equal(m[a], 32);
    if (n === 3) {
      equal(m.slice(0xc8e8, 0xc8f0), new Uint8Array(8), 'key glyph');
      assert.equal(m[slot === 2 ? before[0xc318] + before[0xc319] * 256 : 0xc466], slot === 2 ? 28 : 31);
    }
    if (n === 8) assert.equal(m[0xc351], before[0xc3f8 + ((before[0xc351] + 1) & 3)]);
    if (n === 17) { assert.equal(m[0xc5bb], before[0xc5dc]); assert.equal(m[0xc5dc], before[0xc5bb]); }
    if (n === 18) { assert.equal(m[0xc370], 6); assert.equal(io[0x1c] & 1, 0); }
    if (n === 19) {
      assert.equal(m[0xc36f], slot < 3 ? 3 : before[0xc36f]);
      assert.equal(m[0xc38f], Math.max(0, before[0xc38f] - 1));
      assert.equal(m[0xcae0 + before[0xc38f]], 0); // glyph changes on early calls too
    }
    if (n === 21) assert.equal(m[0xc370 + (slot & 3)], 2 + (slot & 3));
    if (n === 23) {
      assert.equal(m[0xc052], 0); assert.equal(m[0xc059], 0);
      assert.equal(m[0xcae0 + (slot >> 1)], slot & 1 ? 0x22 : 0x55);
    }
    if (n === 26) for (let i = 0; i < 6; i++) {
      assert.equal(m[0xc370 + i], slot % 4 === 1 && i === ((slot - 1) >> 2) ? 1 : before[0xc370 + i]);
    }
    if (n === 27) equal(io.slice(0x27, 0x2b), before.slice(0xc310, 0xc314), 'four restored colors');
    if (n === 28) assert.equal(m[0xc3f7], slot === 2 ? (before[0xc3f7] + 1) % 40 : before[0xc3f7]);
    if (n === 29) { assert.equal(m[0xc5f0], 30); assert.equal(m[0xc690], 30); equal(m.slice(0xcb28, 0xcb30), Array(8).fill(0x3c), 'glyph'); }
    if (n === 31) for (let i = 0; i < 6; i++) assert.equal(m[0xc03d + i], slot < 2 && i === slot ? 1 : before[0xc03d + i]);
    if (n === 38) {
      equal(m.slice(0xcae0, 0xcae8), before.slice(0xc3a0, 0xc3a8), 'first glyph');
      equal(m.slice(0xcb28, 0xcb30), before.slice(0xc3b0, 0xc3b8), 'second glyph');
      m.fill(0xab, 0xcae0, 0xcae8); m.fill(0xcd, 0xcb28, 0xcb30); m[0xc070] = 9;
      callback(s, slot); assert.equal(m[0xc070], 0);
      equal(m.slice(0xcae0, 0xcae8), Array(8).fill(0xab), 'second call keeps first glyph');
      equal(m.slice(0xcb28, 0xcb30), Array(8).fill(0xcd), 'second call keeps second glyph');
    }
    if (n === 39) equal(m.slice(0xc737, 0xc743), slot < 14 ? before.slice(0xc737, 0xc743) :
      before.slice(slot === 14 ? 0xc3a8 : 0xc3e0, slot === 14 ? 0xc3b4 : 0xc3ec), 'replacement strip');
  }
}
// All random-byte choices select one crushing column; completed columns stop.
for (let random = 0; random < 256; random++) for (const stopped of [false, true]) {
  const s = create(4), {m} = s;
  m[0xc031] = random;
  const selected = random < 0xcc ? random & 3 : 4;
  if (stopped) m[0xc306 + selected] = 205;
  const ys = m.slice(0xc306, 0xc30b);
  callback(s, 0);
  for (let i = 0; i < 5; i++) assert.equal(m[0xc306 + i], ys[i] + (i === selected && !stopped ? 8 : 0));
}
// Room 6: HUD charge digit overrides parity; only disabled slots are reactivated.
for (const charges of [48, 49, 57]) for (let slot = 0; slot < 16; slot++) for (const enabled of [0, 63]) {
  const s = create(6), {m, io} = s, before = Uint8Array.from(m);
  m[0xc7ab] = charges; io[0x15] = 128 | enabled;
  callback(s, slot);
  const source = charges < 49 ? 0xc3c4 : slot & 1 ? 0xc3e8 : 0xc3d6;
  equal(m.slice(0xc40b, 0xc41d), before.slice(source, source + 18), 'room6 strip');
  for (let i = 0; i < 6; i++) assert.equal(m[0xc370 + i], enabled ? before[0xc370 + i] : before[0xc3fa + i]);
}
// Ladder Land gates: remaining passes, odd counter, player state, treasure index.
for (const remaining of [0, 1, 20]) for (const counter of [0, 1, 254, 255]) {
  for (const special of [0, 1]) for (let slot = 0; slot < 16; slot++) {
    const s = create(30), {m} = s;
    m[0xc3fe] = remaining; m[0xc3ff] = counter; m[0xc066] = special;
    const before = Uint8Array.from(m), erase = remaining > 0 && !(counter & 1) && !special && slot === 1;
    callback(s, slot);
    assert.equal(m[0xc3fe], remaining - +erase);
    assert.equal(m[0xc36f], ((counter + 1) & 255) & 31);
    assert.equal(m[0xc0a3], before[0xc0a3], 'saved color does not change active exemption');
    for (let i = 0; i < 3; i++) {
      const a = before[0xc3f0 + i] + before[0xc3f3 + i] * 256;
      assert.equal(m[0xc3f0 + i] + m[0xc3f3 + i] * 256, a + (erase ? 40 : 0));
      if (erase) equal(m.slice(a, a + 3), [32, 32, 32], 'erased three-cell strip');
    }
    if (remaining && !(counter & 1) && special) { assert.equal(m[0xc04e], 255); assert.equal(m[0xc055], 0); }
  }
}
// Madhouse: enumerate every possible glyph and the exact addresses scanned.
let madhouseCells;
for (let glyph = 0; glyph < 256; glyph++) {
  const s = create(33), {m, cpu} = s;
  m.fill(glyph, 0xc400, 0xc748);
  const visits = new Set();
  cpu.call(0xc376, {d: 0}, {maxSteps: 100000, hooks: {0xc382: c => { visits.add(m[0xfb] + 256 * m[0xfc] + c.y); }}});
  cases++;
  assert.equal(visits.size, 839); assert(!visits.has(0xc700));
  const expected = glyph >= 0x6e && glyph <= 0x71 ? (glyph === 0x6e ? 0x71 : glyph - 1) : glyph;
  for (let a = 0xc400; a < 0xc748; a++) assert.equal(m[a], a === 0xc700 ? glyph : expected, 'Madhouse glyph ' + glyph + ' at ' + a.toString(16));
  madhouseCells = visits.size;
}
// Simon's exhaustive acceptance matrix is in audit_mechanics.js (4,096 cases).
// Additional state alternatives for Wizard's Pet, Friend or Foe?, and Portal.
for (const type of [0, 14, 20]) {
  const s = create(8); s.m[0xc370] = type; callback(s, 0);
  assert.equal(s.m[0xc370], type || 14);
}
const key = create(28), column = key.m[0xc3f7];
for (let i = 1; i <= 40; i++) { callback(key, 2); assert.equal(key.m[0xc3f7], (column + i) % 40); }
for (let spell = 0; spell < 12; spell++) for (let slot = 0; slot < 16; slot++) for (const carry of [0, 1]) {
  const s = create(21); s.m[0xc31c] = spell;
  s.cpu.call(0x8d4b, {x: slot, c: carry, d: 0}); assert.equal(s.cpu.c, 0);
  callback(s, slot, s.cpu.c); assert.equal(s.m[0xc370 + (slot & 3)], 2 + (slot & 3));
}
console.log(JSON.stringify({activeCallbacks: active.length, playerCalls, thiefCalls, callbackCases: cases,
  madhouseCells, madhouseSkipped: '$C700', passed: true}, null, 2));

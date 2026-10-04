/* Published controller states plus protection/contact rules. The full death
 * animation is a separate VICE capture; only its two controller states are checked.
 * Usage: node .../validation/audit_movement.js [private-directory] [ROM-directory]
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const {GAME, equal} = require('./engine_harness');
const {setup, frame, step, script} = require('./player_harness');
const data = vm.runInNewContext(fs.readFileSync(path.join(GAME, 'reference/movement-data.js'), 'utf8') + ';WZ_PLAYER_DATA');
const configs = [];
for (let gap = 0; gap <= 5; gap++) {
  configs.push(['walk-' + gap, {gap}, Array(24).fill('right')]);
  configs.push(['jump-' + gap, {gap}, ['jumpRight', ...Array(23).fill('neutral')]]);
  configs.push(['vertical-' + gap, {gap}, ['jumpUp', ...Array(23).fill('neutral')]]);
}
const catchInputs = ['jumpRight', ...Array(15).fill('neutral'), ...Array(16).fill('up')];
configs.push(['rope', {gap: 4, rope: 15}, catchInputs], ['ladder', {gap: 4, ladder: 15}, catchInputs],
  ['fall', {y: 101}, ['neutral']], ['feather', {y: 101}, Array(20).fill('neutral'), 0x3106],
  ['levitate', {y: 133}, Array(20).fill('neutral'), 0x3117], ['teleport', {}, ['neutral'], 0x30ee],
  ['elevator', {y: 120, gap: 12}, Array(24).fill('neutral')]);
equal(data.scenes.map(s => s.id), configs.map(c => c[0]), 'scene inventory');
let states = 0;
function compare(s, published, label) {
  const actual = frame(s);
  equal(actual.v, published.v, label);
  assert.equal(actual.pixels, data.sprites[published.p], label + ' sprite');
  assert.equal(actual.color, published.color, label + ' color');
  assert.equal(actual.multi, published.multi, label + ' multicolor'); states++;
}
for (const [id, config, inputs, spell] of configs) {
  const s = setup(config), {m, io, cpu} = s, scene = data.scenes.find(s => s.id === id);
  if (id === 'levitate') m.fill(92, 0xc400 + 9 * 40, 0xc400 + 10 * 40);
  if (id === 'teleport') { m[0xc31e] = 200; m[0xc31f] = 133; m[0xc352] = 0; }
  if (spell) script(s, spell);
  if (id === 'elevator') {
    m.fill(32, 0xc400, 0xc400 + 21 * 40); m[0xc370] = 7;
    io[0] = 120; io[1] = 133; io[0x15] = 129; io[0x27] = 8;
    script(s, 0x3091); m[0x28ab] = 0; io[0x2e] = 4; io[0x1c] = 255;
  }
  equal(scene.map, m.slice(0xc400, 0xc770), id + ' terrain');
  equal(scene.colors, io.slice(0x800, 0xb70), id + ' colors');
  if (id !== 'fall') equal(scene.inputs, inputs, id + ' inputs');
  compare(s, scene.frames[0], id + ':0');
  let count = 1;
  for (const input of inputs) {
    if (id === 'elevator') {
      io[1]--; io[0x19] = 0x84; io[0x1e] = 129;
      cpu.irq(0x7cbf, {kernal: true}); assert.equal(m[0xc02b], 2);
    }
    step(s, input); compare(s, scene.frames[count], id + ':' + count); count++;
    if (id === 'elevator') equal(scene.elevator[count - 1], [120, io[1]], 'elevator position');
    if (m[0xc02a]) break;
  }
  if (id === 'fall') assert.equal(scene.frames.length, 266);
  else assert.equal(count, scene.frames.length, id + ' complete trace');
}
let protectionCases = 0, contactCases = 0;
for (const count of [0, 1, 8, 9, 16, 17, 32]) for (const fatal of [0, 1]) {
  for (const color of [0, 2, 4]) for (const effect of [0, 4]) {
    const s = setup(); script(s, 0x3091);
    s.m[0x28ab] = count; s.m[0xc02a] = fatal; s.m[0xc035] = effect; s.io[0x2e] = color;
    const at = script(s, 0x2b45, [0x2b67, 0x2b5e, 0x2b90]);
    const protectedHit = fatal && !effect && color !== 2 && count > 0;
    assert.equal(s.m[0x28ab], count - (protectedHit ? 1 : 0));
    assert.equal(at === 0x2b90, !!(fatal && !effect && !protectedHit)); protectionCases++;
  }
}
for (let slot = 0; slot < 6; slot++) for (let dy = -2; dy <= 5; dy++) {
  const s = setup({y: 120}); script(s, 0x3091);
  s.m[0xc370 + slot] = 7; s.m[0xc0a3] = 3; s.io[0x27 + slot] = 8;
  s.io[slot * 2 + 1] = 133 - dy; s.io[0x19] = 0x84; s.io[0x1e] = 128 | (1 << slot);
  s.cpu.irq(0x7cbf, {kernal: true});
  assert.equal(s.m[0xc02b] === 2, dy >= 0 && dy <= 2);
  if (s.m[0xc02b]) assert.equal(s.m[0xc033], slot); contactCases++;
}
const s = setup(); script(s, 0x3091);
assert.equal(data.invisibility.length, 33);
for (let i = 0; i < 33; i++) {
  const expected = data.invisibility[i];
  assert.equal(s.m[0x28ab], expected.remaining); assert.equal(s.io[0x2e] & 15, expected.color);
  assert.equal(!!(s.io[0x1c] & 128), expected.multi);
  for (let j = 0; j < 3; j++) { s.m[0xc02a] = 0; script(s, 0x2b45, [0x2b5e]); assert.equal(s.m[0x28ab], 32 - i); }
  if (i < 32) { s.m[0xc02a] = 1; script(s, 0x2b45); }
}
s.m[0xc02a] = 1; assert.equal(script(s, 0x2b45, [0x2b90]), 0x2b90);
console.log(JSON.stringify({scenes: 25, controllerStates: states, protectionCases, contactCases,
  safePasses: 99, protectedReports: 32, exhaustionDeath: true, deathAnimationNotReplayed: 264, passed: true}, null, 2));

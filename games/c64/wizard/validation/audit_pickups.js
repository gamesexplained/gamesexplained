/* All published pickup deltas against original routines and private disk inputs.
 * Usage: node .../validation/audit_pickups.js [private-directory]
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const {GAME, create, collect, state, publicJSON, equal} = require('./engine_harness');
const html = fs.readFileSync(path.join(GAME, 'levels.html'), 'utf8');
const maps = publicJSON('levels.html', 'MAPS'), previews = publicJSON('levels.html', 'TREASURE_PREVIEWS');
const pageFont = Buffer.from(html.match(/const FONT="([^"]+)"/)[1], 'base64');
const body = html.slice(html.indexOf('function applyPickupChanges('), html.indexOf('function pickupContext('));
assert(body.startsWith('function applyPickupChanges('));
const apply = vm.runInNewContext('(' + body.trim() + ')', {font: pageFont, BEHAVIOR_NAMES: [], Uint8Array});
let pickups = 0, states = 0;
assert.equal(previews.length, 40); assert.equal(maps.length, 40);
function compare(got, want, label) {
  equal(got.map, want.screen, label + ' screen');
  equal(got.colors, want.colors, label + ' colors');
  equal(got.font, want.font, label + ' font');
  equal(got.actors.map(a => a.type), want.actors, label + ' actor types');
  equal(got.actors.map(a => a.color & 15), want.actorColors, label + ' actor colors');
  equal(got.actors.flatMap(a => [a.x, a.y]), want.positions.flat(), label + ' actor positions');
}
for (let n = 0; n < 40; n++) {
  const initial = create(n), base = apply(maps[n], previews[n].base);
  assert.equal(previews[n].n, n);
  compare(base, state(initial), 'room ' + n + ' baseline');
  const selectable = initial.slots.filter(({slot, offset}) => {
    const glyph = initial.m[0xc400 + offset];
    return glyph >= 28 && glyph <= 31 && !(n === 7 && slot === 0);
  });
  equal(previews[n].items.map(i => i.slot), selectable.map(i => i.slot), 'complete pickup inventory ' + n);
  for (const item of previews[n].items) {
    const s = create(n), offset = selectable.find(i => i.slot === item.slot).offset;
    assert.equal(item.offset, offset); assert.equal(item.kind, s.m[0xc400 + offset]);
    assert(item.steps.length > 0 && item.steps.length <= 40);
    pickups++;
    for (const step of item.steps) {
      collect(s, offset);
      const want = state(s), got = apply(base, step), label = 'room ' + n + ' slot ' + item.slot;
      compare(got, want, label);
      assert.equal(step.dead, want.dead, label + ' death');
      assert.equal(step.expansion, want.expansion, label + ' expansion');
      const header = state(initial).header.slice();
      for (const [i, v] of step.header) header[i] = v;
      equal(header, want.header, label + ' header');
      states++;
    }
  }
}
assert.equal(pickups, 606); assert.equal(states, 700);
console.log(JSON.stringify({rooms: 40, pickups, states, passed: true}, null, 2));

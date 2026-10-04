/* Private transport for audit_live_rooms.py. Writes only inside the private input
 * directory; contains game memory and must never be committed or published.
 */
'use strict';
const fs = require('fs'), path = require('path');
const {WORK, create, collect, state} = require('./engine_harness');
const cases = [];
function before(s) {
  return {ram: Array.from(s.m.slice(0xc000, 0xd000)), vic: Array.from(s.io.slice(0, 0x2f)),
    colors: Array.from(s.io.slice(0x800, 0xc00))};
}
for (const [n, slot, repeats] of [[17, 7, 1], [28, 2, 4], [30, 1, 9], [3, 3, 1], [35, 0, 1]]) {
  const s = create(n), offset = s.slots.find(s => s.slot === slot).offset, initial = before(s);
  for (let i = 0; i < repeats; i++) collect(s, offset);
  cases.push({kind: 'pickup', n, slot, repeats, offset, before: initial, after: state(s)});
}
const s = create(33);
s.m.fill(0x6e, 0xc400, 0xc748);
const initial = before(s);
s.cpu.call(0xc376, {x: 0, c: 0, d: 0});
cases.push({kind: 'callback', n: 33, before: initial, after: state(s)});
for (const [index, remaining] of [[0, 1], [3, 1], [0, 0]]) {
  const s = create(19);
  s.m[0xc38f] = remaining; s.m[0xc36f] = s.m[0xc0a3] = 9;
  s.m[0xcae1] = 0xab;
  const initial = before(s);
  s.cpu.call(0xc376, {x: index, c: 0, d: 0});
  cases.push({kind: 'callback', n: 19, index, before: initial, after: state(s)});
}
fs.writeFileSync(path.join(WORK, 'audit-live-room-fixtures.json'), JSON.stringify(cases));
console.log(JSON.stringify({privateFixtures: cases.length}));

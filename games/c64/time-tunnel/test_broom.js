#!/usr/bin/env node
// Hold the flying broom on the How it works page (index.html's tt-broom block) to the video chip.
// ttBroom runs the game's own salem_broom and sprite_update on the kit's 6502 once a pass, and the
// page paints the sprites over the room itself, 50 times a second, where C64.renderFrame would take
// most of each fiftieth. Over 1,300 passes, with the stick left alone, pushed each way and pushed
// two ways at once, every 20th pass the page's painting over the room (drawn with the sprites off)
// must match renderFrame's picture with them on, pixel for pixel. The broom must also reach both
// ends of the street, x $0A and $9F (salem_broom's limits in this room, $31B4 and $31DB), and both
// a hop and a dip. It exits 1 on any difference.
//   node games/c64/time-tunnel/test_broom.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.ttRoom = g.run('levels.html', 'tt-rooms', 'ttRoom').ttRoom;
const { ttBroom } = g.run('index.html', 'tt-broom', 'ttBroom');
g.lib('cpu6502'); g.lib('c64');
const L = g.listing(), B = ttBroom(L.ram, globalThis.C64Cpu), m = B.F.mem;
let bad = 0, frames = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const PLAN = [[0, 100], [1, 100], [2, 150], [8, 320], [4, 320], [9, 100], [6, 100], [0, 110]];
const seen = { x: new Set(), hop: false, dip: false };
let n = 0;
for (const [stick, count] of PLAN) for (let i = 0; i < count; i++, n++) {
  B.pass(stick);
  seen.x.add(m[0x33 + m[0x0840 + 0x2C]]);
  if (m[0xB9] < 0x61) seen.hop = true;
  if (m[0xB9] > 0x61) seen.dip = true;
  if (n % 20) continue;
  const off = B.F.vic.slice(); off[0x15] = 0;
  const painted = B.sprites(C64.renderFrame(Object.assign({}, B.F, { vic: off })).px.slice());
  const chip = C64.renderFrame(B.F).px;
  let diff = 0;
  for (let k = 0; k < chip.length; k++) if (chip[k] !== painted[k]) diff++;
  if (diff) fail('pass', n, 'stick', stick, diff, 'pixels');
  frames++;
}
if (!seen.x.has(0x0A) || !seen.x.has(0x9F)) fail('the broom did not reach both ends: x from', Math.min(...seen.x), 'to', Math.max(...seen.x));
if (!seen.hop || !seen.dip) fail('the broom did not both hop and dip');
console.log(`${n} passes, ${frames} pictures: ` + (bad ? bad + ' differences' : 'every pixel matches renderFrame, and the broom went end to end, up and down'));
process.exit(bad ? 1 : 0);

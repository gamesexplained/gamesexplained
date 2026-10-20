#!/usr/bin/env node
// The Discoveries tab's tank slip, tank.js in discoveries.html, against the game's own code on the
// listing's bytes in the kit's 6502, for every helicopter X at which spawn_tank makes a tank
// ($02D0, the left end of its range, to $0FFF, two blocks short of the fence's $1174):
//   right   $6434-$6447, the right-hand placing: the tank's X it stores at obj_x and obj_x_hi
//   left    $641D-$6430, the left-hand placing, the same
//   kept    $6653-$667A, the tank's distance test for each: dropped when it reaches $667A
//   node games/apple2/choplifter/test_tank.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = C64Cpu;
const { ChopTank } = g.run('discoveries.html', 'tank.js', 'ChopTank');
const L = g.listing();
const SLOT = 10, OBJ_X = 0x7169, OBJ_X_HI = 0x716A, HELI_X = 0x04, HELI_X_HI = 0x05;
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
const hex = v => '$' + v.toString(16).toUpperCase().padStart(4, '0');

function place(h, from, to) {               // the placing code from `from` until `to`: the tank's X
  const m = L.ram.slice();
  m[HELI_X] = h & 0xFF; m[HELI_X_HI] = h >> 8;
  const cpu = new CPU(m);
  cpu.pc = from; cpu.x = SLOT;
  cpu.run({ until: to, maxSteps: 100 });
  return m[OBJ_X + SLOT] | m[OBJ_X_HI + SLOT] << 8;
}
function kept(h, t) {                       // the tank's distance test: true unless it is dropped
  const m = L.ram.slice();
  m[HELI_X] = h & 0xFF; m[HELI_X_HI] = h >> 8;
  m[OBJ_X + SLOT] = t & 0xFF; m[OBJ_X_HI + SLOT] = t >> 8;
  const cpu = new CPU(m);
  cpu.pc = 0x6653; cpu.x = SLOT;
  let out = null;
  const at = v => () => { out = v; return true; };
  cpu.run({ maxSteps: 100, hooks: { 0x667A: at(false), 0x6681: at(true), 0x668A: at(true), 0x6691: at(true) } });
  return out;
}
for (let h = 0x02D0; h <= 0x0FFF; h++) {
  cases++;
  const r = place(h, 0x6434, 0x6448), l = place(h, 0x641D, 0x6431);
  if (r !== ChopTank.right(h)) fail(`helicopter at ${hex(h)}: the game puts the right-hand tank at ${hex(r)}, the page at ${hex(ChopTank.right(h))}`);
  if (l !== ChopTank.left(h)) fail(`helicopter at ${hex(h)}: the game puts the left-hand tank at ${hex(l)}, the page at ${hex(ChopTank.left(h))}`);
  for (const t of [r, l]) {
    const k = kept(h, t);
    if (k !== ChopTank.kept(h, t)) fail(`helicopter at ${hex(h)}, tank at ${hex(t)}: the game ${k ? 'keeps' : 'drops'} it, the page says ${ChopTank.kept(h, t) ? 'kept' : 'dropped'}`);
  }
}
if (bad) { console.log(`${bad} failed of ${cases}`); process.exit(1); }
const survive = [];
for (let h = 0x02D0; h <= 0x0FFF; h++) if (ChopTank.kept(h, ChopTank.right(h))) survive.push(h);
console.log(`test_tank: ${cases} helicopter positions agree with the game; a right-hand tank survives at ${hex(survive[0])}-${hex(survive[survive.length - 1])} (${survive.length})`);

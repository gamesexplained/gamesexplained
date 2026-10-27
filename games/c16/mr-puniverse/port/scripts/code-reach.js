'use strict';
// Which of the game's instructions the lockstep's player reaches (test/lockstep.js, player): the
// game alone on the kit's C16, played by the script for the frames given from each seed, and the
// code instructions of the listing it never ran, by routine. What the script never reaches the
// lockstep never checks.
//   node code-reach.js frames seed...
const path = require('path');
const lib = require('../test/lib.js');
const { player, machine } = require('../test/lockstep.js');
const [frames, ...seeds] = process.argv.slice(2).map(Number);
const ran = new Uint8Array(65536);
for (const seed of seeds.length ? seeds : [1]) {
  const m = machine(lib.boot());
  const pl = player(seed);
  Object.assign(m.hooks, pl.hooks(m));
  let n = 0;
  m.onPass = mm => { pl.onPass(n++, mm, null); };
  m.cpu.executed = ran;
  m.runFrames(frames || 20000);
  console.log('seed ' + seed + ': ' + m.passes + ' passes, ' + (pl.S.game + 1) + ' games, rooms ' + [...pl.S.rooms].sort((a, b) => a - b).join(' '));
}
let routine = '', missed = [], total = 0, hit = 0;
const out = [];
const flush = () => { if (missed.length) out.push(routine + ': ' + missed.join(' ')); missed = []; };
for (const r of lib.LISTING.records) {
  if (r.t !== 'code') continue;
  if (r.l && !/^[bjr]_/.test(r.l)) { flush(); routine = r.l; }
  total++;
  if (ran[r.a]) hit++; else missed.push(r.a.toString(16).toUpperCase());
}
flush();
console.log(hit + ' of ' + total + ' instructions run');
console.log(out.join('\n'));

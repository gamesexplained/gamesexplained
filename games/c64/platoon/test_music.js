'use strict';
// Holds music.html's port of the music driver against the driver itself: each of the nine tunes,
// started as the game starts it, for 3,000 frames, every SID write compared in order.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/c64/cpu6502.js'));
const g = game(__dirname);
const { createDriver, PLATOON_TUNES, PLATOON_ENTRY } = g.run('music.html', 'createDriver', 'createDriver', 'PLATOON_TUNES', 'PLATOON_ENTRY');
const loads = ['load1', 'load3', 'load4'].map(p => g.listing('parts/' + p + '/listing.json').ram);
const FRAMES = 3000;
let bad = 0;
PLATOON_TUNES.forEach(([name, [k, y]], n) => {
  const d = createDriver({ loads: loads.map(m => m.slice()), entry: PLATOON_ENTRY, tunes: PLATOON_TUNES.map(t => t[1]) });
  const m = loads[k].slice();
  let w = [];
  const cpu = new CPU(m, { port: 0x35, io: { read: a => { throw new Error('read ' + a.toString(16)); }, write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) w.push(a - 0xD400, v); else throw new Error('write ' + a.toString(16)); } } });
  d.init(n);
  cpu.call(0xE0DE, {}); cpu.call(PLATOON_ENTRY[k][0], { y });
  for (let f = 0; f < FRAMES; f++) {
    w = []; d.play(); cpu.call(PLATOON_ENTRY[k][1], {});
    const a = d.writes.join(','), b = w.join(',');
    if (a !== b) { console.log(`${name}: frame ${f} differs\n port ${a}\n game ${b}`); bad++; return; }
  }
  console.log(`${name}: ${FRAMES} frames agree`);
});
process.exit(bad ? 1 : 0);

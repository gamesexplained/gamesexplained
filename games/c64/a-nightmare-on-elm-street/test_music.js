'use strict';
// Holds music.html's player, the game's own sound routine (start_effect $48DB, effect_tick $4993
// in the street part) on the kit's 6502 over the street and resident listings: the title tune
// runs for about 3,061 interrupts and then stops, effects 7 and 16 to 19 loop, every other effect
// ends, and effects 4 and 30, and 6 and 31, write the same notes to the SID.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createDriver } = g.run('music.html', 'createDriver', 'createDriver');
const S = g.listing('parts/street/listing.json'), R = g.listing('parts/resident/listing.json');
const ram = S.ram.slice(); for (let a = 0; a < 0x10000; a++) if (R.has[a] && !S.has[a]) ram[a] = R.ram[a];
let bad = 0;
const check = (ok, msg) => { if (!ok) { console.log('FAIL ' + msg); bad++; } };
function run(n, limit) {
  const d = createDriver({ ram }, kit), all = [];
  d.init(n); all.push(d.writes.join(','));
  let f = 0; while (d.playing() && f < limit) { d.play(); all.push(d.writes.join(',')); f++; }
  return { frames: f, playing: d.playing(), writes: all };
}
const tune = run(0, 5000);
check(!tune.playing && tune.frames > 3000 && tune.frames < 3120, `the title tune ends after ${tune.frames} interrupts, about 3,061 expected`);
console.log(`title tune: ${tune.frames} interrupts`);
const LOOPS = new Set([7, 16, 17, 18, 19]);
for (let e = 0; e < 36; e++) {
  const r = run(e + 1, 2000);
  check(r.playing === LOOPS.has(e), `effect ${e} ${r.playing ? 'loops' : 'ends after ' + r.frames}`);
}
for (const [a, b] of [[4, 30], [6, 31]]) {
  const x = run(a + 1, 2000).writes.join(';'), y = run(b + 1, 2000).writes.join(';');
  check(x === y, `effects ${a} and ${b} differ`);
}
console.log(bad ? `${bad} failure(s)` : 'ok - the tune and 36 effects play as music.html says');
process.exit(bad ? 1 : 0);

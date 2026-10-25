#!/usr/bin/env node
// The music player's driver (a2-sound, index.html) against the game's own music driver ($E03F) on
// the listing's bytes in the kit's 6502: the title tune from the restart the game asks for ($40 in
// $E574, as $1F8E writes it), every write to the SID in 16,000 calls, one call a frame as the
// title's interrupt makes them, which is past the tune's first repeat (15,680 calls). The game's
// side runs on the whole listing; the page's on the bytes it embeds.
//   node games/c64/ace-2/test_sound.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('sid', 'cpu6502');
const { CPU } = C64Cpu;
const { createDriver, A2_TUNES } = g.run('index.html', 'a2-sound', 'createDriver', 'A2_TUNES');
const L = g.listing();
const CALLS = 16000;
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };

const m = L.ram.slice(), w = [];
const io = {
  read(a) { throw new Error('the driver read $' + a.toString(16)); },
  write(a, v) { if (a >= 0xD400 && a <= 0xD418) w.push(a - 0xD400, v); else throw new Error('the driver wrote $' + a.toString(16)); },
};
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
m[0xE574] = 0x40;
const drv = createDriver({ mem: [[0xE000, L.ram.slice(0xE000, 0xED00)]] }, C64Cpu);
drv.init(0);
let writes = 0;
for (let f = 0; f < CALLS; f++) {
  w.length = 0;
  cpu.call(0xE03F, Z, { maxSteps: 200000 });
  drv.play();
  writes += w.length / 2;
  if (w.join() !== drv.writes.join()) { fail(`call ${f}: the game writes ${w.join()}, the page ${drv.writes.join()}`); break; }
  if (!drv.playing()) { fail(`call ${f}: the page says the tune ended`); break; }
}
drv.stop();
if (drv.playing()) fail('stop() left the tune playing');
if (A2_TUNES.length !== 1) fail('the page names ' + A2_TUNES.length + ' tunes; the driver has one');
if (bad) { console.log(`test_sound: ${bad} failed`); process.exit(1); }
console.log(`test_sound: ${CALLS} calls, ${writes} SID writes, every one the game's`);

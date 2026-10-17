#!/usr/bin/env node
// Hold the page's music player (the rd-music block of index.html: the game's own player at
// $5042-$5730 run on the page's small 6502 core) against the same bytes run in the kit's
// simulator, kit/c64/cpu6502.js, over the committed listing. For each of the seven tunes: start it
// as play_tune does ($567D with A = the tune), then call tune_play ($5042) once a frame until the
// tune ends and 50 frames after; every SID write of every call must be the same, in the same
// order, and the two must agree on when the tune has ended. The page's core gets only the bytes
// it embeds, $4FCC-$5F8D, built from the listing as the page builds them, so the test also shows
// the player needs nothing else. Needs no snapshot and no emulator. Exits 1 on any difference.
//   node games/c64/rick-dangerous/test_music.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname);
const { createDriver } = g.run('index.html', 'rd-music', 'createDriver');
const ram = g.listing().ram;
const hex = Array.from(ram.slice(0x4FCC, 0x5F8E), (b) => b.toString(16).padStart(2, '0')).join('');
let bad = 0, frames = 0, nwrites = 0;
const fail = (...w) => { if (bad++ < 8) console.log('DIFFERS', ...w); };
for (let t = 0; t < 7; t++) {
  let w = [], bus = 0;
  const io = {
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) { w.push(a - 0xD400, v); bus = v; } else throw new Error('write $' + a.toString(16)); },
    read(a) { if (a >= 0xD400 && a <= 0xD41F) return bus; throw new Error('read $' + a.toString(16)); },
  };
  const cpu = new CPU(Uint8Array.from(ram), { port: { dir: 0x2F, data: 0x35 }, io });
  const drv = createDriver({ base: 0x4FCC, hex });
  cpu.call(0x567D, { a: t }); drv.init(t);
  if (w.join() !== drv.writes.join()) fail('tune', t, 'start');
  let f = 0, after = 0;
  for (; f < 5000 && after < 50; f++) {
    w = [];
    if (cpu.m[0x4FCC]) cpu.call(0x5042, {});
    drv.play();
    nwrites += w.length / 2;
    if (w.join() !== drv.writes.join()) fail('tune', t, 'frame', f, 'game', w.join(), 'page', drv.writes.join());
    if (!!cpu.m[0x4FCC] !== drv.playing()) fail('tune', t, 'frame', f, 'playing');
    if (!cpu.m[0x4FCC]) after++;
  }
  if (f === 5000) fail('tune', t, 'did not end in 5000 frames');
  frames += f;
}
console.log(`7 tunes, ${frames} frames, ${nwrites} SID writes: ${bad ? bad + ' differences' : 'every write matches'}`);
process.exit(bad ? 1 : 0);

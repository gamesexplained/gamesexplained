#!/usr/bin/env node
// The two players' driver (am-sound, index.html) against the game's own sound code on the
// listing's bytes in the kit's 6502: for each of the 24 buttons (four tunes, 17 effects and the
// alarm at three periods), the same entry with the same A, then sound_irq ($413A) once a frame for
// 3,000 frames, every write to the SID compared, frame by frame, and where each sound ends. The
// driver is made from its source text alone, as the player's AudioWorklet makes it.
//   node games/c64/the-armageddon-man/test_sound.js
'use strict';
const path = require('path');
const vm = require('vm');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('sid', 'cpu6502');
const CPU6502 = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const { createDriver: pageDriver, AM_TUNES, AM_EFFECTS } = g.run('index.html', 'am-sound', 'createDriver', 'AM_TUNES', 'AM_EFFECTS');
const createDriver = vm.runInNewContext('(' + pageDriver + ')', {});
const L = g.listing();
const FRAMES = 3000;
let bad = 0, frames = 0, buttons = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
const Z = { x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
const bytes = L.ram.slice(0x4000, 0x4DEC);

for (const sounds of [AM_TUNES, AM_EFFECTS]) {
  sounds.forEach((s, t) => {
    buttons++;
    const m = L.ram.slice(), w = [];
    const io = {
      read(a) { throw new Error('the sound code read $' + a.toString(16)); },
      write(a, v) { if (a >= 0xD400 && a <= 0xD418) w.push(a - 0xD400, v); else throw new Error('the sound code wrote $' + a.toString(16)); },
    };
    const cpu = new CPU6502.CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
    const drv = createDriver({ bytes, sounds }, CPU6502);
    cpu.call(s.at, Object.assign({ a: s.a }, Z));
    drv.init(t);
    if (w.join() !== drv.writes.join()) fail(`${s.name}: the start writes ${w.join()}, the page ${drv.writes.join()}`);
    let ended = -1;
    for (let f = 0; f < FRAMES; f++) {
      w.length = 0;
      cpu.call(0x413A, Object.assign({ a: 0 }, Z));
      drv.play();
      frames++;
      if (w.join() !== drv.writes.join()) { fail(`${s.name} frame ${f}: the game writes ${w.join()}, the page ${drv.writes.join()}`); break; }
      if ((m[s.on] !== 0) !== drv.playing()) { fail(`${s.name} frame ${f}: playing() differs from ${s.on.toString(16)}`); break; }
      if (ended < 0 && !m[s.on]) ended = f;
    }
    if (s.at === 0x4A8E && ended < 0) fail(`${s.name}: still playing after ${FRAMES} frames`);
  });
}
if (bad) { console.log(`test_sound: ${bad} failed`); process.exit(1); }
console.log(`test_sound: ${buttons} buttons, ${frames} frames, every SID write the game's`);
